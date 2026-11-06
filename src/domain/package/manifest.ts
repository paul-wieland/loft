import { isPermission, type Permission } from '../permissions/permissions'
import { isRecord } from '../shared/guards'
import { err, ok, type Result } from '../shared/result'
import { isValidPackageId } from './package-id'

export const CONTRACT_VERSION = 1

const SEMVER = /^\d+\.\d+\.\d+$/

export type HomeCardSize = 'small' | 'wide'

export interface HomeCard {
  size: HomeCardSize
}

export interface PackageManifest {
  id: string
  name: string
  version: string
  icon: string
  description?: string
  entry: string
  permissions: Permission[]
  contractVersion: number
  homeCard?: HomeCard
}

export function validateManifest(raw: unknown, folderName: string): Result<PackageManifest, string[]> {
  if (!isRecord(raw)) return err(['manifest must be a JSON object'])

  const errors: string[] = []
  const { id, name, version, icon, description, entry, permissions, contractVersion, homeCard } = raw

  if (typeof id !== 'string' || !isValidPackageId(id)) {
    errors.push('id must be kebab-case, 3 to 40 characters')
  } else if (id !== folderName) {
    errors.push(`id "${id}" must match folder name "${folderName}"`)
  }

  if (typeof name !== 'string' || name.length < 1 || name.length > 40) {
    errors.push('name must be 1 to 40 characters')
  }

  if (typeof version !== 'string' || !SEMVER.test(version)) {
    errors.push('version must be a semantic version')
  }

  if (typeof icon !== 'string' || icon.length === 0) {
    errors.push('icon is required')
  }

  if (description !== undefined && (typeof description !== 'string' || description.length > 200)) {
    errors.push('description must be at most 200 characters')
  }

  if (typeof entry !== 'string' || !isSafeRelativePath(entry)) {
    errors.push('entry must be a relative path inside the package')
  }

  if (!Array.isArray(permissions)) {
    errors.push('permissions must be an array')
  } else {
    const invalid = permissions.filter((permission) => !isPermission(permission))
    if (invalid.length > 0) errors.push(`unknown permissions: ${invalid.map(String).join(', ')}`)
  }

  if (typeof contractVersion !== 'number' || !Number.isInteger(contractVersion) || contractVersion < 1) {
    errors.push('contractVersion must be a positive integer')
  } else if (contractVersion > CONTRACT_VERSION) {
    errors.push(`contractVersion ${contractVersion} is newer than supported version ${CONTRACT_VERSION}`)
  }

  if (homeCard !== undefined && !isHomeCard(homeCard)) {
    errors.push('homeCard must be { "size": "small" | "wide" }')
  }

  if (errors.length > 0) return err(errors)

  return ok({
    id: id as string,
    name: name as string,
    version: version as string,
    icon: icon as string,
    description: description as string | undefined,
    entry: entry as string,
    permissions: permissions as Permission[],
    contractVersion: contractVersion as number,
    homeCard: homeCard as HomeCard | undefined,
  })
}

function isSafeRelativePath(path: string): boolean {
  return (
    path.length > 0 &&
    !path.startsWith('/') &&
    !path.includes('\\') &&
    !path.split('/').includes('..')
  )
}

function isHomeCard(value: unknown): value is HomeCard {
  return isRecord(value) && (value.size === 'small' || value.size === 'wide')
}
