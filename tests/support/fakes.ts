import type { PackageManifest } from '../../src/domain/package/manifest'
import type { DataStore, StoredRecord } from '../../src/application/ports/data-store'
import type { KeyStore } from '../../src/application/ports/key-store'
import type { PackageRepository } from '../../src/application/ports/package-repository'
import type { RequestStore } from '../../src/application/ports/request-store'
import type { StagingArea } from '../../src/application/ports/staging-area'
import {
  createRequest,
  finishGeneration,
  passValidation,
  type GenerationRequest,
} from '../../src/domain/requests/generation-request'
import type { Result } from '../../src/domain/shared/result'

export function unwrap<T, E>(result: Result<T, E>): T {
  if (!result.ok) throw new Error(`expected ok, got: ${JSON.stringify(result.error)}`)
  return result.value
}

export const validManifest = {
  id: 'todo-list',
  name: 'Todo list',
  version: '1.0.0',
  icon: 'check-square',
  entry: 'ui/index.js',
  permissions: ['store'],
  contractVersion: 1,
}

export function validatingRequest(): GenerationRequest {
  return unwrap(finishGeneration(createRequest({ id: 'req-1', packageId: 'todo-list', spec: 'a todo list' })))
}

export function awaitingReviewRequest(): GenerationRequest {
  return unwrap(passValidation(validatingRequest()))
}

export class InMemoryRequestStore implements RequestStore {
  private readonly requests = new Map<string, GenerationRequest>()

  seed(request: GenerationRequest): void {
    this.requests.set(request.id, request)
  }

  async get(id: string): Promise<GenerationRequest | null> {
    return this.requests.get(id) ?? null
  }

  async save(request: GenerationRequest): Promise<void> {
    this.requests.set(request.id, request)
  }
}

export class InMemoryStagingArea implements StagingArea {
  readonly promoted: string[] = []
  readonly discarded: string[] = []
  readonly escapingSymlinks = new Set<string>()
  readonly preparedFrom = new Map<string, string | null>()
  private readonly files = new Map<string, Map<string, string>>()

  stage(requestId: string, files: Record<string, string>): void {
    this.files.set(requestId, new Map(Object.entries(files)))
  }

  async prepare(requestId: string, _spec?: string, basePackageId?: string): Promise<void> {
    this.preparedFrom.set(requestId, basePackageId ?? null)
    if (!this.files.has(requestId)) this.files.set(requestId, new Map())
  }

  async readFile(requestId: string, relativePath: string): Promise<string | null> {
    return this.files.get(requestId)?.get(relativePath) ?? null
  }

  async exists(requestId: string, relativePath: string): Promise<boolean> {
    return this.files.get(requestId)?.has(relativePath) ?? false
  }

  async listFiles(requestId: string): Promise<string[]> {
    return [...(this.files.get(requestId)?.keys() ?? [])]
  }

  async hasExternalSymlinks(requestId: string): Promise<boolean> {
    return this.escapingSymlinks.has(requestId)
  }

  async promote(requestId: string, packageId: string): Promise<void> {
    this.promoted.push(packageId)
    this.files.delete(requestId)
  }

  async discard(requestId: string): Promise<void> {
    this.discarded.push(requestId)
    this.files.delete(requestId)
  }
}

export class InMemoryPackageRepository implements PackageRepository {
  readonly installed = new Set<string>()

  async isInstalled(packageId: string): Promise<boolean> {
    return this.installed.has(packageId)
  }

  async list(): Promise<PackageManifest[]> {
    return []
  }

  async getManifest(): Promise<PackageManifest | null> {
    return null
  }

  async readEntry(): Promise<string | null> {
    return null
  }

  async readPackageFile(): Promise<string | null> {
    return null
  }

  async remove(packageId: string): Promise<void> {
    this.installed.delete(packageId)
  }
}

export class InMemoryDataStore implements DataStore {
  readonly deletedStores: string[] = []

  async list(): Promise<StoredRecord[]> {
    return []
  }

  async get(): Promise<StoredRecord | null> {
    return null
  }

  async insert(): Promise<StoredRecord> {
    throw new Error('not used')
  }

  async update(): Promise<StoredRecord | null> {
    return null
  }

  async remove(): Promise<boolean> {
    return false
  }

  async deleteStore(packageId: string): Promise<void> {
    this.deletedStores.push(packageId)
  }
}

export class InMemoryKeyStore implements KeyStore {
  value: string | null = null

  async read(): Promise<string | null> {
    return this.value
  }

  async write(key: string): Promise<void> {
    this.value = key
  }
}
