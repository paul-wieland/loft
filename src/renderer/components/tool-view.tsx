import { useEffect, useRef } from 'react'

import type { PackageManifest } from '../../domain/package/manifest'
import { useTheme } from '@/components/theme-provider'

interface ToolCall {
  type: 'workplace:call'
  id: number
  op: string
  args: { collection: string; id?: unknown; data?: unknown }
}

export function ToolView({ manifest, onDataChanged }: { manifest: PackageManifest; onDataChanged?: () => void }) {
  const frameRef = useRef<HTMLIFrameElement>(null)
  const { dark } = useTheme()

  useEffect(() => {
    frameRef.current?.contentWindow?.postMessage({ type: 'workplace:theme', dark }, '*')
  }, [dark])

  useEffect(() => {
    async function onMessage(event: MessageEvent) {
      const frame = frameRef.current
      if (!frame || event.source !== frame.contentWindow) return

      // The tool announces itself once its bridge is ready; send it the current theme.
      if (isReady(event.data)) {
        frame.contentWindow?.postMessage({ type: 'workplace:theme', dark }, '*')
        return
      }
      if (!isToolCall(event.data)) return

      const call = event.data
      const result = await window.workplace.store.call({
        packageId: manifest.id,
        op: call.op as 'list',
        args: call.args,
      })

      if (result.ok && (call.op === 'insert' || call.op === 'update' || call.op === 'remove')) onDataChanged?.()

      frame.contentWindow?.postMessage(
        {
          type: 'workplace:result',
          id: call.id,
          ok: result.ok,
          value: result.ok ? result.value : undefined,
          error: result.ok ? undefined : result.error,
        },
        '*',
      )
    }

    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [manifest.id, dark])

  return (
    <iframe
      ref={frameRef}
      key={manifest.id}
      title={manifest.name}
      src={`workplace-pkg://${manifest.id}/`}
      sandbox="allow-scripts allow-forms allow-modals"
      className="h-full w-full flex-1 border-0 bg-background"
    />
  )
}

function isReady(value: unknown): boolean {
  return typeof value === 'object' && value !== null && (value as Record<string, unknown>).type === 'workplace:ready'
}

function isToolCall(value: unknown): value is ToolCall {
  if (typeof value !== 'object' || value === null) return false
  const message = value as Record<string, unknown>
  return message.type === 'workplace:call' && typeof message.id === 'number' && typeof message.op === 'string'
}
