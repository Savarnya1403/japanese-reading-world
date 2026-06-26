import * as THREE from 'three';

export function lerp(a, b, t) { return a + (b - a) * t; }
export function clamp(v, mn, mx) { return Math.max(mn, Math.min(mx, v)); }
export function deg2rad(d) { return d * Math.PI / 180; }
export function randF(mn, mx) { return mn + Math.random() * (mx - mn); }
export function randI(mn, mx) { return Math.floor(randF(mn, mx)); }

export function parabolicArc(start, end, peakHeight, steps = 40) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    pts.push(new THREE.Vector3(
      lerp(start.x, end.x, t),
      lerp(start.y, end.y, t) + peakHeight * 4 * t * (1 - t),
      lerp(start.z, end.z, t)
    ));
  }
  return pts;
}

export function setLoadingProgress(pct, text = '') {
  const bar = document.getElementById('loading-bar');
  const txt = document.getElementById('loading-text');
  if (bar) bar.style.width = pct + '%';
  if (txt && text) txt.textContent = text;
}

export function hideLoadingScreen() {
  const ls = document.getElementById('loading-screen');
  if (!ls) return;
  ls.classList.add('fade-out');
  setTimeout(() => ls.classList.add('hidden'), 900);
}
