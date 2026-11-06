import { err, ok, type Result } from '../../domain/shared/result'
import type { DataStore } from '../ports/data-store'
import type { PackageRepository } from '../ports/package-repository'

export interface UninstallInput {
  packageId: string
  deleteData: boolean
}

export class UninstallPackage {
  constructor(
    private readonly packages: PackageRepository,
    private readonly store: DataStore,
  ) {}

  async execute(input: UninstallInput): Promise<Result<void, string>> {
    if (!(await this.packages.isInstalled(input.packageId))) {
      return err('This tool is not installed')
    }

    await this.packages.remove(input.packageId)
    if (input.deleteData) await this.store.deleteStore(input.packageId)
    return ok(undefined)
  }
}
