import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as History from '../js/core/history.js'

function historyOf(...newestFirst) {
  return newestFirst.reduceRight((acc, hex) => History.push(acc, hex), History.emptyHistory())
}

test('push adds newest first, dedupes and caps the size', () => {
  let h = historyOf('#000001', '#000002')
  h = History.push(h, '#000002')
  assert.deepEqual(h.items, ['#000002', '#000001'])
  for (let i = 0; i < 20; i += 1) h = History.push(h, `#0000${(i + 16).toString(16).toUpperCase()}`)
  assert.equal(h.items.length, History.HISTORY_LIMIT)
  assert.equal(h.cursor, 0)
})

test('undo and redo move the cursor without reordering', () => {
  let h = historyOf('#000003', '#000002', '#000001')
  assert.equal(History.canRedo(h), false)
  h = History.undo(h)
  assert.equal(History.current(h), '#000002')
  h = History.undo(h)
  assert.equal(History.current(h), '#000001')
  assert.equal(History.canUndo(h), false)
  assert.equal(History.undo(h), h, 'undo at the oldest entry is a no-op')
  h = History.redo(h)
  assert.equal(History.current(h), '#000002')
  assert.deepEqual(h.items, ['#000003', '#000002', '#000001'])
})

test('pushing after undo puts the new color at the front', () => {
  let h = History.undo(historyOf('#000002', '#000001'))
  h = History.push(h, '#000003')
  assert.deepEqual(h.items, ['#000003', '#000002', '#000001'])
  assert.equal(h.cursor, 0)
})

test('select ignores out-of-range indexes', () => {
  const h = historyOf('#000001')
  assert.equal(History.select(h, 5), h)
  assert.equal(History.select(h, -1), h)
})

test('sanitizeHistory keeps only valid unique colors from storage', () => {
  const h = History.sanitizeHistory(['#abc', '#AABBCC', 'nope', 42, '#123456', '<img>'])
  assert.deepEqual(h.items, ['#AABBCC', '#123456'])
  assert.deepEqual(History.sanitizeHistory('junk'), History.emptyHistory())
})
