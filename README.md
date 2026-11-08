# color-generator

Random color generator that runs entirely in your browser. Copy any color as HEX, RGB or HSL, check its text contrast, and go back to earlier colors.

**Use it:** https://gustavo-alberto.github.io/color-generator/

Available in English and Brazilian Portuguese, with light and dark themes. It works offline after the first visit.

## Features

- **Values:** HEX, RGB and HSL, each with a copy button. RGB and HSL copy as CSS (`rgb(26 43 60)`, `hsl(210 40% 17%)`).
- **Type your own color:** the HEX field accepts `#1A2B3C`, `1a2b3c` or `#abc`. Press Enter to add it to the history, Esc to revert.
- **Text contrast:** WCAG contrast ratio of white and black text on the color, with the level it reaches (AAA, AA, AA large or fails).
- **Randomness:** *Any color* makes every 24-bit color equally likely. *Balanced* picks any hue but keeps saturation between 45–85% and lightness between 35–70%, skipping muddy, very dark and very light colors.
- **History:** the last 12 colors, with undo and redo. Click a swatch to bring it back.
- **Keyboard shortcuts:** `Space` new color, `C` copy HEX, `Z` undo, `Shift+Z` redo.
- **Accessible:** keyboard navigation, visible focus, screen reader labels and announcements, 44 px touch targets, reduced motion.

## Principles

- **Nothing leaves the browser.** No backend, no analytics, no network requests. The Content Security Policy blocks outgoing connections (`connect-src 'none'`).
- **Only preferences are stored.** Theme, language, randomness mode and color history are kept in `localStorage`.
- **Unbiased randomness.** Colors come from `crypto.getRandomValues`, with rejection sampling where a range is needed.
- **Zero dependencies.** Plain HTML, CSS and JavaScript (ES modules), no build step. The published code is the repository code.

## Deploying to GitHub Pages

The repository root is the site. There is nothing to build.

1. Go to **Settings → Pages**.
2. Under **Build and deployment**, choose **Deploy from a branch**.
3. Pick the `main` branch and the `/ (root)` folder, then save.

The empty `.nojekyll` file tells Pages to serve the files as they are. All paths are relative, so the app works under `/color-generator/`.

## Running locally

Requires Node.js 20 or later. Nothing to install.

```bash
npm run serve
```

Open `http://127.0.0.1:8080/`. To use another port: `node scripts/serve.mjs 3000`.

> Opening `index.html` straight from disk (`file://`) does not work, because ES modules require an HTTP server.

## Offline use

After the first visit, a service worker (`sw.js`) keeps every app file in the browser cache. It can be installed as an app from the browser menu.

On `localhost` the service worker stays off, so local edits show up immediately. Add `?sw` to the URL to test offline mode locally.

### Releasing a change

1. Bump `CACHE_VERSION` in `sw.js`. Otherwise returning visitors keep the previous files.
2. Add any new app file to `PRECACHE` in `sw.js`. `npm test` fails when one is missing.

## Tests

```bash
npm test
```

Uses Node's built-in test runner (`node --test`), no dependencies. The suite covers color conversions, WCAG contrast, random uniformity, history, i18n, storage, precache coverage and static security rules.

## Project structure

```
index.html            page and CSP
sw.js                 offline cache
manifest.webmanifest  installable app metadata
css/                  styles, tokens and @font-face
js/core/              color math, randomness, history (no DOM, tested in Node)
js/locales/           en and pt-BR strings
js/                   app entry, i18n, storage, theme bootstrap
scripts/              local server and icon builder
tests/                node:test suites
```

`node scripts/build-icons.mjs` renders the PNG icons from `icons/icon.svg`.

## Fonts

Both fonts are self-hosted in `fonts/` (variable, latin subset) and licensed under the [SIL Open Font License 1.1](https://openfontlicense.org/):

- [Space Grotesk](https://github.com/floriankarsten/space-grotesk), for the interface. See `fonts/space-grotesk.LICENSE`.
- [JetBrains Mono](https://github.com/JetBrains/JetBrainsMono), for color values. See `fonts/jetbrains-mono.LICENSE`.

## License

The code is under the [MIT](LICENSE) license © Gustavo Alberto. The fonts keep their own licenses, listed above.
