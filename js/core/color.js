// Color conversions and WCAG contrast. Pure functions, no DOM, tested in Node.
// A color is an object { r, g, b } with integer channels from 0 to 255.

const HEX_PATTERN = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i

/** Parses "#1A2B3C", "1a2b3c", "#abc" or "abc". Returns { r, g, b } or null. */
export function parseHex(input) {
  if (typeof input !== 'string') return null
  const match = input.trim().match(HEX_PATTERN)
  if (!match) return null
  let digits = match[1]
  if (digits.length === 3) digits = [...digits].map((d) => d + d).join('')
  return {
    r: parseInt(digits.slice(0, 2), 16),
    g: parseInt(digits.slice(2, 4), 16),
    b: parseInt(digits.slice(4, 6), 16),
  }
}

/** Uppercase six-digit HEX, e.g. "#1A2B3C". */
export function toHex({ r, g, b }) {
  return '#' + [r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('').toUpperCase()
}

/** CSS Color 4 space-separated syntax, e.g. "rgb(26 43 60)". */
export function toRgbCss({ r, g, b }) {
  return `rgb(${r} ${g} ${b})`
}

/** HSL with h in degrees (0–359) and s, l in whole percent (0–100). */
export function rgbToHsl({ r, g, b }) {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const delta = max - min
  const l = (max + min) / 2

  let h = 0
  let s = 0
  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1))
    if (max === rn) h = ((gn - bn) / delta) % 6
    else if (max === gn) h = (bn - rn) / delta + 2
    else h = (rn - gn) / delta + 4
    h *= 60
    if (h < 0) h += 360
  }

  return {
    h: Math.round(h) % 360,
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  }
}

/** Inverse of rgbToHsl. Accepts fractional h, s, l; returns integer channels. */
export function hslToRgb({ h, s, l }) {
  const sn = s / 100
  const ln = l / 100
  const hn = (((h % 360) + 360) % 360) / 60
  const c = (1 - Math.abs(2 * ln - 1)) * sn
  const x = c * (1 - Math.abs((hn % 2) - 1))
  const m = ln - c / 2

  let rgb
  if (hn < 1) rgb = [c, x, 0]
  else if (hn < 2) rgb = [x, c, 0]
  else if (hn < 3) rgb = [0, c, x]
  else if (hn < 4) rgb = [0, x, c]
  else if (hn < 5) rgb = [x, 0, c]
  else rgb = [c, 0, x]

  const [r, g, b] = rgb.map((v) => Math.round((v + m) * 255))
  return { r, g, b }
}

/** e.g. "hsl(210 40% 17%)". */
export function toHslCss(color) {
  const { h, s, l } = rgbToHsl(color)
  return `hsl(${h} ${s}% ${l}%)`
}

/** WCAG 2.x relative luminance, 0 (black) to 1 (white). */
export function relativeLuminance({ r, g, b }) {
  const linear = (channel) => {
    const v = channel / 255
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b)
}

/** WCAG contrast ratio between two colors, from 1 to 21. */
export function contrastRatio(a, b) {
  const la = relativeLuminance(a)
  const lb = relativeLuminance(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

/**
 * WCAG level reached by text at this ratio:
 * "AAA" (7:1), "AA" (4.5:1), "AA-large" (3:1, large or bold text only) or "fail".
 */
export function wcagLevel(ratio) {
  if (ratio >= 7) return 'AAA'
  if (ratio >= 4.5) return 'AA'
  if (ratio >= 3) return 'AA-large'
  return 'fail'
}

export const WHITE = Object.freeze({ r: 255, g: 255, b: 255 })
export const BLACK = Object.freeze({ r: 0, g: 0, b: 0 })

/** White or black, whichever has the higher contrast on this background. */
export function bestTextColor(background) {
  return contrastRatio(background, WHITE) >= contrastRatio(background, BLACK) ? WHITE : BLACK
}

/** Rounds down to one decimal, so 4.49 never displays as a passing "4.5". */
export function formatRatio(ratio) {
  return (Math.floor(ratio * 10) / 10).toFixed(1)
}
