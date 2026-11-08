// Entry point: wires the DOM to the color, history, i18n and storage modules.

import {
  BLACK,
  WHITE,
  contrastRatio,
  formatRatio,
  parseHex,
  rgbToHsl,
  toHex,
  toHslCss,
  toRgbCss,
  wcagLevel,
} from './core/color.js'
import * as History from './core/history.js'
import { DEFAULT_MODE, MODES, hasSecureRandom, randomColor } from './core/random.js'
import { LANGUAGE_CHANGE_EVENT, detectLanguage, formatDecimal, getLanguage, setLanguage, t } from './i18n.js'
import { loadPrefs, savePrefs } from './storage.js'

const TOAST_MS = 2200

const $ = (id) => document.getElementById(id)

const root = document.documentElement
const el = {
  stage: document.querySelector('.stage'),
  swatch: $('swatch'),
  hexInput: $('hex-input'),
  hexError: $('hex-error'),
  rgb: [$('rgb-r'), $('rgb-g'), $('rgb-b')],
  hsl: [$('hsl-h'), $('hsl-s'), $('hsl-l')],
  cssPreview: $('css-preview'),
  whiteRatio: $('contrast-white-ratio'),
  whiteLevel: $('contrast-white-level'),
  blackRatio: $('contrast-black-ratio'),
  blackLevel: $('contrast-black-level'),
  modeInputs: document.querySelectorAll('input[name="mode"]'),
  modeHint: $('mode-hint'),
  generateBtn: $('generate-btn'),
  historyList: $('history-list'),
  historyEmpty: $('history-empty'),
  undoBtn: $('undo-btn'),
  redoBtn: $('redo-btn'),
  clearBtn: $('clear-history-btn'),
  themeToggle: $('theme-toggle'),
  langButtons: document.querySelectorAll('[data-lang]'),
  themeColor: document.querySelector('meta[name="theme-color"]'),
  toast: $('toast'),
  announcer: $('announcer'),
  cryptoError: $('crypto-error'),
}

const state = {
  color: null,
  mode: DEFAULT_MODE,
  history: History.emptyHistory(),
}

let toastTimer = 0

// ---------- Rendering ----------

function renderColor() {
  const color = state.color
  if (!color) return
  const hex = toHex(color)
  const hsl = rgbToHsl(color)

  el.swatch.style.backgroundColor = hex
  el.swatch.setAttribute('aria-label', t('swatchLabel', { hex }))
  el.stage.style.setProperty('--current', hex)
  el.themeColor?.setAttribute('content', hex)

  // Never overwrite what the user is typing.
  if (document.activeElement !== el.hexInput) el.hexInput.value = hex

  el.rgb[0].textContent = color.r
  el.rgb[1].textContent = color.g
  el.rgb[2].textContent = color.b
  el.hsl[0].textContent = `${hsl.h}°`
  el.hsl[1].textContent = `${hsl.s}%`
  el.hsl[2].textContent = `${hsl.l}%`
  el.cssPreview.textContent = `${toRgbCss(color)} · ${toHslCss(color)}`

  renderContrast(color)
}

function renderContrast(color) {
  const rows = [
    [WHITE, el.whiteRatio, el.whiteLevel],
    [BLACK, el.blackRatio, el.blackLevel],
  ]
  for (const [text, ratioEl, levelEl] of rows) {
    const ratio = contrastRatio(color, text)
    const level = wcagLevel(ratio)
    ratioEl.textContent = `${formatDecimal(formatRatio(ratio))}:1`
    levelEl.dataset.level = level
    levelEl.textContent = t(level === 'fail' ? 'levelFail' : `level${level}`)
  }
}

function renderHistory() {
  const { items, cursor } = state.history
  const buttons = items.map((hex, index) => {
    const item = document.createElement('li')
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'history-item'
    button.dataset.index = String(index)
    button.style.backgroundColor = hex
    button.setAttribute('aria-label', t('historyRestore', { hex }))
    button.title = hex
    if (index === cursor) button.setAttribute('aria-current', 'true')
    item.appendChild(button)
    return item
  })
  el.historyList.replaceChildren(...buttons)
  el.historyEmpty.hidden = items.length > 0
  el.undoBtn.disabled = !History.canUndo(state.history)
  el.redoBtn.disabled = !History.canRedo(state.history)
  el.clearBtn.disabled = items.length <= 1
}

function renderModeHint() {
  el.modeHint.textContent = t(state.mode === 'balanced' ? 'modeBalancedHint' : 'modeAnyHint')
}

// ---------- State changes ----------

function saveHistory() {
  savePrefs({ history: state.history.items })
}

/** Shows a color and records it as the newest history entry. */
function commitColor(color, { announce = false } = {}) {
  state.color = color
  state.history = History.push(state.history, toHex(color))
  saveHistory()
  renderColor()
  renderHistory()
  if (announce) el.announcer.textContent = t('newColorAnnounce', { hex: toHex(color) })
}

/** Moves to an existing history entry without reordering the list. */
function showHistoryEntry(history) {
  if (history === state.history) return
  state.history = history
  state.color = parseHex(History.current(history))
  setHexError(false)
  renderColor()
  renderHistory()
  el.announcer.textContent = t('newColorAnnounce', { hex: toHex(state.color) })
}

function generate() {
  if (!hasSecureRandom()) return
  commitColor(randomColor(state.mode), { announce: true })
}

function setHexError(visible) {
  el.hexError.hidden = !visible
  if (visible) el.hexInput.setAttribute('aria-invalid', 'true')
  else el.hexInput.removeAttribute('aria-invalid')
}

// ---------- Copy ----------

// Fallback for browsers or contexts without the async Clipboard API.
function legacyCopy(text) {
  const area = document.createElement('textarea')
  area.value = text
  area.setAttribute('readonly', '')
  area.className = 'visually-hidden'
  document.body.appendChild(area)
  area.select()
  let ok = false
  try {
    ok = document.execCommand('copy')
  } catch {
    ok = false
  }
  area.remove()
  return ok
}

async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // Permission denied or document not focused: try the fallback.
    }
  }
  return legacyCopy(text)
}

const FORMATTERS = { hex: toHex, rgb: toRgbCss, hsl: toHslCss }

async function copy(kind, button) {
  if (!state.color) return
  const text = FORMATTERS[kind](state.color)
  if (await copyText(text)) {
    showToast(t('copied'), text)
    if (button) {
      button.classList.add('is-copied')
      setTimeout(() => button.classList.remove('is-copied'), TOAST_MS)
    }
  } else {
    showToast(t('copyFailed'))
  }
}

// ---------- Toast ----------

function showToast(message, value) {
  clearTimeout(toastTimer)
  el.toast.textContent = message
  if (value) {
    const code = document.createElement('code')
    code.textContent = value
    el.toast.append(' ', code)
  }
  el.toast.hidden = false
  toastTimer = setTimeout(() => {
    el.toast.hidden = true
  }, TOAST_MS)
}

// ---------- Theme ----------

const darkQuery = window.matchMedia('(prefers-color-scheme: dark)')

function effectiveTheme() {
  const explicit = root.getAttribute('data-theme')
  if (explicit === 'light' || explicit === 'dark') return explicit
  return darkQuery.matches ? 'dark' : 'light'
}

function syncThemeToggle() {
  const theme = effectiveTheme()
  root.setAttribute('data-theme-effective', theme)
  const label = t(theme === 'dark' ? 'themeToLight' : 'themeToDark')
  el.themeToggle.setAttribute('aria-label', label)
  el.themeToggle.title = label
}

function toggleTheme() {
  const next = effectiveTheme() === 'dark' ? 'light' : 'dark'
  root.setAttribute('data-theme', next)
  savePrefs({ theme: next })
  syncThemeToggle()
}

// ---------- Keyboard shortcuts ----------

function isEditable(target) {
  return target instanceof HTMLElement && (target.isContentEditable || target.matches('input, textarea, select'))
}

function onKeydown(event) {
  if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || event.repeat) return
  const target = event.target
  if (isEditable(target)) return

  if (event.code === 'Space') {
    // Space already activates a focused button or link; don't double-fire.
    if (target instanceof HTMLElement && target.closest('button, a, label, [role="button"]')) return
    event.preventDefault()
    generate()
    return
  }

  const key = event.key.toLowerCase()
  if (key === 'c') {
    copy('hex', document.querySelector('[data-copy="hex"]'))
  } else if (key === 'z') {
    showHistoryEntry(event.shiftKey ? History.redo(state.history) : History.undo(state.history))
  }
}

// ---------- Language ----------

function syncLanguageButtons() {
  const language = getLanguage()
  for (const button of el.langButtons) {
    button.setAttribute('aria-pressed', String(button.dataset.lang === language))
  }
}

function onLanguageChange() {
  syncLanguageButtons()
  syncThemeToggle()
  renderModeHint()
  renderColor()
  renderHistory()
}

// ---------- Offline ----------

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return
  const isLocal = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)
  // Off on localhost so edits show up immediately. Add ?sw to test offline mode locally.
  if (isLocal && !new URLSearchParams(location.search).has('sw')) return
  navigator.serviceWorker.register('./sw.js').catch(() => {
    // Offline support is optional; the app works without it.
  })
}

// ---------- Wire up ----------

function bindEvents() {
  el.generateBtn.addEventListener('click', generate)

  for (const button of document.querySelectorAll('[data-copy]')) {
    button.addEventListener('click', () => copy(button.dataset.copy, button))
  }

  // Typing previews the color; committing (Enter or leaving the field) adds it to history.
  el.hexInput.addEventListener('input', () => {
    const color = parseHex(el.hexInput.value)
    if (!color) return
    setHexError(false)
    state.color = color
    renderColor()
  })
  el.hexInput.addEventListener('change', () => {
    const color = parseHex(el.hexInput.value)
    if (!color) {
      setHexError(true)
      return
    }
    setHexError(false)
    el.hexInput.value = toHex(color)
    commitColor(color)
  })
  el.hexInput.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      // Revert to the last committed color.
      showHistoryEntry({ ...state.history })
      el.hexInput.value = toHex(state.color)
      el.hexInput.select()
    }
  })

  for (const input of el.modeInputs) {
    input.addEventListener('change', () => {
      state.mode = input.value
      savePrefs({ mode: state.mode })
      renderModeHint()
    })
  }

  el.historyList.addEventListener('click', (event) => {
    const button = event.target.closest('.history-item')
    if (button) showHistoryEntry(History.select(state.history, Number(button.dataset.index)))
  })
  el.undoBtn.addEventListener('click', () => showHistoryEntry(History.undo(state.history)))
  el.redoBtn.addEventListener('click', () => showHistoryEntry(History.redo(state.history)))
  el.clearBtn.addEventListener('click', () => {
    // Keep the color on screen as the only entry.
    state.history = History.push(History.emptyHistory(), toHex(state.color))
    saveHistory()
    renderHistory()
    showToast(t('historyCleared'))
  })

  el.themeToggle.addEventListener('click', toggleTheme)
  darkQuery.addEventListener('change', syncThemeToggle)

  for (const button of el.langButtons) {
    button.addEventListener('click', () => setLanguage(button.dataset.lang))
  }
  document.addEventListener(LANGUAGE_CHANGE_EVENT, onLanguageChange)
  document.addEventListener('keydown', onKeydown)
}

function init() {
  const prefs = loadPrefs()
  state.mode = MODES.includes(prefs.mode) ? prefs.mode : DEFAULT_MODE
  state.history = History.sanitizeHistory(prefs.history)
  for (const input of el.modeInputs) input.checked = input.value === state.mode

  bindEvents()
  // Detected (not chosen) languages are not persisted, so a browser change still applies.
  setLanguage(detectLanguage(prefs.language), { persist: false })

  if (!hasSecureRandom()) {
    el.cryptoError.hidden = false
    el.generateBtn.disabled = true
    return
  }

  generate()
  el.announcer.textContent = ''
  registerServiceWorker()
}

init()
