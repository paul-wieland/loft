export interface StagingArea {
  prepare(requestId: string, spec: string, basePackageId?: string): Promise<void>
  readFile(requestId: string, relativePath: string): Promise<string | null>
  exists(requestId: string, relativePath: string): Promise<boolean>
  listFiles(requestId: string): Promise<string[]>
  hasExternalSymlinks(requestId: string): Promise<boolean>
  setIcon(requestId: string, icon: string): Promise<void>
  writeFile(requestId: string, relativePath: string, content: string): Promise<void>
  promote(requestId: string, packageId: string): Promise<void>
  discard(requestId: string): Promise<void>
}
