import { useEffect, useState, type FormEvent } from 'react'
import { House, Plus, Settings, X } from 'lucide-react'

import type { Review } from '../application/generation/get-review'
import type { PackageManifest } from '../domain/package/manifest'
import type { ToolIconName } from '../domain/package/tool-icons'
import { ChatPanel, type Message } from '@/components/chat-panel'
import { DatabaseView } from '@/components/database-view'
import { NewToolDialog } from '@/components/new-tool-dialog'
import { ReviewDialog } from '@/components/review-dialog'
import { StartPage } from '@/components/start-page'
import { SettingsDialog } from '@/components/settings-dialog'
import { ToolActions } from '@/components/tool-actions'
import { ToolIcon } from '@/components/tool-icon'
import type { SectionId } from '@/components/settings-dialog'
import { ToolView } from '@/components/tool-view'
import { Button } from '@/components/ui/button'
import { applyToolOrder, loadToolOrder, moveTool, saveToolOrder } from '@/lib/tool-order'
import { loadStartPageSettings, saveStartPageSettings, type StartPageSettings } from '@/lib/start-page-settings'
import { cn } from '@/lib/utils'

interface Thread {
  messages: Message[]
  review: Review | null
}

// Chat history for creating new tools. Each installed tool has its own thread, keyed by its id.
const NEW_TOOL_THREAD = 'new-tool'
const EMPTY_THREAD: Thread = { messages: [], review: null }

export function App() {
  const [tools, setTools] = useState<PackageManifest[]>([])
  const [activeToolId, setActiveToolId] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [threads, setThreads] = useState<Record<string, Thread>>({})
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [revision, setRevision] = useState(0)
  const [databaseOpen, setDatabaseOpen] = useState(false)
  // Tool whose database the view opens on; null shows every tool's database.
  const [databaseFor, setDatabaseFor] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsSection, setSettingsSection] = useState<SectionId>('appearance')
  const [settingsHint, setSettingsHint] = useState<string | null>(null)
  const [newToolOpen, setNewToolOpen] = useState(false)
  const [toolOrder, setToolOrder] = useState<string[]>(loadToolOrder)
  const [startPage, setStartPage] = useState<StartPageSettings>(loadStartPageSettings)
  // Whether the start page is the current view. Starts on it when the start page is switched on.
  const [homeOpen, setHomeOpen] = useState(() => loadStartPageSettings().enabled)
  const [dragId, setDragId] = useState<string | null>(null)
  const [dropId, setDropId] = useState<string | null>(null)
  // Thread whose generated change is open in the review dialog.
  const [reviewKey, setReviewKey] = useState<string | null>(null)
  // Bumped when a tool writes data, so its home card reloads.
  const [dataRevisions, setDataRevisions] = useState<Record<string, number>>({})

  useEffect(() => {
    void refreshTools()
  }, [])

  const activeTool = tools.find((tool) => tool.id === activeToolId) ?? null
  const sortedTools = applyToolOrder(tools, toolOrder)
  // In edit mode the chat talks to the selected tool only; otherwise it talks about new tools.
  const threadKey = editing && activeTool ? activeTool.id : NEW_TOOL_THREAD
  const thread = threads[threadKey] ?? EMPTY_THREAD
  const reviewing = (reviewKey && threads[reviewKey]?.review) || null

  async function refreshTools() {
    setTools(await window.workplace.packages.list())
  }

  function updateThread(key: string, change: (current: Thread) => Thread) {
    setThreads((current) => ({ ...current, [key]: change(current[key] ?? EMPTY_THREAD) }))
  }

  function addMessage(key: string, message: Message) {
    updateThread(key, (current) => ({ ...current, messages: [...current.messages, message] }))
  }

  function reorderTools(fromId: string, toId: string) {
    const next = moveTool(sortedTools.map((tool) => tool.id), fromId, toId)
    setToolOrder(next)
    saveToolOrder(next)
  }

  function moveByKeyboard(id: string, delta: number) {
    const ids = sortedTools.map((tool) => tool.id)
    const target = ids[ids.indexOf(id) + delta]
    if (target) reorderTools(id, target)
  }

  function openTool(id: string) {
    setActiveToolId(id)
    setHomeOpen(false)
    setEditing(false)
    setDatabaseOpen(false)
  }

  function openNewTool() {
    setActiveToolId(null)
    setHomeOpen(false)
    setEditing(false)
    setDatabaseOpen(false)
  }

  function dataChanged(packageId: string) {
    setDataRevisions((current) => ({ ...current, [packageId]: (current[packageId] ?? 0) + 1 }))
  }

  function openHome() {
    setActiveToolId(null)
    setEditing(false)
    setDatabaseOpen(false)
    setHomeOpen(true)
  }

  function changeStartPage(next: StartPageSettings) {
    setStartPage(next)
    saveStartPageSettings(next)
    if (!next.enabled) setHomeOpen(false)
  }

  async function generate(key: string, shown: string, spec: string, baseId?: string) {
    addMessage(key, { role: 'user', text: shown })
    setBusy(true)
    addMessage(key, { role: 'system', text: baseId ? 'Changing the tool…' : 'Generating…' })

    const started = await window.workplace.generation.start(spec, baseId)
    if (!started.ok) {
      addMessage(key, { role: 'system', text: `Could not generate the tool: ${started.error}` })
      setBusy(false)
      return
    }

    const view = await window.workplace.generation.review(started.value.id)
    updateThread(key, (current) => ({
      ...current,
      review: view,
      messages: [
        ...current.messages,
        {
          role: 'system',
          text:
            view?.request.state === 'awaiting-review'
              ? 'Generated. Review it below before installing.'
              : `Generation stopped in state "${view?.request.state ?? 'unknown'}". See the review below.`,
        },
      ],
    }))
    setReviewKey(key)
    setBusy(false)
  }

  function openSettings(section: SectionId = 'appearance', hint: string | null = null) {
    setSettingsSection(section)
    setSettingsHint(hint)
    setSettingsOpen(true)
  }

  // Creating or changing a tool needs a Claude API key. Without one, open the Claude settings instead.
  async function requireApiKey(): Promise<boolean> {
    const status = await window.workplace.keys.status()
    if (status.configured) return true
    openSettings('claude', 'Add your Claude API key to create and edit tools. It is stored encrypted on this computer.')
    return false
  }

  async function send(event: FormEvent) {
    event.preventDefault()
    const text = draft.trim()
    if (!text || busy) return
    if (!(await requireApiKey())) return
    setDraft('')
    await generate(threadKey, text, text, editing && activeTool ? activeTool.id : undefined)
  }

  async function createTool(name: string, description: string, withCard: boolean) {
    if (!(await requireApiKey())) return
    setNewToolOpen(false)
    openNewTool()
    const card = withCard
      ? '\nAlso give it a home card: add "homeCard": {"size": "small"} to manifest.json and write ui/card.js.'
      : ''
    void generate(
      NEW_TOOL_THREAD,
      `New tool "${name}": ${description}`,
      `Name the tool "${name}".\n${description}${card}`,
    )
  }

  async function approve(icon: ToolIconName) {
    const key = reviewKey
    const review = reviewing
    if (!key || !review) return
    const requestId = review.request.id
    const packageId = review.request.packageId

    // A change to an existing tool has to keep its id, so it replaces that tool and nothing else.
    if (key !== NEW_TOOL_THREAD && packageId !== key) {
      addMessage(key, { role: 'system', text: `This change must keep the id "${key}". Reject it and describe the change again.` })
      setReviewKey(null)
      return
    }

    setBusy(true)
    let result = await window.workplace.generation.approve(requestId, key !== NEW_TOOL_THREAD, icon)
    if (result.ok && result.value.status === 'id-conflict') {
      const replace = window.confirm(`A tool with the id "${packageId}" already exists. Replace it?`)
      if (!replace) {
        setBusy(false)
        return
      }
      result = await window.workplace.generation.approve(requestId, true, icon)
    }
    setBusy(false)

    if (!result.ok) {
      addMessage(key, { role: 'system', text: `Install failed: ${result.error}` })
      return
    }

    setReviewKey(null)
    if (key === NEW_TOOL_THREAD) updateThread(NEW_TOOL_THREAD, () => EMPTY_THREAD)
    else updateThread(key, (current) => ({ ...current, review: null }))
    await refreshTools()
    // The tool opens in edit mode, so the next message refines it.
    setActiveToolId(packageId)
    setEditing(true)
    setRevision((current) => current + 1)
  }

  async function reject() {
    const key = reviewKey
    const review = reviewing
    if (!key || !review) return
    setBusy(true)
    await window.workplace.generation.reject(review.request.id)
    setBusy(false)
    setReviewKey(null)
    updateThread(key, (current) => ({
      ...current,
      review: null,
      messages: [...current.messages, { role: 'system', text: 'Rejected. Nothing was installed.' }],
    }))
  }

  async function uninstall() {
    if (!activeTool) return
    if (!window.confirm(`Uninstall "${activeTool.name}"?`)) return
    const deleteData = window.confirm(
      `Also delete the saved data of "${activeTool.name}"? OK deletes it, Cancel keeps it.`,
    )

    const result = await window.workplace.packages.uninstall(activeTool.id, deleteData)
    if (!result.ok) {
      window.alert(`Uninstall failed: ${result.error}`)
      return
    }

    const { [activeTool.id]: _removed, ...rest } = threads
    setThreads(rest)
    setActiveToolId(null)
    setEditing(false)
    await refreshTools()
  }

  return (
    <div className="flex h-screen bg-background">
      <aside className="flex w-60 shrink-0 flex-col overflow-hidden border-r border-border bg-card">
        <div className="flex h-14 items-center gap-2.5 px-4 font-semibold">
          <span className="size-6 rounded-lg bg-gradient-to-br from-[#5b5bf0] to-[#e65bd6]" />
          Loft
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-3" aria-label="Tools">
          {startPage.enabled && (
            <button
              type="button"
              onClick={openHome}
              aria-current={homeOpen && !activeTool && !databaseOpen ? 'page' : undefined}
              className={cn(
                'mb-3 flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left text-sm transition-colors',
                homeOpen && !activeTool && !databaseOpen ? 'bg-accent font-semibold text-foreground shadow-sm' : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
              )}
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                <House className="size-4" />
              </span>
              Home
            </button>
          )}
          <button
            type="button"
            onClick={() => setNewToolOpen(true)}
            className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary"
          >
            <Plus className="size-4" />
            New tool
          </button>
          <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tools</p>
          {tools.length === 0 && <p className="px-2 text-sm text-muted-foreground">No tools yet.</p>}
          <ul className="space-y-1">
            {sortedTools.map((tool) => {
              const active = tool.id === activeToolId
              return (
                <li
                  key={tool.id}
                  draggable
                  onDragStart={(event) => {
                    setDragId(tool.id)
                    event.dataTransfer.effectAllowed = 'move'
                    event.dataTransfer.setData('text/plain', tool.id)
                  }}
                  onDragOver={(event) => {
                    if (!dragId) return
                    event.preventDefault()
                    setDropId(tool.id)
                  }}
                  onDragLeave={() => setDropId(null)}
                  onDrop={(event) => {
                    event.preventDefault()
                    if (dragId) reorderTools(dragId, tool.id)
                    setDragId(null)
                    setDropId(null)
                  }}
                  onDragEnd={() => {
                    setDragId(null)
                    setDropId(null)
                  }}
                  className={cn('rounded-xl', dropId === tool.id && dragId !== tool.id && 'ring-2 ring-primary/50')}
                >
                  <button
                    type="button"
                    title="Drag to reorder, or use Alt and the arrow keys"
                    aria-current={active ? 'page' : undefined}
                    onClick={() => openTool(tool.id)}
                    onKeyDown={(event) => {
                      if (!event.altKey || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) return
                      event.preventDefault()
                      moveByKeyboard(tool.id, event.key === 'ArrowUp' ? -1 : 1)
                    }}
                    className={cn(
                      'group flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left text-sm transition-colors',
                      active
                        ? 'bg-accent font-semibold text-foreground shadow-sm'
                        : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
                    )}
                  >
                    <span
                      className={cn(
                        'flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors',
                        active
                          ? 'bg-gradient-to-br from-[#5b5bf0] to-[#e65bd6] text-white shadow'
                          : 'bg-muted group-hover:text-foreground',
                      )}
                    >
                      <ToolIcon name={tool.icon} />
                    </span>
                    <span className="truncate">{tool.name}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>
        <div className="border-t p-3">
          <Button variant="ghost" className="w-full justify-start" aria-haspopup="dialog" onClick={() => openSettings()}>
            <Settings />
            Settings
          </Button>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-card">
        <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            {activeTool && !databaseOpen && (
              <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-[#5b5bf0] to-[#e65bd6] text-white">
                <ToolIcon name={activeTool.icon} />
              </span>
            )}
            <h1 className="truncate text-sm font-medium">
              {databaseOpen
                ? databaseFor
                  ? `${tools.find((tool) => tool.id === databaseFor)?.name ?? databaseFor} database`
                  : 'Database'
                : activeTool
                  ? activeTool.name
                  : homeOpen && startPage.enabled
                    ? 'Home'
                    : 'New tool'}
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {activeTool && !databaseOpen && (
              <ToolActions
                editing={editing}
                onEdit={() => setEditing((current) => !current)}
                onDelete={() => void uninstall()}
                onViewDatabase={() => {
                  setDatabaseFor(activeTool.id)
                  setDatabaseOpen(true)
                }}
              />
            )}
            {databaseOpen && (
              <Button variant="ghost" size="icon" aria-label="Close database view" title="Close database view" onClick={() => setDatabaseOpen(false)}>
                <X />
              </Button>
            )}
          </div>
        </header>

        {databaseOpen ? (
          <DatabaseView key={databaseFor ?? 'all'} packageId={databaseFor} />
        ) : activeTool ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className={cn('flex min-h-0 flex-1', editing && 'bg-gradient-to-br from-[#5b5bf0] via-[#8b5cf6] to-[#e65bd6] p-1.5')}>
              <div className="flex min-h-0 flex-1 overflow-hidden bg-background">
                <ToolView key={`${activeTool.id}:${revision}`} manifest={activeTool} onDataChanged={() => dataChanged(activeTool.id)} />
              </div>
            </div>
            {editing && (
              <ChatPanel
                className="h-[45%] min-h-64 shrink-0 border-t"
                banner={`Editing ${activeTool.name}. Messages here only change this tool.`}
                onClose={() => setEditing(false)}
                messages={thread.messages}
                review={thread.review}
                busy={busy}
                draft={draft}
                placeholder={`Describe a change to ${activeTool.name}…`}
                emptyHint="Describe a change, for example “add a search box”."
                onDraftChange={setDraft}
                onSend={(event) => void send(event)}
                onReview={() => setReviewKey(threadKey)}
              />
            )}
          </div>
        ) : homeOpen && startPage.enabled ? (
          <StartPage
            locations={startPage.locations}
            cards={sortedTools.filter((tool) => tool.homeCard)}
            dataRevisions={dataRevisions}
            onOpenTool={openTool}
            onLocationsChange={(locations) => changeStartPage({ ...startPage, locations })}
            onNewTool={() => setNewToolOpen(true)}
          />
        ) : (
          <ChatPanel
            className="min-h-0 flex-1"
            messages={thread.messages}
            review={thread.review}
            busy={busy}
            draft={draft}
            placeholder="Describe a tool…"
            emptyHint="Use New tool to describe a tool, or type a description here."
            onDraftChange={setDraft}
            onSend={(event) => void send(event)}
            onReview={() => setReviewKey(threadKey)}
          />
        )}
      </main>

      {reviewKey && reviewing && (
        <ReviewDialog
          review={reviewing}
          busy={busy}
          onApprove={(icon) => void approve(icon)}
          onReject={() => void reject()}
          onClose={() => setReviewKey(null)}
        />
      )}
      {newToolOpen && <NewToolDialog onClose={() => setNewToolOpen(false)} onCreate={createTool} />}
      {settingsOpen && (
        <SettingsDialog
          initialSection={settingsSection}
          hint={settingsHint}
          onClose={() => setSettingsOpen(false)} onOpenDatabase={() => {
            setDatabaseFor(null)
            setDatabaseOpen(true)
          }} />
      )}
    </div>
  )
}
