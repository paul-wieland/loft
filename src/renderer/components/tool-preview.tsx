import { useEffect, useRef } from 'react'

import { useTheme } from '@/components/theme-provider'

type StoredRecord = { id: string; createdAt: string; updatedAt: string } & Record<string, unknown>

interface ToolCall {
  id: number
  op: string
  args: Record<string, unknown>
}

interface ToolPreviewProps {
  requestId: string
  name: string
}

// Runs a package that is still in review, so it can be tried before it is installed.
// Its records live in memory only: they are gone when the review closes, and the saved
// data of any installed tool is never read or changed.
export function ToolPreview({ requestId, name }: ToolPreviewProps) {
  const { dark, style } = useTheme()
  const frameRef = useRef<HTMLIFrameElement>(null)
  const storeRef = useRef(new Map<string, Map<string, StoredRecord>>())

  useEffect(() => {
    const postTheme = () => frameRef.current?.contentWindow?.postMessage({ type: 'workplace:theme', dark, style }, '*')

    function onMessage(event: MessageEvent) {
      if (event.source !== frameRef.current?.contentWindow) return
      if (isReady(event.data)) return postTheme()
      if (!isToolCall(event.data)) return

      const call = event.data
      const outcome = runCall(storeRef.current, call)
      frameRef.current?.contentWindow?.postMessage(
        { type: 'workplace:result', id: call.id, ok: outcome.ok, value: outcome.value, error: outcome.error },
        '*',
      )
    }

    window.addEventListener('message', onMessage)
    postTheme()
    return () => window.removeEventListener('message', onMessage)
  }, [dark, style])

  return (
    <iframe
      ref={frameRef}
      title={`Preview of ${name}`}
      src={`workplace-preview://${requestId}/`}
      sandbox="allow-scripts allow-forms allow-modals"
      className="h-full w-full border-0 bg-background"
    />
  )
}

function runCall(
  store: Map<string, Map<string, StoredRecord>>,
  call: ToolCall,
): { ok: boolean; value?: unknown; error?: string } {
  const collection = typeof call.args.collection === 'string' ? call.args.collection : ''
  if (!collection) return { ok: false, error: 'a collection name is required' }
  const records = store.get(collection) ?? new Map<string, StoredRecord>()
  store.set(collection, records)

  switch (call.op) {
    case 'list':
      return { ok: true, value: [...records.values()] }
    case 'get':
      return { ok: true, value: records.get(String(call.args.id)) ?? null }
    case 'insert': {
      const now = new Date().toISOString()
      const id = crypto.randomUUID()
      const record = { ...withoutMeta(call.args.data), id, createdAt: now, updatedAt: now }
      records.set(id, record)
      return { ok: true, value: record }
    }
    case 'update': {
      const id = String(call.args.id)
      const current = records.get(id)
      if (!current) return { ok: true, value: null }
      const record = { ...current, ...withoutMeta(call.args.data), id, updatedAt: new Date().toISOString() }
      records.set(id, record)
      return { ok: true, value: record }
    }
    case 'remove':
      return { ok: true, value: records.delete(String(call.args.id)) }
    default:
      return { ok: false, error: `unknown operation "${call.op}"` }
  }
}

function withoutMeta(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null) return {}
  const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...data } = value as Record<string, unknown>
  return data
}

function isReady(value: unknown): boolean {
  return typeof value === 'object' && value !== null && (value as { type?: unknown }).type === 'workplace:ready'
}

function isToolCall(value: unknown): value is ToolCall {
  if (typeof value !== 'object' || value === null) return false
  const message = value as Partial<ToolCall> & { type?: unknown }
  return message.type === 'workplace:call' && typeof message.id === 'number' && typeof message.op === 'string'
}
