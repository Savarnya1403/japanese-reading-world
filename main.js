import * as THREE from 'three';
import { EffectComposer }  from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass }      from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass }      from 'three/addons/postprocessing/OutputPass.js';
import { SMAAPass }        from 'three/addons/postprocessing/SMAAPass.js';

import { buildScene, animateWorld, skyUniforms } from './world/sceneBuilder.js';
import { Animals }                              from './world/Animals.js';
import { FirstPersonController }   from './character/FirstPersonController.js';
import { TimeOfDay }               from './world/TimeOfDay.js';
import { Weather }                 from './world/Weather.js';
import { CoffeeManager }           from './coffee/CoffeeManager.js';
import { PDFReader }               from './pdf/PDFReader.js';
import { BookOverlay }             from './ui/BookOverlay.js';
import { UIManager }               from './ui/UIManager.js';
import { PetalSystem }             from './utils/particles.js';
import { setLoadingProgress, hideLoadingScreen } from './utils/helpers.js';

// ── Renderer ──────────────────────────────────────────────────────────────────
const canvas   = document.getElementById('canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
renderer.outputColorSpace  = THREE.SRGBColorSpace;
renderer.toneMapping       = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.3;

// ── Scene & Camera ────────────────────────────────────────────────────────────
const scene  = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.08, 350);

// ── Post-processing ───────────────────────────────────────────────────────────
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight), 0.65, 0.5, 0.82
);
composer.addPass(bloom);
composer.addPass(new SMAAPass(window.innerWidth, window.innerHeight));
composer.addPass(new OutputPass());

// ── World ─────────────────────────────────────────────────────────────────────
setLoadingProgress(10, 'Building the world…');
const { lights, collidables, tablePos, stallPos, clouds } = buildScene(scene);

// ── First-person controller ───────────────────────────────────────────────────
setLoadingProgress(30, 'Setting up first-person view…');
const fps = new FirstPersonController(camera, canvas, collidables);

// ── Time of day & weather ─────────────────────────────────────────────────────
setLoadingProgress(45, 'Painting the sky…');
const timeOfDay = new TimeOfDay(scene, { skyUniforms, sunLight: lights.sun, hemiLight: lights.hemi });
const weather   = new Weather(scene, skyUniforms);

// ── Coffee ────────────────────────────────────────────────────────────────────
setLoadingProgress(60, 'Brewing coffee…');
const coffeeManager = new CoffeeManager(scene, stallPos, tablePos);

// ── PDF reader (data layer only) ──────────────────────────────────────────────
setLoadingProgress(70, 'Stacking books…');
const pdfReader = new PDFReader();

// ── Book overlay (first-person reading UI) ────────────────────────────────────
setLoadingProgress(80, 'Preparing reading nook…');
const bookOverlay = new BookOverlay(pdfReader, {
  onStand: () => {
    fps.stand();
    ui.setCoffeeEnabled(true);
  },
});
coffeeManager.setBookOverlay(bookOverlay);

// ── Petals ────────────────────────────────────────────────────────────────────
setLoadingProgress(85, 'Summoning wildlife…');
const animals = new Animals(scene);

setLoadingProgress(87, 'Scattering cherry blossoms…');
const petals = new PetalSystem(scene, {
  count: 420, spread: 30, origin: new THREE.Vector3(-3, 9.5, -3),
});

// ── UI ────────────────────────────────────────────────────────────────────────
setLoadingProgress(95, 'Hanging lanterns…');
let _pdfLoaded = false;
let _nearTable = false;
let _nearStall = false;

const ui = new UIManager({
  onUpload: async (file) => {
    ui.setUploadLabel('⏳ Loading…');
    const ok = await pdfReader.loadFile(file);
    ui.setUploadLabel(ok ? '📖 ' + file.name.replace(/\.pdf$/i, '') : '📖 Read a Book');
    if (ok) _pdfLoaded = true;
  },
  onCoffee: () => {
    if (!bookOverlay.isOpen) coffeeManager.order();
  },
  onSitRead: async () => {
    if (bookOverlay.isOpen) { bookOverlay.close(); return; }
    if (_nearTable && _pdfLoaded) {
      fps.sitAt(tablePos);
      await bookOverlay.open();
    } else if (_nearTable) {
      ui.showHint('Upload a PDF first — press Enter near the table!');
      setTimeout(() => ui.clearHint(), 2800);
    }
  },
  onUploadKey: () => {
    if (_nearTable) document.getElementById('file-input')?.click();
  },
});

// ── Resize ────────────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  const w = window.innerWidth, h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h);
  bloom.resolution.set(w, h);
});

// ── Finish loading ────────────────────────────────────────────────────────────
setLoadingProgress(100, 'Ready!');
setTimeout(() => { hideLoadingScreen(); ui.showHUD(); }, 500);

// ── Main loop ─────────────────────────────────────────────────────────────────
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const delta   = Math.min(clock.getDelta(), 0.05);
  const elapsed = clock.elapsedTime;

  if (!bookOverlay.isOpen) fps.update(delta);
  coffeeManager.update(delta);
  petals.update(delta, elapsed);
  timeOfDay.update(delta);
  weather.update(delta, fps.eyePosition);
  bookOverlay.update(delta);
  animals.update(delta, fps.eyePosition, timeOfDay.isEvening, elapsed);
  animateWorld(lights, elapsed, delta, clouds);
  _checkProximity();

  composer.render(delta);
}

function _checkProximity() {
  if (bookOverlay.isOpen) return;
  const cp = fps.eyePosition;

  const dt = cp.distanceTo(tablePos);
  if (dt < 3.8) {
    if (!_nearTable) {
      _nearTable = true;
      ui.showHint(_pdfLoaded
        ? '[E] Sit and read  |  [Enter] Upload different book'
        : '[Enter] Upload a book  |  then [E] to sit and read'
      );
    }
  } else if (_nearTable) {
    _nearTable = false;
    ui.clearHint();
  }

  const stallApproach = stallPos.clone().add(new THREE.Vector3(-1.8, -1.1, 0));
  if (cp.distanceTo(stallApproach) < 3.5) {
    if (!_nearStall) { _nearStall = true; ui.showHint('[C] Order a coffee'); }
  } else if (_nearStall && !_nearTable) {
    _nearStall = false; ui.clearHint();
  }
}

animate();
