// Random colors from crypto.getRandomValues. The byte source is injectable for tests.

import { hslToRgb } from './color.js'

export const MODES = Object.freeze(['any', 'balanced'])
export const DEFAULT_MODE = 'any'

// "Balanced" skips the muddy, near-black and near-white corners of the RGB cube.
export const BALANCED_RANGE = Object.freeze({
  saturation: [45, 85],
  lightness: [35, 70],
})

function cryptoBytes(length) {
  const bytes = new Uint8Array(length)
  globalThis.crypto.getRandomValues(bytes)
  return bytes
}

export function hasSecureRandom() {
  return typeof globalThis.crypto?.getRandomValues === 'function'
}

/** Uniform integer in [0, max), using rejection sampling to avoid modulo bias. */
export function randomInt(max, randomBytes = cryptoBytes) {
  if (!Number.isInteger(max) || max < 1 || max > 0xffff) throw new RangeError('max must be 1..65535')
  const limit = 0x10000 - (0x10000 % max)
  for (;;) {
    const [hi, lo] = randomBytes(2)
    const value = (hi << 8) | lo
    if (value < limit) return value % max
  }
}

/** Every 24-bit color equally likely. */
export function randomAnyColor(randomBytes = cryptoBytes) {
  const [r, g, b] = randomBytes(3)
  return { r, g, b }
}

/** Any hue, with saturation and lightness inside BALANCED_RANGE. */
export function randomBalancedColor(randomBytes = cryptoBytes) {
  const [sMin, sMax] = BALANCED_RANGE.saturation
  const [lMin, lMax] = BALANCED_RANGE.lightness
  return hslToRgb({
    h: randomInt(360, randomBytes),
    s: sMin + randomInt(sMax - sMin + 1, randomBytes),
    l: lMin + randomInt(lMax - lMin + 1, randomBytes),
  })
}

export function randomColor(mode = DEFAULT_MODE, randomBytes = cryptoBytes) {
  return mode === 'balanced' ? randomBalancedColor(randomBytes) : randomAnyColor(randomBytes)
}
