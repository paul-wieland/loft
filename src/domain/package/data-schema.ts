import { isRecord } from '../shared/guards'
import { err, ok, type Result } from '../shared/result'

export const FIELD_TYPES = ['string', 'number', 'boolean', 'date'] as const

export type FieldType = (typeof FIELD_TYPES)[number]

export interface FieldDefinition {
  type: FieldType
  required?: boolean
  default?: string | number | boolean
}

export interface CollectionDefinition {
  fields: Record<string, FieldDefinition>
}

export const DEFAULT_SCHEMA_VERSION = 1

export interface DataSchema {
  schemaVersion: number
  collections: Record<string, CollectionDefinition>
}

const COLLECTION_NAME = /^[a-z][a-zA-Z0-9]{0,39}$/
const RESERVED_FIELDS = ['id', 'createdAt', 'updatedAt']

export function validateDataSchema(raw: unknown): Result<DataSchema, string[]> {
  if (!isRecord(raw) || !isRecord(raw.collections)) {
    return err(['schema must have a "collections" object'])
  }

  const errors: string[] = []

  for (const [name, collection] of Object.entries(raw.collections)) {
    if (!COLLECTION_NAME.test(name)) {
      errors.push(`collection "${name}" must be camelCase and start with a letter`)
    }

    if (!isRecord(collection) || !isRecord(collection.fields)) {
      errors.push(`collection "${name}" must have a "fields" object`)
      continue
    }

    for (const [field, definition] of Object.entries(collection.fields)) {
      const label = `${name}.${field}`

      if (RESERVED_FIELDS.includes(field)) {
        errors.push(`field "${label}" uses a reserved name`)
      }

      if (!isRecord(definition) || !isFieldType(definition.type)) {
        errors.push(`field "${label}" has an unknown type`)
        continue
      }

      if (definition.required !== undefined && typeof definition.required !== 'boolean') {
        errors.push(`field "${label}" has a non-boolean "required"`)
      }

      if (definition.default !== undefined && !matchesType(definition.default, definition.type)) {
        errors.push(`field "${label}" has a default that does not match type "${definition.type}"`)
      }
    }
  }

  const schemaVersion = raw.schemaVersion ?? DEFAULT_SCHEMA_VERSION
  if (typeof schemaVersion !== 'number' || !Number.isInteger(schemaVersion) || schemaVersion < 1) {
    errors.push('schemaVersion must be a positive integer')
  }

  return errors.length > 0 ? err(errors) : ok({ ...(raw as unknown as Omit<DataSchema, 'schemaVersion'>), schemaVersion: schemaVersion as number })
}

function isFieldType(value: unknown): value is FieldType {
  return typeof value === 'string' && (FIELD_TYPES as readonly string[]).includes(value)
}

function matchesType(value: unknown, type: FieldType): boolean {
  switch (type) {
    case 'string':
    case 'date':
      return typeof value === 'string'
    case 'number':
      return typeof value === 'number'
    case 'boolean':
      return typeof value === 'boolean'
  }
}
