export const PACKAGE_ID_PATTERN = /^[a-z][a-z0-9-]{2,39}$/

export function isValidPackageId(id: string): boolean {
  return PACKAGE_ID_PATTERN.test(id)
}

export function derivePackageId(spec: string, suffix: string): string {
  const words = spec
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .slice(0, 3)
  let base = words.join('-') || 'tool'
  if (!/^[a-z]/.test(base)) base = `tool-${base}`
  return `${base.slice(0, 31)}-${suffix}`
}
