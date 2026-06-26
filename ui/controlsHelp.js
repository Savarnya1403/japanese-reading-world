/**
 * controlsHelp.js
 * Lightweight module – the controls overlay is already in index.html.
 * This exports a helper to re-show it briefly when needed.
 */
export function flashControlsHelp(duration = 4000) {
  const el = document.getElementById('controls-help');
  if (!el) return;
  el.classList.remove('fade-out');
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.add('fade-out'), duration);
}
