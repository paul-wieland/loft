import { createHash } from 'node:crypto'

import type { CatalogTool } from '../../application/marketplace/catalog'

// The tools repository is public, so the catalog and the tool files are read from its raw file URLs.
export const CATALOG_URL = 'https://raw.githubusercontent.com/paul-wieland/loft-tools/main/catalog.json'

export async function fetchCatalog(): Promise<unknown> {
  const response = await fetch(CATALOG_URL)
  if (!response.ok) throw new Error(`the catalog could not be loaded (${response.status})`)
  return response.json()
}

// Downloads every file the catalog lists for a tool and checks each checksum before any of them is used.
export async function fetchToolFiles(tool: CatalogTool): Promise<Record<string, string>> {
  const base = CATALOG_URL.slice(0, CATALOG_URL.lastIndexOf('/') + 1) + `${tool.id}/`
  const files: Record<string, string> = {}
  for (const file of tool.files) {
    const response = await fetch(base + file.path)
    if (!response.ok) throw new Error(`${file.path} could not be downloaded (${response.status})`)
    const text = await response.text()
    if (createHash('sha256').update(text).digest('hex') !== file.sha256) {
      throw new Error(`${file.path} does not match the catalog checksum`)
    }
    files[file.path] = text
  }
  return files
}
