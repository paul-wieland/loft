export const PERMISSIONS = ['store', 'notify', 'clipboard.write'] as const

export type Permission = (typeof PERMISSIONS)[number]

export function isPermission(value: unknown): value is Permission {
  return typeof value === 'string' && (PERMISSIONS as readonly string[]).includes(value)
}
