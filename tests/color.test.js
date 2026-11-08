import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  BLACK,
  WHITE,
  bestTextColor,
  contrastRatio,
  formatRatio,
  hslToRgb,
  parseHex,
  rgbToHsl,
  toHex,
  toHslCss,
  toRgbCss,
  wcagLevel,
} from '../js/core/color.js'

test('parseHex accepts 3 and 6 digits, with or without #, any case', () => {
  assert.deepEqual(parseHex('#1A2B3C'), { r: 26, g: 43, b: 60 })
  assert.deepEqual(parseHex('1a2b3c'), { r: 26, g: 43, b: 60 })
  assert.deepEqual(parseHex('#abc'), { r: 170, g: 187, b: 204 })
  assert.deepEqual(parseHex('  fff  '), { r: 255, g: 255, b: 255 })
})

test('parseHex rejects invalid input', () => {
  for (const value of ['', '#', '#12', '#1234', '#12345', '#1234567', '#GGGGGG', 'red', null, undefined, 123]) {
    assert.equal(parseHex(value), null, String(value))
  }
})

test('toHex pads and uppercases', () => {
  assert.equal(toHex({ r: 0, g: 10, b: 255 }), '#000AFF')
})

test('CSS formatters use space-separated syntax', () => {
  assert.equal(toRgbCss({ r: 26, g: 43, b: 60 }), 'rgb(26 43 60)')
  assert.equal(toHslCss({ r: 255, g: 0, b: 0 }), 'hsl(0 100% 50%)')
})

test('rgbToHsl matches known values', () => {
  assert.deepEqual(rgbToHsl({ r: 255, g: 0, b: 0 }), { h: 0, s: 100, l: 50 })
  assert.deepEqual(rgbToHsl({ r: 0, g: 255, b: 0 }), { h: 120, s: 100, l: 50 })
  assert.deepEqual(rgbToHsl({ r: 0, g: 0, b: 255 }), { h: 240, s: 100, l: 50 })
  assert.deepEqual(rgbToHsl({ r: 128, g: 128, b: 128 }), { h: 0, s: 0, l: 50 })
  assert.deepEqual(rgbToHsl({ r: 255, g: 255, b: 255 }), { h: 0, s: 0, l: 100 })
  assert.deepEqual(rgbToHsl({ r: 26, g: 43, b: 60 }), { h: 210, s: 40, l: 17 })
})

test('hslToRgb inverts rgbToHsl within rounding error', () => {
  for (const hex of ['#FF0000', '#00FF00', '#0000FF', '#808080', '#123456', '#FEDCBA', '#000000', '#FFFFFF']) {
    const color = parseHex(hex)
    const back = hslToRgb(rgbToHsl(color))
    // Whole-percent HSL loses a little precision, so allow a small error per channel.
    for (const channel of ['r', 'g', 'b']) {
      assert.ok(Math.abs(back[channel] - color[channel]) <= 3, `${hex} ${channel}`)
    }
  }
  assert.deepEqual(hslToRgb({ h: 360, s: 100, l: 50 }), { r: 255, g: 0, b: 0 })
  assert.deepEqual(hslToRgb({ h: -120, s: 100, l: 50 }), { r: 0, g: 0, b: 255 })
})

test('contrastRatio matches WCAG reference values', () => {
  assert.equal(contrastRatio(WHITE, BLACK), 21)
  assert.equal(contrastRatio(WHITE, WHITE), 1)
  assert.equal(contrastRatio(WHITE, BLACK), contrastRatio(BLACK, WHITE))
  // #777777 on white is the classic example that just misses AA (4.48:1); #767676 passes.
  assert.equal(formatRatio(contrastRatio(parseHex('#777777'), WHITE)), '4.4')
  assert.equal(formatRatio(contrastRatio(parseHex('#767676'), WHITE)), '4.5')
})

test('wcagLevel thresholds', () => {
  assert.equal(wcagLevel(21), 'AAA')
  assert.equal(wcagLevel(7), 'AAA')
  assert.equal(wcagLevel(6.99), 'AA')
  assert.equal(wcagLevel(4.5), 'AA')
  assert.equal(wcagLevel(4.49), 'AA-large')
  assert.equal(wcagLevel(3), 'AA-large')
  assert.equal(wcagLevel(2.99), 'fail')
})

test('formatRatio rounds down so a failing ratio never looks like a pass', () => {
  assert.equal(formatRatio(4.4999), '4.4')
  assert.equal(formatRatio(21), '21.0')
})

test('bestTextColor picks the higher-contrast option', () => {
  assert.equal(bestTextColor(parseHex('#000000')), WHITE)
  assert.equal(bestTextColor(parseHex('#FFFF00')), BLACK)
  assert.equal(bestTextColor(parseHex('#1A2B3C')), WHITE)
})
