// Color history: a newest-first list of HEX strings plus a cursor for undo/redo.
// Pure functions that return new state, so they are easy to test.

import { parseHex, toHex } from './color.js'

export const HISTORY_LIMIT = 12

/** @typedef {{ items: string[], cursor: number }} History */

export function emptyHistory() {
  return { items: [], cursor: 0 }
}

/** Rebuilds a history from untrusted storage, keeping only valid, unique colors. */
export function sanitizeHistory(raw) {
  if (!Array.isArray(raw)) return emptyHistory()
  const items = []
  for (const value of raw) {
    const color = parseHex(value)
    if (!color) continue
    const hex = toHex(color)
    if (!items.includes(hex)) items.push(hex)
    if (items.length === HISTORY_LIMIT) break
  }
  return { items, cursor: 0 }
}

/** Adds a color at the front (moving it if already present) and points the cursor at it. */
export function push(history, hex) {
  const items = [hex, ...history.items.filter((item) => item !== hex)].slice(0, HISTORY_LIMIT)
  return { items, cursor: 0 }
}

/** Points the cursor at an existing entry without reordering. */
export function select(history, index) {
  if (index < 0 || index >= history.items.length) return history
  return { items: history.items, cursor: index }
}

/** One step back in time (older color), or the same history when there is none. */
export function undo(history) {
  return select(history, history.cursor + 1)
}

/** One step forward in time (newer color). */
export function redo(history) {
  return select(history, history.cursor - 1)
}

export function current(history) {
  return history.items[history.cursor] ?? null
}

export function canUndo(history) {
  return history.cursor < history.items.length - 1
}

export function canRedo(history) {
  return history.cursor > 0
}
