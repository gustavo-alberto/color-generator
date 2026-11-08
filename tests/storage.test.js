import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

class MemoryStorage {
  #data = new Map()
  getItem(key) {
    return this.#data.has(key) ? this.#data.get(key) : null
  }
  setItem(key, value) {
    this.#data.set(key, String(value))
  }
  clear() {
    this.#data.clear()
  }
}

const storage = new MemoryStorage()
Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true })
const { STORAGE_KEY, loadPrefs, savePrefs } = await import('../js/storage.js')

beforeEach(() => storage.clear())

test('saves and merges allowed keys only', () => {
  savePrefs({ theme: 'dark', evil: 'x' })
  savePrefs({ history: ['#ABCDEF'] })
  assert.deepEqual(loadPrefs(), { theme: 'dark', history: ['#ABCDEF'] })
})

test('corrupt storage reads as empty', () => {
  storage.setItem(STORAGE_KEY, '{not json')
  assert.deepEqual(loadPrefs(), {})
  storage.setItem(STORAGE_KEY, '[1,2]')
  assert.deepEqual(loadPrefs(), {})
})

test('theme-init.js reads the same storage key', async () => {
  const source = await readFile(new URL('../js/theme-init.js', import.meta.url), 'utf8')
  assert.ok(source.includes(STORAGE_KEY))
})
