import { cp, lstat, mkdir, readdir, readFile, readlink, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'

import type { StagingArea } from '../../application/ports/staging-area'

export class FileStagingArea implements StagingArea {
  constructor(
    private readonly stagingRoot: string,
    private readonly packagesRoot: string,
  ) {}

  async prepare(requestId: string, spec: string, basePackageId?: string): Promise<void> {
    if (basePackageId) {
      await rm(this.packageDir(requestId), { recursive: true, force: true })
      await mkdir(join(this.stagingRoot, requestId), { recursive: true })
      await cp(join(this.packagesRoot, basePackageId), this.packageDir(requestId), { recursive: true })
    } else {
      await mkdir(this.packageDir(requestId), { recursive: true })
    }
    await writeFile(join(this.stagingRoot, requestId, 'spec.md'), spec)
  }

  async readFile(requestId: string, relativePath: string): Promise<string | null> {
    try {
      return await readFile(this.filePath(requestId, relativePath), 'utf8')
    } catch (error) {
      if (isNotFound(error)) return null
      throw error
    }
  }

  async exists(requestId: string, relativePath: string): Promise<boolean> {
    try {
      await stat(this.filePath(requestId, relativePath))
      return true
    } catch {
      return false
    }
  }

  async listFiles(requestId: string): Promise<string[]> {
    const root = this.packageDir(requestId)
    const files = await this.walk(root).catch(() => [])
    return files.map((file) => relative(root, file).split('\\').join('/'))
  }

  async hasExternalSymlinks(requestId: string): Promise<boolean> {
    const root = this.packageDir(requestId)
    for (const file of await this.walk(root).catch(() => [])) {
      const info = await lstat(file)
      if (!info.isSymbolicLink()) continue
      const target = resolve(dirname(file), await readlink(file))
      if (!isInside(root, target)) return true
    }
    return false
  }

  async promote(requestId: string, packageId: string): Promise<void> {
    const target = join(this.packagesRoot, packageId)
    await mkdir(this.packagesRoot, { recursive: true })
    await rm(target, { recursive: true, force: true })
    await cp(this.packageDir(requestId), target, { recursive: true })
    await this.discard(requestId)
  }

  async discard(requestId: string): Promise<void> {
    await rm(join(this.stagingRoot, requestId), { recursive: true, force: true })
  }

  private packageDir(requestId: string): string {
    return join(this.stagingRoot, requestId, 'package')
  }

  private filePath(requestId: string, relativePath: string): string {
    return join(this.packageDir(requestId), relativePath)
  }

  private async walk(dir: string): Promise<string[]> {
    const entries = await readdir(dir, { withFileTypes: true })
    const files: string[] = []
    for (const entry of entries) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) files.push(...(await this.walk(full)))
      else files.push(full)
    }
    return files
  }
}

function isInside(root: string, target: string): boolean {
  const rel = relative(root, target)
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel))
}

function isNotFound(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT'
}
