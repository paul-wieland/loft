import type { PackageManifest } from '../../domain/package/manifest'
import type { PackageRepository } from '../ports/package-repository'

export class ListPackages {
  constructor(private readonly packages: PackageRepository) {}

  execute(): Promise<PackageManifest[]> {
    return this.packages.list()
  }
}
