import { describe, expect, it } from 'vitest'
import { applyToolOrder, moveTool } from '../../src/renderer/lib/tool-order'

describe('tool order', () => {
  it('sorts tools by the saved order and keeps unknown tools at the end', () => {
    const tools = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
    expect(applyToolOrder(tools, ['c', 'a']).map((t) => t.id)).toEqual(['c', 'a', 'b'])
  })

  it('moves a tool down to just after the target', () => {
    expect(moveTool(['a', 'b', 'c'], 'a', 'b')).toEqual(['b', 'a', 'c'])
  })

  it('moves a tool up to just before the target', () => {
    expect(moveTool(['a', 'b', 'c'], 'c', 'b')).toEqual(['a', 'c', 'b'])
  })

  it('does nothing when dropping a tool on itself or on an unknown id', () => {
    const order = ['a', 'b']
    expect(moveTool(order, 'a', 'a')).toBe(order)
    expect(moveTool(order, 'a', 'zzz')).toBe(order)
  })
})
