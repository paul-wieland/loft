import { isValidPackageId } from '../../domain/package/package-id'
import { isRecord } from '../../domain/shared/guards'
import { err, ok, type Result } from '../../domain/shared/result'

export interface CatalogFile {
  path: string
  sha256: string
}

export interface CatalogTool {
  id: string
  name: string
  version: string
  description: string
  icon: string
  files: CatalogFile[]
}

// The catalog is published by the loft-tools repository (see catalog.json there).
export function parseCatalog(raw: unknown): Result<CatalogTool[], string> {
  if (!isRecord(raw) || !Array.isArray(raw.tools)) return err('the catalog must list "tools"')

  const tools: CatalogTool[] = []
  for (const entry of raw.tools) {
    if (!isRecord(entry) || typeof entry.id !== 'string' || !isValidPackageId(entry.id)) {
      return err('the catalog has a tool without a valid id')
    }
    if (typeof entry.name !== 'string' || typeof entry.version !== 'string' || !Array.isArray(entry.files)) {
      return err(`the catalog entry "${entry.id}" is incomplete`)
    }
    const files: CatalogFile[] = []
    for (const file of entry.files) {
      if (!isRecord(file) || typeof file.path !== 'string' || typeof file.sha256 !== 'string' || !isSafePath(file.path)) {
        return err(`the catalog entry "${entry.id}" lists an unsafe file`)
      }
      files.push({ path: file.path, sha256: file.sha256 })
    }
    if (!files.some((f) => f.path === 'manifest.json') || !files.some((f) => f.path === 'ui/index.js')) {
      return err(`the catalog entry "${entry.id}" must list manifest.json and ui/index.js`)
    }
    tools.push({
      id: entry.id,
      name: entry.name,
      version: entry.version,
      description: typeof entry.description === 'string' ? entry.description : '',
      icon: typeof entry.icon === 'string' ? entry.icon : 'wrench',
      files,
    })
  }
  return ok(tools)
}

function isSafePath(path: string): boolean {
  return path.length > 0 && !path.startsWith('/') && !path.includes('\\') && !path.split('/').includes('..')
}
