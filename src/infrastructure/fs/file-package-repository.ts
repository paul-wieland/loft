import { readdir, readFile, rm, stat } from 'node:fs/promises'
import { isAbsolute, join, normalize } from 'node:path'

import type { PackageRepository } from '../../application/ports/package-repository'
import { validateManifest, type PackageManifest } from '../../domain/package/manifest'
import { isValidPackageId } from '../../domain/package/package-id'

export class FilePackageRepository implements PackageRepository {
  constructor(private readonly packagesRoot: string) {}

  async isInstalled(packageId: string): Promise<boolean> {
    if (!isValidPackageId(packageId)) return false
    try {
      await stat(join(this.packagesRoot, packageId, 'manifest.json'))
      return true
    } catch {
      return false
    }
  }

  async list(): Promise<PackageManifest[]> {
    let names: string[]
    try {
      names = await readdir(this.packagesRoot)
    } catch {
      return []
    }

    const manifests: PackageManifest[] = []
    for (const name of names) {
      const manifest = await this.getManifest(name)
      if (manifest) manifests.push(manifest)
    }
    return manifests
  }

  async getManifest(packageId: string): Promise<PackageManifest | null> {
    if (!isValidPackageId(packageId)) return null
    const text = await readTextOrNull(join(this.packagesRoot, packageId, 'manifest.json'))
    if (text === null) return null

    let raw: unknown
    try {
      raw = JSON.parse(text)
    } catch {
      return null
    }

    const result = validateManifest(raw, packageId)
    return result.ok ? result.value : null
  }

  async readEntry(packageId: string): Promise<string | null> {
    const manifest = await this.getManifest(packageId)
    if (!manifest) return null
    return this.readPackageFile(packageId, manifest.entry)
  }

  async remove(packageId: string): Promise<void> {
    if (!isValidPackageId(packageId)) return
    await rm(join(this.packagesRoot, packageId), { recursive: true, force: true })
  }

  async readPackageFile(packageId: string, relativePath: string): Promise<string | null> {
    if (!isValidPackageId(packageId) || !isSafeRelative(relativePath)) return null
    return readTextOrNull(join(this.packagesRoot, packageId, relativePath))
  }
}

function isSafeRelative(path: string): boolean {
  return path.length > 0 && !isAbsolute(path) && !normalize(path).startsWith('..') && !path.includes('\\')
}

async function readTextOrNull(path: string): Promise<string | null> {
  try {
    return await readFile(path, 'utf8')
  } catch {
    return null
  }
}
