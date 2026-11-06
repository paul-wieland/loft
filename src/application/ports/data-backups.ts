export interface DataBackups {
  // Copies the package's database aside before it is replaced. Returns the copy's path, or null when there is nothing to copy.
  snapshot(packageId: string): Promise<string | null>
}
