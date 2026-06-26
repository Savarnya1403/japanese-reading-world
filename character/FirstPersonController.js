import * as THREE from 'three';
import { clamp, lerp } from '../utils/helpers.js';

const MOVE_SPEED  = 5.5;
const SENSITIVITY = 0.0018;
const STAND_H     = 1.72;
const SIT_H       = 0.65;

export class FirstPersonController {
  constructor(camera, canvas, collidables) {
    this.camera      = camera;
    this.canvas      = canvas;
    this.collidables = collidables;

    // World position
    this.position = new THREE.Vector3(0, STAND_H, 5);

    // Look angles (radians)
    this.yaw   = 0;     // horizontal
    this.pitch = 0;     // vertical

    // State
    this.isLocked   = false;
    this.isSitting  = false;
    this.isMoving   = false;

    this._currentH  = STAND_H;
    this._targetH   = STAND_H;

    // Walk bob
    this._bobTime = 0;
    this._bobAmt  = 0;

    // Keys
    this._keys = {};

    this._bindInput();
  }

  _bindInput() {
    // Pointer lock on canvas click
    this.canvas.addEventListener('click', () => {
      if (!this.isSitting && !this.isLocked) {
        this.canvas.requestPointerLock();
      }
    });

    // "Click to start" overlay also requests lock
    document.getElementById('click-to-start')
      ?.addEventListener('click', () => this.canvas.requestPointerLock());

    document.addEventListener('pointerlockchange', () => {
      this.isLocked = document.pointerLockElement === this.canvas;
      const cts = document.getElementById('click-to-start');
      if (this.isLocked) {
        cts?.classList.add('hidden');
        document.body.classList.add('pointer-locked');
      } else {
        document.body.classList.remove('pointer-locked');
        if (!this.isSitting) cts?.classList.remove('hidden');
      }
    });

    document.addEventListener('mousemove', (e) => {
      if (!this.isLocked) return;
      this.yaw   -= e.movementX * SENSITIVITY;
      this.pitch -= e.movementY * SENSITIVITY;
      this.pitch  = clamp(this.pitch, -Math.PI * 0.42, Math.PI * 0.42);
    });

    window.addEventListener('keydown', e => { this._keys[e.code] = true; });
    window.addEventListener('keyup',   e => { this._keys[e.code] = false; });
  }

  update(delta) {
    if (this.isSitting) {
      this._currentH = lerp(this._currentH, SIT_H, 8 * delta);
      this.position.y = this._currentH;
      this._applyCamera();
      return;
    }

    // Movement
    const k = this._keys;
    const fwd   = k['ArrowUp']    || k['KeyW'];
    const back  = k['ArrowDown']  || k['KeyS'];
    const left  = k['ArrowLeft']  || k['KeyA'];
    const right = k['ArrowRight'] || k['KeyD'];
    this.isMoving = !!(fwd || back || left || right);

    if (this.isMoving && this.isLocked) {
      const cosY = Math.cos(this.yaw), sinY = Math.sin(this.yaw);
      const fwdDir    = new THREE.Vector3(-sinY, 0, -cosY);
      const strafeDir = new THREE.Vector3( cosY, 0, -sinY);

      const move = new THREE.Vector3();
      if (fwd)   move.addScaledVector(fwdDir,    1);
      if (back)  move.addScaledVector(fwdDir,   -1);
      if (left)  move.addScaledVector(strafeDir,-1);
      if (right) move.addScaledVector(strafeDir, 1);

      if (move.lengthSq() > 0) {
        move.normalize().multiplyScalar(MOVE_SPEED * delta);
        const nx = this.position.clone();
        nx.x += move.x; nx.z += move.z;
        if (!this._collides(nx)) {
          this.position.x = nx.x;
          this.position.z = nx.z;
        } else {
          // Slide along X then Z
          const nx2 = this.position.clone(); nx2.x += move.x;
          if (!this._collides(nx2)) this.position.x = nx2.x;
          const nz2 = this.position.clone(); nz2.z += move.z;
          if (!this._collides(nz2)) this.position.z = nz2.z;
        }
      }
    }

    // Smooth height
    this._currentH = lerp(this._currentH, STAND_H, 10 * delta);

    // Walk bob
    if (this.isMoving && this.isLocked) {
      this._bobTime += delta * 9;
      this._bobAmt   = lerp(this._bobAmt, 0.045, 6 * delta);
    } else {
      this._bobAmt = lerp(this._bobAmt, 0, 6 * delta);
    }
    this.position.y = this._currentH + Math.sin(this._bobTime) * this._bobAmt;

    this._applyCamera();
  }

  _applyCamera() {
    this.camera.position.copy(this.position);
    const euler = new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ');
    this.camera.quaternion.setFromEuler(euler);
  }

  _collides(pos) {
    for (const c of this.collidables) {
      const dx = pos.x - c.pos.x, dz = pos.z - c.pos.z;
      if (dx*dx + dz*dz < (c.radius + 0.38) * (c.radius + 0.38)) return true;
    }
    if (Math.abs(pos.x) > 62 || pos.z < -120 || pos.z > 65) return true;
    return false;
  }

  sitAt(worldPos) {
    this.isSitting = true;
    document.exitPointerLock();
    const cts = document.getElementById('click-to-start');
    cts?.classList.add('hidden');

    this.position.set(worldPos.x, STAND_H, worldPos.z + 1.0);
    this._targetH  = SIT_H;
    // Look slightly downward at book angle
    this.pitch = 0.18;
  }

  stand() {
    this.isSitting = false;
    this._targetH  = STAND_H;
    this._currentH = SIT_H;
    // Restore look-forward
    this.pitch = 0;
  }

  get eyePosition() { return this.position; }
}
