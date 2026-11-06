import { DEFAULT_SCHEMA_VERSION, validateDataSchema, type DataSchema } from '../../domain/package/data-schema'
import { validateRecord } from '../../domain/package/records'
import { err, ok, type Result } from '../../domain/shared/result'
import type { DataStore } from '../ports/data-store'
import type { PackageRepository } from '../ports/package-repository'

export type DataOperation = 'list' | 'get' | 'insert' | 'update' | 'remove'

export interface DataCall {
  packageId: string
  op: DataOperation
  args: { collection: string; id?: unknown; data?: unknown }
}

export class PackageData {
  constructor(
    private readonly packages: PackageRepository,
    private readonly store: DataStore,
  ) {}

  async execute(call: DataCall): Promise<Result<unknown, string>> {
    const { packageId, op, args } = call

    const manifest = await this.packages.getManifest(packageId)
    if (!manifest) return err('This tool is not installed')
    if (!manifest.permissions.includes('store')) {
      return err('PermissionDenied: this tool did not request the store permission')
    }

    const schema = await this.loadSchema(packageId)
    if (!schema.ok) return err(schema.error)
    if (!Object.hasOwn(schema.value.collections, args.collection)) {
      return err(`Unknown collection "${args.collection}"`)
    }
    const collection = schema.value.collections[args.collection]!

    const id = typeof args.id === 'string' ? args.id : null

    switch (op) {
      case 'list':
        return ok(await this.store.list(packageId, args.collection))

      case 'get':
        if (id === null) return err('Record id is required')
        return ok(await this.store.get(packageId, args.collection, id))

      case 'insert': {
        const data = validateRecord(collection, args.data, 'create')
        if (!data.ok) return err(data.error.join('; '))
        return ok(await this.store.insert(packageId, args.collection, data.value))
      }

      case 'update': {
        if (id === null) return err('Record id is required')
        const data = validateRecord(collection, args.data, 'update')
        if (!data.ok) return err(data.error.join('; '))
        const updated = await this.store.update(packageId, args.collection, id, data.value)
        return updated ? ok(updated) : err('Record not found')
      }

      case 'remove':
        if (id === null) return err('Record id is required')
        return ok(await this.store.remove(packageId, args.collection, id))

      default:
        return err('Unknown operation')
    }
  }

  private async loadSchema(packageId: string): Promise<Result<DataSchema, string>> {
    const text = await this.packages.readPackageFile(packageId, 'schema.json')
    if (text === null) return ok({ schemaVersion: DEFAULT_SCHEMA_VERSION, collections: {} })

    let raw: unknown
    try {
      raw = JSON.parse(text)
    } catch {
      return err('schema.json is not valid JSON')
    }

    const schema = validateDataSchema(raw)
    return schema.ok ? schema : err(schema.error.join('; '))
  }
}
