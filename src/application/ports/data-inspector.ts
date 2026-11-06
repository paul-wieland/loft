export interface TableRows {
  columns: string[]
  rows: Record<string, unknown>[]
  total: number
}

export interface DataInspector {
  databases(): Promise<string[]>
  tables(packageId: string): Promise<string[]>
  rows(packageId: string, table: string, limit: number): Promise<TableRows>
}
