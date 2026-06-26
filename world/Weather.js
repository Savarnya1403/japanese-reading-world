import * as THREE from 'three';
import { randF } from '../utils/helpers.js';

// Vertical line-segment rain streaks
class RainSystem {
  constructor(scene) {
    this._scene = scene;
    this._count = 2800;
    const STREAK = 0.9;

    // Each raindrop = 2 vertices (top, bottom)
    const pos = new Float32Array(this._count * 6);
    this._vel = new Float32Array(this._count);

    for (let i = 0; i < this._count; i++) {
      const x = (Math.random() - 0.5) * 40;
      const y = Math.random() * 22;
      const z = (Math.random() - 0.5) * 40;
      pos[i*6+0] = x; pos[i*6+1] = y;        pos[i*6+2] = z;
      pos[i*6+3] = x; pos[i*6+4] = y - STREAK; pos[i*6+5] = z;
      this._vel[i] = 14 + Math.random() * 8;
    }

    this._pos = pos;
    this._geo = new THREE.BufferGeometry();
    this._geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this._mat = new THREE.LineBasicMaterial({
      color: 0x99aadd, transparent: true, opacity: 0.45, fog: true
    });
    this._mesh = new THREE.LineSegments(this._geo, this._mat);
    scene.add(this._mesh);
  }

  update(delta, camPos) {
    const pos = this._pos;
    const STREAK = 0.9;
    const WIND_X = 0.8;

    for (let i = 0; i < this._count; i++) {
      const fall = this._vel[i] * delta;
      pos[i*6+1] -= fall;
      pos[i*6+4] -= fall;
      pos[i*6+0] += WIND_X * delta;
      pos[i*6+3] += WIND_X * delta;

      if (pos[i*6+4] < camPos.y - 2) {
        const x = camPos.x + (Math.random() - 0.5) * 40;
        const z = camPos.z + (Math.random() - 0.5) * 40;
        const y = camPos.y + 18 + Math.random() * 6;
        pos[i*6+0] = x; pos[i*6+1] = y;          pos[i*6+2] = z;
        pos[i*6+3] = x; pos[i*6+4] = y - STREAK;  pos[i*6+5] = z;
      }
    }
    this._geo.attributes.position.needsUpdate = true;
  }

  dispose() {
    this._scene.remove(this._mesh);
    this._geo.dispose();
    this._mat.dispose();
  }
}

export class Weather {
  constructor(scene, skyUniforms) {
    this._scene       = scene;
    this._sky         = skyUniforms;
    this._state       = 'clear';  // 'clear' | 'rain' | 'clearing'
    this._rain        = null;
    this._nextEvent   = 60 + Math.random() * 90;
    this._stateTimer  = 0;
    this._overcast    = 0;  // 0-1
    this._rainBlend   = 0;  // 0-1
  }

  get isRaining() { return this._state === 'rain'; }

  update(delta, camPos) {
    this._nextEvent -= delta;
    if (this._nextEvent <= 0) {
      this._trigger();
      this._nextEvent = 80 + Math.random() * 120;
    }

    if (this._state === 'rain') {
      this._stateTimer -= delta;
      this._overcast  = Math.min(1, this._overcast  + delta * 0.15);
      this._rainBlend = Math.min(1, this._rainBlend + delta * 0.25);
      if (this._rain) this._rain.update(delta, camPos);
      if (this._stateTimer <= 0) this._startClearing();
    } else if (this._state === 'clearing') {
      this._overcast  = Math.max(0, this._overcast  - delta * 0.08);
      this._rainBlend = Math.max(0, this._rainBlend - delta * 0.20);
      if (this._rainBlend <= 0) {
        this._state = 'clear';
        if (this._rain) { this._rain.dispose(); this._rain = null; }
      }
    } else {
      this._overcast  = Math.max(0, this._overcast  - delta * 0.05);
      this._rainBlend = Math.max(0, this._rainBlend - delta * 0.05);
    }

    this._sky.u_overcast.value  = this._overcast;
    this._sky.u_rainBlend.value = this._rainBlend;

    // Lens overlay
    const overlay = document.getElementById('rain-overlay');
    if (overlay) overlay.classList.toggle('active', this.isRaining);
  }

  _trigger() {
    if (this._state === 'clear') this._startRain();
  }

  _startRain() {
    this._state = 'rain';
    this._stateTimer = 30 + Math.random() * 60;
    this._rain = new RainSystem(this._scene);
  }

  _startClearing() {
    this._state = 'clearing';
  }
}
