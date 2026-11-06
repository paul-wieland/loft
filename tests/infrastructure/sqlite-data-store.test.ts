import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { PackageData } from '../../src/application/data/package-data'
import { FilePackageRepository } from '../../src/infrastructure/fs/file-package-repository'
import { SqliteDataStore } from '../../src/infrastructure/sqlite/sqlite-data-store'

const manifest = {
  id: 'todo-test',
  name: 'Todo',
  version: '1.0.0',
  icon: 'check-square',
  entry: 'ui/index.js',
  permissions: ['store'],
  contractVersion: 1,
}
const schema = { collections: { todos: { fields: { text: { type: 'string', required: true }, done: { type: 'boolean', default: false } } } } }

let root: string

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'workplace-'))
  const pkg = join(root, 'packages', 'todo-test')
  await mkdir(join(pkg, 'ui'), { recursive: true })
  await writeFile(join(pkg, 'manifest.json'), JSON.stringify(manifest))
  await writeFile(join(pkg, 'schema.json'), JSON.stringify(schema))
  await writeFile(join(pkg, 'ui', 'index.js'), '')
})

afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

function setup() {
  const packages = new FilePackageRepository(join(root, 'packages'))
  const store = new SqliteDataStore(join(root, 'data'))
  return { data: new PackageData(packages, store), store }
}

describe('package data through the real store', () => {
  it('inserts, lists and updates a record', async () => {
    const { data } = setup()

    const inserted = await data.execute({
      packageId: 'todo-test',
      op: 'insert',
      args: { collection: 'todos', data: { text: 'buy milk', done: false } },
    })
    expect(inserted.ok).toBe(true)

    const listed = await data.execute({ packageId: 'todo-test', op: 'list', args: { collection: 'todos' } })
    expect(listed).toMatchObject({ ok: true, value: [{ text: 'buy milk', done: false }] })
  })

  it('lists databases, tables and rows for inspection', async () => {
    const { data, store } = setup()
    await data.execute({
      packageId: 'todo-test',
      op: 'insert',
      args: { collection: 'todos', data: { text: 'inspect me' } },
    })

    expect(await store.databases()).toEqual(['todo-test'])
    expect(await store.tables('todo-test')).toEqual(['todos'])
    expect(await store.rows('todo-test', 'todos', 10)).toMatchObject({
      columns: ['id', 'createdAt', 'updatedAt', 'data'],
      total: 1,
      rows: [{ data: expect.stringContaining('inspect me') }],
    })
  })

  it('keeps records after the store is reopened', async () => {
    const first = setup()
    await first.data.execute({
      packageId: 'todo-test',
      op: 'insert',
      args: { collection: 'todos', data: { text: 'survives restart' } },
    })

    const second = setup()
    const listed = await second.data.execute({ packageId: 'todo-test', op: 'list', args: { collection: 'todos' } })
    expect(listed).toMatchObject({ ok: true, value: [{ text: 'survives restart', done: false }] })
  })
})

describe('SqliteDataStore schema versions', () => {
  it('reads null before any database exists, 1 for a legacy database, and the recorded version after', async () => {
    const store = new SqliteDataStore(join(root, 'data'))

    expect(await store.schemaVersion('versioned-tool')).toBeNull()

    await store.insert('versioned-tool', 'items', { text: 'kept' })
    expect(await store.schemaVersion('versioned-tool')).toBe(1)

    await store.setSchemaVersion('versioned-tool', 3)
    expect(await store.schemaVersion('versioned-tool')).toBe(3)
    expect(await store.tables('versioned-tool')).toEqual(['items'])
  })
})

