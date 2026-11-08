// Applies the saved theme before first paint, so the wrong theme never flashes.
// Kept as a separate file because the Content Security Policy blocks inline scripts.
;(function () {
  try {
    var saved = localStorage.getItem('colorgen:theme')
    if (saved === 'light' || saved === 'dark') {
      document.documentElement.setAttribute('data-theme', saved)
    }
  } catch (e) {
    // Storage unavailable: fall back to the system theme.
  }
})()
