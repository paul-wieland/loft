// Sidebar order of tools. Tools missing from the saved order keep their install order at the end.
const STORAGE_KEY = 'workplace-tool-order'

export function applyToolOrder<T extends { id: string }>(items: T[], order: string[]): T[] {
  const rank = new Map(order.map((id, index) => [id, index]))
  return [...items].sort((a, b) => (rank.get(a.id) ?? order.length) - (rank.get(b.id) ?? order.length))
}

// Places fromId where toId is: after it when moving down, before it when moving up.
export function moveTool(order: string[], fromId: string, toId: string): string[] {
  const from = order.indexOf(fromId)
  const to = order.indexOf(toId)
  if (from < 0 || to < 0 || from === to) return order
  const next = [...order]
  next.splice(from, 1)
  next.splice(to, 0, fromId)
  return next
}

export function loadToolOrder(): string[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []
  } catch {
    return []
  }
}

export function saveToolOrder(order: string[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(order))
  } catch {
    // Storage can be unavailable; the order then lasts for this session only.
  }
}
