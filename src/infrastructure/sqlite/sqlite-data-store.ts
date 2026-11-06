import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { rm } from 'node:fs/promises'
import { join } from 'node:path'

import type { DataStore, StoredRecord } from '../../application/ports/data-store'
import type { DataInspector, TableRows } from '../../application/ports/data-inspector'
import { existsSync, readdirSync } from 'node:fs'
import type { RecordData } from '../../domain/package/records'

interface Row {
  id: string
  createdAt: string
  updatedAt: string
  data: string
}

export class SqliteDataStore implements DataStore, DataInspector {
  private readonly handles = new Map<string, DatabaseSync>()

  constructor(private readonly dataRoot: string) {}

  async list(packageId: string, collection: string): Promise<StoredRecord[]> {
    const db = this.open(packageId, collection)
    const rows = db.prepare(`SELECT * FROM "${collection}" ORDER BY createdAt`).all() as unknown as Row[]
    return rows.map(toRecord)
  }

  async get(packageId: string, collection: string, id: string): Promise<StoredRecord | null> {
    const db = this.open(packageId, collection)
    const row = db.prepare(`SELECT * FROM "${collection}" WHERE id = ?`).get(id) as unknown as Row | undefined
    return row ? toRecord(row) : null
  }

  async insert(packageId: string, collection: string, data: RecordData): Promise<StoredRecord> {
    const db = this.open(packageId, collection)
    const now = new Date().toISOString()
    const id = crypto.randomUUID()
    db.prepare(`INSERT INTO "${collection}" (id, createdAt, updatedAt, data) VALUES (?, ?, ?, ?)`).run(
      id,
      now,
      now,
      JSON.stringify(data),
    )
    return { id, createdAt: now, updatedAt: now, ...data }
  }

  async update(packageId: string, collection: string, id: string, data: RecordData): Promise<StoredRecord | null> {
    const existing = await this.get(packageId, collection, id)
    if (!existing) return null

    const db = this.open(packageId, collection)
    const { id: _id, createdAt, updatedAt: _updatedAt, ...current } = existing
    const merged = { ...current, ...data }
    const now = new Date().toISOString()
    db.prepare(`UPDATE "${collection}" SET updatedAt = ?, data = ? WHERE id = ?`).run(
      now,
      JSON.stringify(withoutMeta(merged)),
      id,
    )
    return { id, createdAt, updatedAt: now, ...withoutMeta(merged) }
  }

  async remove(packageId: string, collection: string, id: string): Promise<boolean> {
    const db = this.open(packageId, collection)
    const result = db.prepare(`DELETE FROM "${collection}" WHERE id = ?`).run(id)
    return Number(result.changes) > 0
  }

  async schemaVersion(packageId: string): Promise<number | null> {
    const db = this.existing(packageId)
    if (!db) return null
    const meta = db.prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = '_meta'`).get()
    if (!meta) return 1 // databases created before schema versions were recorded
    const row = db.prepare('SELECT schema_version AS version FROM _meta').get() as unknown as { version: number } | undefined
    return row?.version ?? 1
  }

  async setSchemaVersion(packageId: string, version: number): Promise<void> {
    const db = this.handle(packageId)
    db.exec('CREATE TABLE IF NOT EXISTS _meta (schema_version INTEGER NOT NULL)')
    db.exec('DELETE FROM _meta')
    db.prepare('INSERT INTO _meta (schema_version) VALUES (?)').run(version)
  }

  async databases(): Promise<string[]> {
    if (!existsSync(this.dataRoot)) return []
    return readdirSync(this.dataRoot)
      .filter((name) => name.endsWith('.db'))
      .map((name) => name.slice(0, -'.db'.length))
      .sort()
  }

  async tables(packageId: string): Promise<string[]> {
    const db = this.existing(packageId)
    if (!db) return []
    const rows = db
      .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name`)
      .all() as unknown as { name: string }[]
    return rows.map((row) => row.name).filter((name) => name !== '_meta')
  }

  async rows(packageId: string, table: string, limit: number): Promise<TableRows> {
    const db = this.existing(packageId)
    if (!db) return { columns: [], rows: [], total: 0 }

    const columns = (db.prepare(`PRAGMA table_info("${table}")`).all() as unknown as { name: string }[]).map(
      (column) => column.name,
    )
    const total = (db.prepare(`SELECT COUNT(*) AS n FROM "${table}"`).get() as unknown as { n: number }).n
    const rows = db
      .prepare(`SELECT * FROM "${table}" ORDER BY createdAt LIMIT ?`)
      .all(limit) as unknown as Record<string, unknown>[]
    return { columns, rows, total }
  }

  async deleteStore(packageId: string): Promise<void> {
    this.handles.get(packageId)?.close()
    this.handles.delete(packageId)
    await rm(join(this.dataRoot, `${packageId}.db`), { force: true })
  }

  private handle(packageId: string): DatabaseSync {
    const cached = this.handles.get(packageId)
    if (cached) return cached
    mkdirSync(this.dataRoot, { recursive: true })
    const db = new DatabaseSync(join(this.dataRoot, `${packageId}.db`))
    this.handles.set(packageId, db)
    return db
  }

  private existing(packageId: string): DatabaseSync | null {
    const cached = this.handles.get(packageId)
    if (cached) return cached
    const file = join(this.dataRoot, `${packageId}.db`)
    if (!existsSync(file)) return null
    const db = new DatabaseSync(file)
    this.handles.set(packageId, db)
    return db
  }

  private open(packageId: string, collection: string): DatabaseSync {
    let db = this.handles.get(packageId)
    if (!db) {
      mkdirSync(this.dataRoot, { recursive: true })
      db = new DatabaseSync(join(this.dataRoot, `${packageId}.db`))
      this.handles.set(packageId, db)
    }
    db.exec(
      `CREATE TABLE IF NOT EXISTS "${collection}" (id TEXT PRIMARY KEY, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, data TEXT NOT NULL)`,
    )
    return db
  }
}

function toRecord(row: Row): StoredRecord {
  return { id: row.id, createdAt: row.createdAt, updatedAt: row.updatedAt, ...JSON.parse(row.data) }
}

function withoutMeta(record: Record<string, unknown>): RecordData {
  const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...data } = record
  return data as RecordData
}
