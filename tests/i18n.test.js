import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DICTIONARIES, detectLanguage, formatDecimal, normalizeLanguage, t } from '../js/i18n.js'

const ROOT = fileURLToPath(new URL('..', import.meta.url))

test('every language has the same keys', () => {
  const english = Object.keys(DICTIONARIES.en).sort()
  for (const [language, dictionary] of Object.entries(DICTIONARIES)) {
    assert.deepEqual(Object.keys(dictionary).sort(), english, language)
  }
})

test('every key used in index.html and app.js exists', async () => {
  const html = await readFile(join(ROOT, 'index.html'), 'utf8')
  const app = await readFile(join(ROOT, 'js/app.js'), 'utf8')
  const keys = new Set([
    ...[...html.matchAll(/data-i18n(?:-[a-z-]+)?="([^"]+)"/g)].map((m) => m[1]),
    ...[...app.matchAll(/\bt\('([^']+)'/g)].map((m) => m[1]),
  ])
  // Built dynamically in app.js from wcagLevel().
  for (const level of ['AAA', 'AA', 'AA-large']) keys.add(`level${level}`)
  assert.ok(keys.size > 20)
  for (const key of keys) assert.ok(Object.hasOwn(DICTIONARIES.en, key), `missing key ${key}`)
})

test('language detection', () => {
  assert.equal(normalizeLanguage('pt-PT'), 'pt-BR')
  assert.equal(normalizeLanguage('en-GB'), 'en')
  assert.equal(normalizeLanguage('fr'), null)
  assert.equal(detectLanguage(undefined, ['fr-FR', 'pt-BR']), 'pt-BR')
  assert.equal(detectLanguage('en', ['pt-BR']), 'en')
  assert.equal(detectLanguage(undefined, ['de']), 'en')
})

test('t interpolates and falls back', () => {
  assert.equal(t('historyRestore', { hex: '#ABC' }, 'en'), 'Restore #ABC')
  assert.equal(t('historyRestore', { hex: '#ABC' }, 'pt-BR'), 'Restaurar #ABC')
  assert.equal(t('no-such-key', {}, 'pt-BR'), 'no-such-key')
})

test('decimal separator follows the language', () => {
  assert.equal(formatDecimal('4.5', 'en'), '4.5')
  assert.equal(formatDecimal('4.5', 'pt-BR'), '4,5')
})
