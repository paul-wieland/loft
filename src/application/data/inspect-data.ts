import { isValidPackageId } from '../../domain/package/package-id'
import { err, ok, type Result } from '../../domain/shared/result'
import type { DataInspector, TableRows } from '../ports/data-inspector'

const ROW_LIMIT = 200

export class InspectData {
  constructor(private readonly inspector: DataInspector) {}

  databases(): Promise<string[]> {
    return this.inspector.databases()
  }

  async tables(packageId: string): Promise<Result<string[], string>> {
    if (!isValidPackageId(packageId)) return err('Unknown database')
    return ok(await this.inspector.tables(packageId))
  }

  async rows(packageId: string, table: string): Promise<Result<TableRows, string>> {
    if (!isValidPackageId(packageId)) return err('Unknown database')
    const tables = await this.inspector.tables(packageId)
    if (!tables.includes(table)) return err(`Unknown table "${table}"`)
    return ok(await this.inspector.rows(packageId, table, ROW_LIMIT))
  }
}
