import { describe, expect, it } from 'vitest'
import { validateDataSchema } from '../../../src/domain/package/data-schema'

describe('validateDataSchema', () => {
  it('accepts a schema with typed fields', () => {
    const schema = {
      collections: {
        tasks: {
          fields: {
            title: { type: 'string', required: true },
            dueDate: { type: 'date' },
            done: { type: 'boolean', default: false },
          },
        },
      },
    }
    expect(validateDataSchema(schema).ok).toBe(true)
  })

  it('rejects unknown field types', () => {
    const result = validateDataSchema({ collections: { tasks: { fields: { x: { type: 'blob' } } } } })
    expect(result).toEqual({ ok: false, error: ['field "tasks.x" has an unknown type'] })
  })

  it('rejects reserved field names', () => {
    const result = validateDataSchema({ collections: { tasks: { fields: { id: { type: 'string' } } } } })
    expect(result).toEqual({ ok: false, error: ['field "tasks.id" uses a reserved name'] })
  })

  it('rejects a default that does not match the field type', () => {
    const result = validateDataSchema({
      collections: { tasks: { fields: { done: { type: 'boolean', default: 'no' } } } },
    })
    expect(result.ok).toBe(false)
  })
})
