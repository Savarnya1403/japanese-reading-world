# 読書の庭 – Japanese Reading Garden

An immersive 3D Japanese fantasy world where you read your PDF books beneath cherry blossoms, order coffee, and explore a hand-crafted garden environment.

## Features

| Feature | Details |
|---|---|
| 🌸 Japanese garden | Cherry tree, pond + bridge, torii gate, bamboo grove, stone path, paper lanterns |
| 🧍 Third-person avatar | Arrow keys / WASD to move; mouse-drag to orbit camera; scroll to zoom |
| 📖 PDF reading | Upload any PDF; sit at the table to read with page-flip overlay |
| ☕ Coffee delivery | Animated parabolic arc from stall to table with steam particles |
| ✨ Post-processing | Bloom glow via UnrealBloomPass; ACES filmic tone-mapping |
| 🎑 Atmosphere | Sunset sky shader, falling petals particle system, exponential fog, dynamic lantern lights |

## Quick Start

### Option A – Vite (recommended)

```bash
cd japanese-reading-garden
npm install
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173) in your browser.

### Option B – Any static server (no install)

```bash
# Python 3
python3 -m http.server 8080

# Node (npx)
npx serve .

# VS Code: use "Live Server" extension
```

> **Note:** The project uses ES modules with an `importmap`, so you **must** serve it from a local HTTP server. Opening `index.html` directly as a `file://` URL will not work.

## Controls

| Key / Action | Effect |
|---|---|
| `↑ ↓ ← →` or `W A S D` | Move character |
| Mouse drag (left button) | Orbit camera |
| Scroll wheel | Zoom in/out |
| `E` | Sit at table and open PDF overlay |
| `C` | Order a coffee |
| `ESC` or `✕` button | Close PDF overlay |
| `← →` arrow keys (while reading) | Previous / next page |

## Project Structure

```
japanese-reading-garden/
├── index.html                 # Entry point with importmap
├── styles.css                 # All UI styles (Japanese aesthetic)
├── main.js                    # Bootstrap: renderer, scene, loop
├── world/
│   └── sceneBuilder.js        # All world geometry (tree, pond, gate, stall…)
├── character/
│   └── CharacterController.js # Movement, camera orbit, animations
├── coffee/
│   └── CoffeeManager.js       # Order, parabolic delivery animation
├── pdf/
│   └── PDFReader.js           # PDF.js wrapper, page rendering, overlay
├── ui/
│   ├── UIManager.js           # HUD, hints, button routing
│   └── controlsHelp.js        # Controls overlay helper
└── utils/
    ├── helpers.js             # Math utilities, loading bar
    └── particles.js           # Petal + steam particle systems
```

## Dependencies (CDN – no install needed)

| Library | Version | Use |
|---|---|---|
| [Three.js](https://threejs.org) | 0.160.0 | 3D rendering |
| [PDF.js](https://mozilla.github.io/pdf.js/) | 3.11.174 | PDF loading & rendering |
| [Google Fonts – Noto Serif JP](https://fonts.google.com) | latest | Japanese typography |

Only Vite is installed as a dev dependency (optional).

## Tips

- Upload any PDF via the **📖 本を読む** button, then walk to the table and press **E** to read it.
- Coffee cups stack on the table — order multiple times!
- Drag the camera low to get a ground-level view of the garden.
- The bloom effect makes lanterns glow; best appreciated at dusk (the scene is always set at sunset).

## Extending

- **Add a GLTF character model**: Replace `_buildCharacter()` in `CharacterController.js` with a `GLTFLoader` call and use `AnimationMixer` for animations.
- **Water reflections**: Swap the pond mesh in `sceneBuilder.js` for Three.js `Water` from `three/addons/objects/Water2.js`.
- **Ambient audio**: Add a Web Audio API background loop in `main.js` (wind + birds + water).
- **More pages / zoom**: `PDFReader` already supports zoom via `_scale`; extend the UI for a slider.

---

*Made with Three.js, PDF.js, and a love of quiet reading spots.*
