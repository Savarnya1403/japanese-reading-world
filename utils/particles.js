import * as THREE from 'three';
import { randF } from './helpers.js';

/**
 * Cherry blossom petal particle system.
 * Uses THREE.Points with a custom BufferGeometry.
 */
export class PetalSystem {
  constructor(scene, { count = 400, spread = 30, origin = new THREE.Vector3(0,8,0) } = {}) {
    this.count  = count;
    this.spread = spread;
    this.origin = origin;
    this.scene  = scene;

    this._positions = new Float32Array(count * 3);
    this._velocities = [];
    this._phases = new Float32Array(count);   // drift phase
    this._sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      this._reset(i, true);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this._positions, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(this._sizes, 1));

    // Simple round petal texture via canvas
    const tex = this._makePetalTexture();

    const mat = new THREE.PointsMaterial({
      size: 0.22,
      map: tex,
      vertexColors: false,
      color: new THREE.Color('#ffb7c5'),
      transparent: true,
      opacity: 0.82,
      depthWrite: false,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
    });

    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    scene.add(this.points);
  }

  _makePetalTexture() {
    const c = document.createElement('canvas');
    c.width = c.height = 32;
    const ctx = c.getContext('2d');
    const grd = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grd.addColorStop(0,   'rgba(255,190,210,1)');
    grd.addColorStop(0.6, 'rgba(255,180,200,0.7)');
    grd.addColorStop(1,   'rgba(255,180,200,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, 32, 32);
    return new THREE.CanvasTexture(c);
  }

  _reset(i, randomY = false) {
    const x = this.origin.x + randF(-this.spread, this.spread);
    const y = randomY
      ? this.origin.y + randF(-2, 5)
      : this.origin.y + randF(4, 8);
    const z = this.origin.z + randF(-this.spread, this.spread);
    this._positions[i*3]   = x;
    this._positions[i*3+1] = y;
    this._positions[i*3+2] = z;

    this._velocities[i] = {
      x: randF(-0.5, 0.5),
      y: randF(-0.8, -0.3),
      z: randF(-0.5, 0.5),
    };
    this._phases[i]  = randF(0, Math.PI * 2);
    this._sizes[i]   = randF(0.15, 0.3);
  }

  update(delta, elapsed) {
    const pos = this._positions;
    for (let i = 0; i < this.count; i++) {
      const v = this._velocities[i];
      // drift sinusoidally
      pos[i*3]   += (v.x + Math.sin(elapsed * 0.7 + this._phases[i]) * 0.3) * delta;
      pos[i*3+1] += v.y * delta;
      pos[i*3+2] += (v.z + Math.cos(elapsed * 0.5 + this._phases[i]) * 0.3) * delta;

      // respawn if fallen below ground
      if (pos[i*3+1] < -0.5) this._reset(i, false);
    }
    this.points.geometry.attributes.position.needsUpdate = true;
  }

  dispose() {
    this.scene.remove(this.points);
    this.points.geometry.dispose();
    this.points.material.map?.dispose();
    this.points.material.dispose();
  }
}

/**
 * Small steam/smoke particle burst used for coffee delivery.
 */
export class SteamSystem {
  constructor(scene, position) {
    this.scene    = scene;
    this.position = position.clone();
    this.count    = 30;
    this.life     = new Float32Array(this.count).fill(0);
    this.maxLife  = new Float32Array(this.count);
    this.vel      = [];
    this._pos     = new Float32Array(this.count * 3);
    this.alive    = true;

    for (let i = 0; i < this.count; i++) {
      this.maxLife[i] = randF(0.6, 1.5);
      this.life[i]    = randF(0, this.maxLife[i]);   // stagger
      this.vel[i]     = new THREE.Vector3(randF(-0.3,0.3), randF(0.4,1.0), randF(-0.3,0.3));
      this._pos[i*3]   = this.position.x;
      this._pos[i*3+1] = this.position.y;
      this._pos[i*3+2] = this.position.z;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this._pos, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.18,
      color: 0xffffff,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
    });

    this.points = new THREE.Points(geo, mat);
    scene.add(this.points);
    this.timer = 0;
    this.duration = 4.0;
  }

  update(delta) {
    this.timer += delta;
    if (this.timer > this.duration) {
      this.dispose();
      return;
    }
    for (let i = 0; i < this.count; i++) {
      this.life[i] += delta;
      if (this.life[i] > this.maxLife[i]) {
        this.life[i] = 0;
        this._pos[i*3]   = this.position.x;
        this._pos[i*3+1] = this.position.y;
        this._pos[i*3+2] = this.position.z;
      } else {
        const t = this.life[i] / this.maxLife[i];
        this._pos[i*3]   += this.vel[i].x * delta;
        this._pos[i*3+1] += this.vel[i].y * delta;
        this._pos[i*3+2] += this.vel[i].z * delta;
        // fade out
        this.points.material.opacity = 0.5 * (1 - t);
      }
    }
    this.points.geometry.attributes.position.needsUpdate = true;
  }

  dispose() {
    if (!this.alive) return;
    this.alive = false;
    this.scene.remove(this.points);
    this.points.geometry.dispose();
    this.points.material.dispose();
  }
}
