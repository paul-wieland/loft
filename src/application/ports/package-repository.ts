import type { PackageManifest } from '../../domain/package/manifest'

export interface PackageRepository {
  isInstalled(packageId: string): Promise<boolean>
  list(): Promise<PackageManifest[]>
  getManifest(packageId: string): Promise<PackageManifest | null>
  readEntry(packageId: string): Promise<string | null>
  readPackageFile(packageId: string, relativePath: string): Promise<string | null>
  remove(packageId: string): Promise<void>
}
