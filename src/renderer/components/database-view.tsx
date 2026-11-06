import { useEffect, useState } from 'react'

import type { TableRows } from '../../application/ports/data-inspector'
import { Button } from '@/components/ui/button'

export function DatabaseView() {
  const [databases, setDatabases] = useState<string[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [tables, setTables] = useState<string[]>([])
  const [table, setTable] = useState<string | null>(null)
  const [rows, setRows] = useState<TableRows | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void loadDatabases()
  }, [])

  async function loadDatabases() {
    setDatabases(await window.workplace.debug.databases())
  }

  async function openDatabase(packageId: string) {
    setSelected(packageId)
    setTable(null)
    setRows(null)
    setError(null)
    const result = await window.workplace.debug.tables(packageId)
    if (result.ok) setTables(result.value)
    else setError(result.error)
  }

  async function openTable(name: string) {
    if (!selected) return
    setTable(name)
    setError(null)
    const result = await window.workplace.debug.rows(selected, name)
    if (result.ok) setRows(result.value)
    else setError(result.error)
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden" aria-label="Database">
      <div className="flex items-center justify-between border-b px-6 py-3">
        <p className="text-sm text-muted-foreground">Read-only view of each tool's SQLite database.</p>
        <Button variant="outline" size="sm" onClick={() => void loadDatabases()}>
          Refresh
        </Button>
      </div>

      <div className="flex min-h-0 flex-1">
        <aside className="w-56 shrink-0 space-y-1 overflow-y-auto border-r p-3">
          <p className="px-2 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Databases</p>
          {databases.length === 0 && <p className="px-2 text-sm text-muted-foreground">No databases yet.</p>}
          {databases.map((name) => (
            <Button
              key={name}
              variant={name === selected ? 'outline' : 'ghost'}
              size="sm"
              className="w-full justify-start truncate"
              onClick={() => void openDatabase(name)}
            >
              {name}
            </Button>
          ))}
        </aside>

        <aside className="w-48 shrink-0 space-y-1 overflow-y-auto border-r p-3">
          <p className="px-2 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Tables</p>
          {selected && tables.length === 0 && <p className="px-2 text-sm text-muted-foreground">No tables.</p>}
          {tables.map((name) => (
            <Button
              key={name}
              variant={name === table ? 'outline' : 'ghost'}
              size="sm"
              className="w-full justify-start"
              onClick={() => void openTable(name)}
            >
              {name}
            </Button>
          ))}
        </aside>

        <div className="min-w-0 flex-1 overflow-auto p-4">
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          {!rows && !error && <p className="text-sm text-muted-foreground">Pick a database and a table.</p>}
          {rows && table && (
            <>
              <p className="mb-3 text-sm text-muted-foreground">
                {table}: {rows.total} row{rows.total === 1 ? '' : 's'}
                {rows.total > rows.rows.length ? `, showing the first ${rows.rows.length}` : ''}
              </p>
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr>
                    {rows.columns.map((column) => (
                      <th key={column} className="border-b px-2 py-1 font-medium">
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.rows.map((row, index) => (
                    <tr key={index} className="align-top">
                      {rows.columns.map((column) => (
                        <td key={column} className="max-w-xs break-words border-b px-2 py-1 font-mono">
                          {String(row[column] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
