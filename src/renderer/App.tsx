import { useEffect, useState, type FormEvent } from 'react'
import { Database, MessageSquarePlus, Send, Settings, Trash2, Wrench } from 'lucide-react'

import type { Review } from '../application/generation/get-review'
import type { PackageManifest } from '../domain/package/manifest'
import { ApiKeySettings } from '@/components/api-key-settings'
import { DatabaseView } from '@/components/database-view'
import { ReviewPanel } from '@/components/review-panel'
import { ThemeToggle } from '@/components/theme-toggle'
import { ToolView } from '@/components/tool-view'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Message {
  role: 'user' | 'system'
  text: string
}

export function App() {
  const [draft, setDraft] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [databaseOpen, setDatabaseOpen] = useState(false)
  const [tools, setTools] = useState<PackageManifest[]>([])
  const [activeToolId, setActiveToolId] = useState<string | null>(null)
  const [review, setReview] = useState<Review | null>(null)
  const [busy, setBusy] = useState(false)
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    void refreshTools()
  }, [])

  const activeTool = tools.find((tool) => tool.id === activeToolId) ?? null

  async function refreshTools() {
    setTools(await window.workplace.packages.list())
  }

  function addMessage(message: Message) {
    setMessages((current) => [...current, message])
  }

  async function send(event: FormEvent) {
    event.preventDefault()
    const text = draft.trim()
    if (!text || busy) return

    setDraft('')
    addMessage({ role: 'user', text })
    const editing = activeTool
    setBusy(true)
    addMessage({ role: 'system', text: editing ? `Changing ${editing.name}…` : 'Generating…' })

    const started = await window.workplace.generation.start(text, editing?.id)
    if (!started.ok) {
      addMessage({ role: 'system', text: `Could not generate the tool: ${started.error}` })
      setBusy(false)
      return
    }

    const view = await window.workplace.generation.review(started.value.id)
    setReview(view)
    setBusy(false)
    addMessage({
      role: 'system',
      text:
        view?.request.state === 'awaiting-review'
          ? 'Generated. Review it below before installing.'
          : `Generation stopped in state "${view?.request.state ?? 'unknown'}". See the review below.`,
    })
  }

  async function approve() {
    if (!review) return
    const requestId = review.request.id
    const packageId = review.request.packageId

    const replacingOpenTool = activeTool?.id === packageId
    setBusy(true)
    let result = await window.workplace.generation.approve(requestId, replacingOpenTool)
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
      addMessage({ role: 'system', text: `Install failed: ${result.error}` })
      return
    }

    setReview(null)
    addMessage({ role: 'system', text: `Installed ${packageId}.` })
    await refreshTools()
    setActiveToolId(packageId)
    setRevision((current) => current + 1)
  }

  async function uninstall() {
    if (!activeTool) return
    if (!window.confirm(`Uninstall "${activeTool.name}"?`)) return
    const deleteData = window.confirm(
      `Also delete the saved data of "${activeTool.name}"? OK deletes it, Cancel keeps it.`,
    )

    const result = await window.workplace.packages.uninstall(activeTool.id, deleteData)
    if (!result.ok) {
      addMessage({ role: 'system', text: `Uninstall failed: ${result.error}` })
      return
    }

    addMessage({ role: 'system', text: `Uninstalled ${activeTool.name}.` })
    setActiveToolId(null)
    await refreshTools()
  }

  async function reject() {
    if (!review) return
    setBusy(true)
    await window.workplace.generation.reject(review.request.id)
    setBusy(false)
    setReview(null)
    addMessage({ role: 'system', text: 'Rejected. Nothing was installed.' })
  }

  return (
    <div className="dot-grid flex h-screen gap-3 p-3">
      <aside className="panel flex w-60 shrink-0 flex-col overflow-hidden">
        <div className="flex h-14 items-center gap-2.5 px-4 font-semibold">
          <span className="size-6 rounded-lg bg-gradient-to-br from-[#5b5bf0] to-[#e65bd6]" />
          Workplace
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2" aria-label="Tools">
          <p className="px-2 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Tools</p>
          {tools.length === 0 && <p className="px-2 text-sm text-muted-foreground">No tools yet.</p>}
          {tools.map((tool) => (
            <Button
              key={tool.id}
              variant={tool.id === activeToolId ? 'outline' : 'ghost'}
              className="w-full justify-start"
              aria-current={tool.id === activeToolId ? 'page' : undefined}
              onClick={() => setActiveToolId(tool.id)}
            >
              <Wrench />
              {tool.name}
            </Button>
          ))}
        </nav>
      </aside>

      <main className="panel flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center justify-between border-b px-6">
          <h1 className="text-sm font-medium">{activeTool ? activeTool.name : 'Chat'}</h1>
          <div className="flex items-center gap-1">
            {activeTool && (
              <Button variant="ghost" size="icon" aria-label="Uninstall tool" title="Uninstall tool" onClick={() => void uninstall()}>
                <Trash2 />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              aria-label="Database view"
              aria-pressed={databaseOpen}
              onClick={() => setDatabaseOpen((open) => !open)}
            >
              <Database />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Settings"
              aria-expanded={settingsOpen}
              onClick={() => setSettingsOpen((open) => !open)}
            >
              <Settings />
            </Button>
            <ThemeToggle />
          </div>
        </header>

        {settingsOpen && <ApiKeySettings />}
        {review && (
          <ReviewPanel review={review} busy={busy} onApprove={() => void approve()} onReject={() => void reject()} />
        )}

        {databaseOpen ? (
          <DatabaseView />
        ) : (
        <section className="flex flex-1 flex-col overflow-hidden" aria-label="Main">
          {activeTool && (
            <div className="flex min-h-0 flex-1">
              <ToolView key={`${activeTool.id}:${revision}`} manifest={activeTool} />
            </div>
          )}
          <div
            className={activeTool ? 'max-h-56 shrink-0 overflow-y-auto border-t p-4' : 'flex-1 overflow-y-auto p-6'}
          >
            <div className="flex min-h-full flex-col gap-3">
              {messages.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
                  <MessageSquarePlus className="size-8" />
                  <p>Describe a tool, for example “a todo list with due dates”.</p>
                </div>
              ) : (
                messages.map((message, index) =>
                  message.role === 'user' ? (
                    <div
                      key={index}
                      className="ml-auto max-w-[80%] rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground shadow-sm"
                    >
                      {message.text}
                    </div>
                  ) : (
                    <p key={index} className="text-sm text-muted-foreground">
                      {message.text}
                    </p>
                  ),
                )
              )}
            </div>
          </div>

          <form onSubmit={(event) => void send(event)} className="flex gap-2 border-t bg-card p-4">
            <Input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Describe a tool…"
              aria-label="Message"
              disabled={busy}
            />
            <Button type="submit" disabled={busy || !draft.trim()}>
              <Send />
              Send
            </Button>
          </form>
        </section>
        )}
      </main>
    </div>
  )
}
