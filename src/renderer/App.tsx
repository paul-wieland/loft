import { useEffect, useState, type FormEvent } from 'react'
import { Plus, Settings, Wrench, X } from 'lucide-react'

import type { Review } from '../application/generation/get-review'
import type { PackageManifest } from '../domain/package/manifest'
import { ChatPanel, type Message } from '@/components/chat-panel'
import { DatabaseView } from '@/components/database-view'
import { NewToolDialog } from '@/components/new-tool-dialog'
import { SettingsDialog } from '@/components/settings-dialog'
import { ToolActions } from '@/components/tool-actions'
import { ToolView } from '@/components/tool-view'
import { Button } from '@/components/ui/button'

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
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [newToolOpen, setNewToolOpen] = useState(false)

  useEffect(() => {
    void refreshTools()
  }, [])

  const activeTool = tools.find((tool) => tool.id === activeToolId) ?? null
  // In edit mode the chat talks to the selected tool only; otherwise it talks about new tools.
  const threadKey = editing && activeTool ? activeTool.id : NEW_TOOL_THREAD
  const thread = threads[threadKey] ?? EMPTY_THREAD

  async function refreshTools() {
    setTools(await window.workplace.packages.list())
  }

  function updateThread(key: string, change: (current: Thread) => Thread) {
    setThreads((current) => ({ ...current, [key]: change(current[key] ?? EMPTY_THREAD) }))
  }

  function addMessage(key: string, message: Message) {
    updateThread(key, (current) => ({ ...current, messages: [...current.messages, message] }))
  }

  function openTool(id: string) {
    setActiveToolId(id)
    setEditing(false)
    setDatabaseOpen(false)
  }

  function openNewTool() {
    setActiveToolId(null)
    setEditing(false)
    setDatabaseOpen(false)
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
    setBusy(false)
  }

  async function send(event: FormEvent) {
    event.preventDefault()
    const text = draft.trim()
    if (!text || busy) return
    setDraft('')
    await generate(threadKey, text, text, editing && activeTool ? activeTool.id : undefined)
  }

  function createTool(name: string, description: string) {
    setNewToolOpen(false)
    openNewTool()
    void generate(
      NEW_TOOL_THREAD,
      `New tool "${name}": ${description}`,
      `Name the tool "${name}".\n${description}`,
    )
  }

  async function approve() {
    const key = threadKey
    const review = thread.review
    if (!review) return
    const requestId = review.request.id
    const packageId = review.request.packageId

    // A change to an existing tool has to keep its id, so it replaces that tool and nothing else.
    if (key !== NEW_TOOL_THREAD && packageId !== key) {
      addMessage(key, { role: 'system', text: `This change must keep the id "${key}". Reject it and describe the change again.` })
      return
    }

    setBusy(true)
    let result = await window.workplace.generation.approve(requestId, key !== NEW_TOOL_THREAD)
    if (result.ok && result.value.status === 'id-conflict') {
      const replace = window.confirm(`A tool with the id "${packageId}" already exists. Replace it?`)
      if (!replace) {
        setBusy(false)
        return
      }
      result = await window.workplace.generation.approve(requestId, true)
    }
    setBusy(false)

    if (!result.ok) {
      addMessage(key, { role: 'system', text: `Install failed: ${result.error}` })
      return
    }

    if (key === NEW_TOOL_THREAD) updateThread(NEW_TOOL_THREAD, () => EMPTY_THREAD)
    else updateThread(key, (current) => ({ ...current, review: null }))
    await refreshTools()
    // The tool opens in edit mode, so the next message refines it.
    setActiveToolId(packageId)
    setEditing(true)
    setRevision((current) => current + 1)
  }

  async function reject() {
    const key = threadKey
    const review = thread.review
    if (!review) return
    setBusy(true)
    await window.workplace.generation.reject(review.request.id)
    setBusy(false)
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
    <div className="dot-grid flex h-screen gap-3 p-3">
      <aside className="panel flex w-60 shrink-0 flex-col overflow-hidden">
        <div className="flex h-14 items-center gap-2.5 px-4 font-semibold">
          <span className="size-6 rounded-lg bg-gradient-to-br from-[#5b5bf0] to-[#e65bd6]" />
          Workplace
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2" aria-label="Tools">
          <Button variant="outline" className="mb-3 w-full justify-start" onClick={() => setNewToolOpen(true)}>
            <Plus />
            New tool
          </Button>
          <p className="px-2 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Tools</p>
          {tools.length === 0 && <p className="px-2 text-sm text-muted-foreground">No tools yet.</p>}
          {tools.map((tool) => (
            <Button
              key={tool.id}
              variant={tool.id === activeToolId ? 'outline' : 'ghost'}
              className="w-full justify-start"
              aria-current={tool.id === activeToolId ? 'page' : undefined}
              onClick={() => openTool(tool.id)}
            >
              <Wrench />
              {tool.name}
            </Button>
          ))}
        </nav>
        <div className="border-t p-3">
          <Button variant="ghost" className="w-full justify-start" aria-haspopup="dialog" onClick={() => setSettingsOpen(true)}>
            <Settings />
            Settings
          </Button>
        </div>
      </aside>

      <main className="panel flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b px-6">
          <h1 className="truncate text-sm font-medium">
            {databaseOpen ? 'Database' : activeTool ? activeTool.name : 'New tool'}
          </h1>
          <div className="flex shrink-0 items-center gap-2">
            {activeTool && !databaseOpen && (
              <ToolActions
                editing={editing}
                onEdit={() => setEditing((current) => !current)}
                onDelete={() => void uninstall()}
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
          <DatabaseView />
        ) : activeTool ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex min-h-0 flex-1">
              <ToolView key={`${activeTool.id}:${revision}`} manifest={activeTool} />
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
                onApprove={() => void approve()}
                onReject={() => void reject()}
              />
            )}
          </div>
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
            onApprove={() => void approve()}
            onReject={() => void reject()}
          />
        )}
      </main>

      {settingsOpen && (
        <SettingsDialog onClose={() => setSettingsOpen(false)} onOpenDatabase={() => setDatabaseOpen(true)} />
      )}
      {newToolOpen && <NewToolDialog onClose={() => setNewToolOpen(false)} onCreate={createTool} />}
    </div>
  )
}
