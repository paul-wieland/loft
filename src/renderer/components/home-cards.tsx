import { useEffect, useRef, useState } from 'react'
import { ChevronRight } from 'lucide-react'

import type { PackageManifest } from '../../domain/package/manifest'
import { ToolMark } from '@/components/tool-brand'
import { useTheme } from '@/components/theme-provider'
import { cn } from '@/lib/utils'

const LOAD_TIMEOUT_MS = 8000

interface HomeCardsProps {
  tools: PackageManifest[]
  revisions: Record<string, number>
  onOpenTool: (id: string) => void
}

// Each card runs in its own sandboxed frame. It is rebuilt when its tool's data changes, so it never shows stale numbers.
export function HomeCards({ tools, revisions, onOpenTool }: HomeCardsProps) {
  if (tools.length === 0) return null
  return (
    <div className="grid w-full max-w-2xl gap-2 sm:grid-cols-2">
      {tools.map((tool) => (
        <HomeCard key={`${tool.id}:${revisions[tool.id] ?? 0}`} tool={tool} onOpen={() => onOpenTool(tool.id)} />
      ))}
    </div>
  )
}

function HomeCard({ tool, onOpen }: { tool: PackageManifest; onOpen: () => void }) {
  const frameRef = useRef<HTMLIFrameElement>(null)
  const loadedRef = useRef(false)
  const [failed, setFailed] = useState(false)
  const { dark, style } = useTheme()

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (!loadedRef.current) setFailed(true)
    }, LOAD_TIMEOUT_MS)
    return () => window.clearTimeout(timeout)
  }, [])

  useEffect(() => {
    async function onMessage(event: MessageEvent) {
      const frame = frameRef.current
      if (!frame || event.source !== frame.contentWindow) return
      const message = event.data as Record<string, unknown> | null
      if (!message || typeof message !== 'object') return

      if (message.type === 'workplace:ready') {
        loadedRef.current = true
        frame.contentWindow?.postMessage({ type: 'workplace:theme', dark, style }, '*')
        return
      }
      if (message.type === 'workplace:open') {
        onOpen()
        return
      }
      if (message.type !== 'workplace:call' || typeof message.id !== 'number' || typeof message.op !== 'string') return

      const id: number = message.id
      const op = message.op
      const reply = (ok: boolean, value?: unknown, error?: string) =>
        frame.contentWindow?.postMessage({ type: 'workplace:result', id, ok, value, error }, '*')

      // Cards are read-only: only list and get reach the store.
      if (op !== 'list' && op !== 'get') {
        reply(false, undefined, 'Cards can only read data')
        return
      }
      const result = await window.workplace.store.call({
        packageId: tool.id,
        op: op as 'list',
        args: message.args as { collection: string },
      })
      reply(result.ok, result.ok ? result.value : undefined, result.ok ? undefined : result.error)
    }

    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [tool.id, dark, style, onOpen])

  return (
    <div className={cn('panel flex min-w-0 flex-col overflow-hidden', tool.homeCard?.size === 'wide' && 'sm:col-span-2')}>
      <button type="button" onClick={onOpen} className="group flex items-center gap-2 px-3 pb-1 pt-3 text-left">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-[var(--brand-a)] to-[var(--brand-b)] text-white">
          <ToolMark id={tool.id} icon={tool.icon} className="size-3" />
        </span>
        <span className="min-w-0 flex-1 truncate text-xs font-semibold">{tool.name}</span>
        <ChevronRight className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </button>
      {failed ? (
        <p className="px-3 pb-3 text-xs text-muted-foreground">This card did not load.</p>
      ) : (
        <div className="px-3 pb-3">
          <iframe
            ref={frameRef}
            title={`${tool.name} card`}
            src={`workplace-pkg://${tool.id}/card.html`}
            sandbox="allow-scripts"
            className="h-24 w-full border-0 bg-transparent"
          />
        </div>
      )}
    </div>
  )
}
