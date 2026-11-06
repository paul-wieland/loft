import { existsSync } from 'node:fs'
import { copyFile, mkdir, readdir, rm } from 'node:fs/promises'
import { join } from 'node:path'

import type { DataBackups } from '../../application/ports/data-backups'

const KEEP = 5

export class FileDataBackups implements DataBackups {
  constructor(
    private readonly dataRoot: string,
    private readonly backupsRoot: string,
  ) {}

  async snapshot(packageId: string): Promise<string | null> {
    const source = join(this.dataRoot, `${packageId}.db`)
    if (!existsSync(source)) return null

    const dir = join(this.backupsRoot, packageId)
    await mkdir(dir, { recursive: true })
    const target = join(dir, `${new Date().toISOString().replace(/[:.]/g, '-')}.db`)
    await copyFile(source, target)
    await this.prune(dir)
    return target
  }

  // Timestamped names sort oldest first, so the oldest copies are the ones to drop.
  private async prune(dir: string): Promise<void> {
    const files = (await readdir(dir)).filter((name) => name.endsWith('.db')).sort()
    for (const name of files.slice(0, Math.max(0, files.length - KEEP))) {
      await rm(join(dir, name), { force: true })
    }
  }
}
