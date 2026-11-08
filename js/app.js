;(function () {
  'use strict'

  const THEME_KEY = 'colorgen:theme'
  const TOAST_MS = 2200

  const root = document.documentElement
  const swatch = document.getElementById('swatch')
  const swatchCaption = document.getElementById('swatch-caption')
  const hexValue = document.getElementById('hex-value')
  const rgbR = document.getElementById('rgb-r')
  const rgbG = document.getElementById('rgb-g')
  const rgbB = document.getElementById('rgb-b')
  const rgbCss = document.getElementById('rgb-css')
  const generateBtn = document.getElementById('generate-btn')
  const themeToggle = document.getElementById('theme-toggle')
  const toast = document.getElementById('toast')
  const announcer = document.getElementById('announcer')

  let current = null
  let toastTimer = 0

  // ---------- Color ----------

  // Three random bytes = one uniformly random 24-bit color.
  function randomColor() {
    const bytes = new Uint8Array(3)
    crypto.getRandomValues(bytes)
    return { r: bytes[0], g: bytes[1], b: bytes[2] }
  }

  function toHex({ r, g, b }) {
    return '#' + [r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('').toUpperCase()
  }

  function toRgbCss({ r, g, b }) {
    return `rgb(${r} ${g} ${b})`
  }

  function render(color) {
    current = color
    const hex = toHex(color)

    swatch.style.backgroundColor = hex
    swatch.setAttribute('aria-label', `Color preview: ${hex}`)
    swatchCaption.textContent = hex
    hexValue.textContent = hex
    rgbR.textContent = color.r
    rgbG.textContent = color.g
    rgbB.textContent = color.b
    rgbCss.textContent = toRgbCss(color)
  }

  function generate({ announce }) {
    render(randomColor())
    if (announce) {
      announcer.textContent = `New color ${toHex(current)}`
    }
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
    } catch (e) {
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
      } catch (e) {
        // Permission denied or document not focused: try the fallback.
      }
    }
    return legacyCopy(text)
  }

  async function handleCopy(button) {
    if (!current) return
    const kind = button.dataset.copy
    const text = kind === 'hex' ? toHex(current) : toRgbCss(current)
    const ok = await copyText(text)

    if (ok) {
      showToast('Copied ', text)
      button.classList.add('is-copied')
      setTimeout(() => button.classList.remove('is-copied'), TOAST_MS)
    } else {
      showToast("Couldn't copy. Select the value and copy it manually.")
    }
  }

  // ---------- Toast ----------

  function showToast(message, value) {
    clearTimeout(toastTimer)
    toast.textContent = message
    if (value) {
      const code = document.createElement('code')
      code.textContent = value
      toast.appendChild(code)
    }
    toast.hidden = false
    toastTimer = setTimeout(() => {
      toast.hidden = true
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
    const label = theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'
    themeToggle.setAttribute('aria-label', label)
    themeToggle.title = label
  }

  function toggleTheme() {
    const next = effectiveTheme() === 'dark' ? 'light' : 'dark'
    root.setAttribute('data-theme', next)
    try {
      localStorage.setItem(THEME_KEY, next)
    } catch (e) {
      // Storage unavailable: the choice lasts for this visit only.
    }
    syncThemeToggle()
  }

  // ---------- Wire up ----------

  generateBtn.addEventListener('click', () => generate({ announce: true }))
  document.querySelectorAll('[data-copy]').forEach((button) => {
    button.addEventListener('click', () => handleCopy(button))
  })
  themeToggle.addEventListener('click', toggleTheme)
  darkQuery.addEventListener('change', syncThemeToggle)

  syncThemeToggle()
  generate({ announce: false })
})()
