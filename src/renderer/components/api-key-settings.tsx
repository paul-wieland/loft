import { useEffect, useState, type FormEvent } from 'react'

import type { ApiKeyStatus } from '../../application/keys/get-api-key-status'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function ApiKeySettings() {
  const [status, setStatus] = useState<ApiKeyStatus | null>(null)
  const [key, setKey] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    void refreshStatus()
  }, [])

  async function refreshStatus() {
    setStatus(await window.workplace.keys.status())
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    const result = await window.workplace.keys.save(key)
    setSaving(false)

    if (!result.ok) {
      setError(result.error)
      return
    }
    setKey('')
    setError(null)
    await refreshStatus()
  }

  return (
    <section aria-label="API key settings">
      <h2 className="text-sm font-medium">Anthropic API key</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {status === null
          ? 'Checking…'
          : status.configured
            ? `Saved (${status.masked}). Paste a new key to replace it.`
            : 'Needed to generate tools. Stored encrypted on this computer.'}
      </p>
      <form onSubmit={save} className="mt-3 flex gap-2">
        <Input
          type="password"
          value={key}
          onChange={(event) => setKey(event.target.value)}
          placeholder="sk-ant-…"
          autoComplete="off"
          spellCheck={false}
          aria-label="Anthropic API key"
        />
        <Button type="submit" disabled={saving || !key.trim()}>
          Save
        </Button>
      </form>
      {error && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      )}
    </section>
  )
}
