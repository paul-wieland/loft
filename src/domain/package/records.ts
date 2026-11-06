import { err, ok, type Result } from '../shared/result'
import { isRecord } from '../shared/guards'
import type { CollectionDefinition, FieldDefinition } from './data-schema'

export type RecordValue = string | number | boolean
export type RecordData = Record<string, RecordValue>

export function validateRecord(
  collection: CollectionDefinition,
  input: unknown,
  mode: 'create' | 'update',
): Result<RecordData, string[]> {
  if (!isRecord(input)) return err(['record must be an object'])

  const errors: string[] = []
  const data: RecordData = {}

  for (const [name, value] of Object.entries(input)) {
    if (!Object.hasOwn(collection.fields, name)) {
      errors.push(`unknown field "${name}"`)
      continue
    }
    const field = collection.fields[name] as FieldDefinition
    if (!matchesField(value, field)) {
      errors.push(`field "${name}" must be a ${field.type}`)
      continue
    }
    data[name] = value
  }

  if (mode === 'create') {
    for (const [name, field] of Object.entries(collection.fields)) {
      if (data[name] !== undefined) continue
      if (field.default !== undefined) data[name] = field.default
      else if (field.required) errors.push(`field "${name}" is required`)
    }
  }

  return errors.length > 0 ? err(errors) : ok(data)
}

function matchesField(value: unknown, field: FieldDefinition): value is RecordValue {
  switch (field.type) {
    case 'string':
      return typeof value === 'string'
    case 'number':
      return typeof value === 'number' && Number.isFinite(value)
    case 'boolean':
      return typeof value === 'boolean'
    case 'date':
      return typeof value === 'string' && !Number.isNaN(Date.parse(value))
  }
}
