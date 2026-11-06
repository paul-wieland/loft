import type { RecordData } from '../../domain/package/records'

export interface StoredRecord {
  id: string
  createdAt: string
  updatedAt: string
  [field: string]: unknown
}

export interface DataStore {
  list(packageId: string, collection: string): Promise<StoredRecord[]>
  get(packageId: string, collection: string, id: string): Promise<StoredRecord | null>
  insert(packageId: string, collection: string, data: RecordData): Promise<StoredRecord>
  update(packageId: string, collection: string, id: string, data: RecordData): Promise<StoredRecord | null>
  remove(packageId: string, collection: string, id: string): Promise<boolean>
  deleteStore(packageId: string): Promise<void>
}
