import { test } from 'node:test'
import assert from 'node:assert/strict'
import { rgbToHsl } from '../js/core/color.js'
import { BALANCED_RANGE, randomAnyColor, randomBalancedColor, randomColor, randomInt } from '../js/core/random.js'

/** Byte source that replays a fixed sequence. */
function sequence(...values) {
  let i = 0
  return (length) => Uint8Array.from({ length }, () => values[i++ % values.length])
}

test('randomAnyColor maps three bytes to r, g, b', () => {
  assert.deepEqual(randomAnyColor(sequence(1, 2, 3)), { r: 1, g: 2, b: 3 })
})

test('randomInt redraws values in the biased tail', () => {
  // 0xffff is above the largest multiple of 360 below 65536, so it is rejected.
  assert.equal(randomInt(360, sequence(0xff, 0xff, 0x00, 0x05)), 5)
  assert.throws(() => randomInt(0))
  assert.throws(() => randomInt(70000))
})

test('randomInt is roughly uniform (chi-square)', () => {
  const buckets = 10
  const draws = 20000
  const counts = new Array(buckets).fill(0)
  for (let i = 0; i < draws; i += 1) counts[randomInt(buckets)] += 1
  const expected = draws / buckets
  const chi = counts.reduce((sum, n) => sum + (n - expected) ** 2 / expected, 0)
  // 9 degrees of freedom: p = 0.001 at 27.88.
  assert.ok(chi < 27.88, `chi-square ${chi.toFixed(2)}`)
})

test('balanced colors stay inside the saturation and lightness range', () => {
  const [sMin, sMax] = BALANCED_RANGE.saturation
  const [lMin, lMax] = BALANCED_RANGE.lightness
  for (let i = 0; i < 2000; i += 1) {
    const { s, l } = rgbToHsl(randomBalancedColor())
    // One percent of slack for 8-bit rounding.
    assert.ok(s >= sMin - 1 && s <= sMax + 1, `s=${s}`)
    assert.ok(l >= lMin - 1 && l <= lMax + 1, `l=${l}`)
  }
})

test('randomColor picks the generator by mode', () => {
  assert.deepEqual(randomColor('any', sequence(9, 8, 7)), { r: 9, g: 8, b: 7 })
  const { l } = rgbToHsl(randomColor('balanced'))
  assert.ok(l >= BALANCED_RANGE.lightness[0] - 1 && l <= BALANCED_RANGE.lightness[1] + 1)
})
