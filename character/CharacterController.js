import * as THREE from 'three';
import { clamp, lerp } from '../utils/helpers.js';

const MOVE_SPEED = 5.0;
const ROTATE_SPEED = 9.0;
const ZOOM_MIN = 3;
const ZOOM_MAX = 18;

export class CharacterController {
  constructor(scene, camera, canvas, collidables) {
    this.scene       = scene;
    this.camera      = camera;
    this.canvas      = canvas;
    this.collidables = collidables;

    this.isMoving  = false;
    this.isSitting = false;
    this.isReading = false;

    // Camera spherical coords
    this.camTheta       = Math.PI;
    this.camPhi         = 0.42;
    this.camDist        = 8;
    this.camTargetTheta = Math.PI;
    this.camTargetDist  = 8;

    this._keys  = {};
    this._mouse = { down: false, prevX: 0, prevY: 0 };
    this._animTime  = 0;
    this._targetRotY = 0;

    const { group, meshes } = this._buildCharacter();
    this.group  = group;
    this.meshes = meshes;  // exposed for OutlinePass
    this.group.position.set(0, 0, 3);
    scene.add(this.group);

    this._bindInput();
  }

  // ── Character mesh ────────────────────────────────────────
  _buildCharacter() {
    const root   = new THREE.Group();
    const meshes = [];

    const toon = (color, emissive = 0x000000) => new THREE.MeshToonMaterial({ color, emissive, emissiveIntensity: 0.05 });

    const skinColor  = 0xf0c090;
    const bodyColor  = 0x2c3e6e;   // deep blue kimono
    const hairColor  = 0x110800;
    const scarfColor = 0xcc2200;
    const shoeColor  = 0x2c1a0e;
    const sashColor  = 0xd4a017;

    const add = (geo, mat, parent = root) => {
      const m = new THREE.Mesh(geo, mat);
      m.castShadow = true;
      parent.add(m);
      meshes.push(m);
      return m;
    };

    // ── Torso (kimono)
    this.torso = add(new THREE.CylinderGeometry(0.22, 0.26, 0.72, 10), toon(bodyColor));
    this.torso.position.y = 1.22;

    // Sash belt
    this.sash = add(new THREE.CylinderGeometry(0.235, 0.235, 0.16, 10), toon(sashColor));
    this.sash.position.y = 1.0;

    // ── Hips/lower robe
    const hips = add(new THREE.CylinderGeometry(0.26, 0.22, 0.38, 10), toon(bodyColor));
    hips.position.y = 0.68;

    // ── Head (sphere for roundness)
    this.head = add(new THREE.SphereGeometry(0.24, 14, 10), toon(skinColor));
    this.head.position.y = 1.84;
    this.head.scale.set(1, 1.08, 0.96);

    // ── Hair
    this.hairTop = add(new THREE.SphereGeometry(0.26, 12, 8), toon(hairColor));
    this.hairTop.position.y = 1.96;
    this.hairTop.scale.set(1, 0.7, 0.95);
    const hairBack = add(new THREE.CylinderGeometry(0.13, 0.08, 0.42, 8), toon(hairColor));
    hairBack.position.set(0, 1.78, -0.16);

    // ── Face features
    // Eyes (emissive dark)
    const eyeMat = toon(0x111111);
    [-0.088, 0.088].forEach(x => {
      const eye = add(new THREE.SphereGeometry(0.034, 7, 5), eyeMat);
      eye.position.set(x, 1.86, 0.215);
      eye.scale.set(1, 1.15, 0.6);
    });
    // Blush
    const blushMat = toon(0xff9999);
    [-0.17, 0.17].forEach(x => {
      const b = add(new THREE.SphereGeometry(0.028, 5, 4), blushMat);
      b.position.set(x, 1.80, 0.22); b.scale.z = 0.3;
    });
    // Mouth
    const mouthMat = toon(0xcc5555);
    const mouth = add(new THREE.SphereGeometry(0.022, 5, 4), mouthMat);
    mouth.position.set(0, 1.77, 0.22); mouth.scale.set(1.5, 0.7, 0.4);

    // ── Scarf/collar
    const scarf = add(new THREE.TorusGeometry(0.21, 0.055, 8, 14), toon(scarfColor));
    scarf.position.y = 1.58; scarf.rotation.x = Math.PI/2;

    // ── Neck
    const neck = add(new THREE.CylinderGeometry(0.07, 0.09, 0.14, 8), toon(skinColor));
    neck.position.y = 1.62;

    // ── Arms (shoulder joint + upper + lower + hand)
    this.armL = new THREE.Group(); this.armR = new THREE.Group();
    [this.armL, this.armR].forEach((arm, i) => {
      const sx = i === 0 ? -1 : 1;
      // Shoulder sphere
      const sh = add(new THREE.SphereGeometry(0.115, 8, 6), toon(bodyColor), arm);
      sh.position.y = 0;
      // Upper arm
      const ua = add(new THREE.CylinderGeometry(0.085, 0.10, 0.38, 8), toon(bodyColor), arm);
      ua.position.y = -0.19;
      // Elbow joint
      const el = add(new THREE.SphereGeometry(0.088, 7, 5), toon(bodyColor), arm);
      el.position.y = -0.40;
      // Forearm
      const fa = add(new THREE.CylinderGeometry(0.070, 0.085, 0.35, 8), toon(skinColor), arm);
      fa.position.y = -0.58;
      // Hand
      const hand = add(new THREE.SphereGeometry(0.075, 7, 5), toon(skinColor), arm);
      hand.position.y = -0.78; hand.scale.set(1, 0.85, 0.9);
      arm.position.set(sx * 0.34, 1.56, 0);
      root.add(arm);
    });

    // ── Legs
    this.legL = new THREE.Group(); this.legR = new THREE.Group();
    [this.legL, this.legR].forEach((leg, i) => {
      const sx = i === 0 ? -1 : 1;
      // Upper leg
      const ul = add(new THREE.CylinderGeometry(0.10, 0.115, 0.48, 9), toon(bodyColor), leg);
      ul.position.y = -0.24;
      // Knee
      const kn = add(new THREE.SphereGeometry(0.10, 7, 5), toon(bodyColor), leg);
      kn.position.y = -0.52;
      // Lower leg
      const ll = add(new THREE.CylinderGeometry(0.085, 0.10, 0.42, 9), toon(bodyColor), leg);
      ll.position.y = -0.75;
      // Foot
      const foot = add(new THREE.BoxGeometry(0.16, 0.09, 0.26), toon(shoeColor), leg);
      foot.position.set(0, -0.97, 0.04);
      leg.position.set(sx * 0.135, 0.9, 0);
      root.add(leg);
    });

    // Tall hat (kasa)
    const hatMat = toon(0x3a2a10);
    const hatBrim = add(new THREE.CylinderGeometry(0.38, 0.38, 0.04, 14), hatMat);
    hatBrim.position.y = 2.08;
    const hatTop = add(new THREE.CylinderGeometry(0.04, 0.32, 0.28, 14), hatMat);
    hatTop.position.y = 2.22;

    return { group: root, meshes };
  }

  // ── Input ─────────────────────────────────────────────────
  _bindInput() {
    window.addEventListener('keydown', e => { this._keys[e.code] = true; });
    window.addEventListener('keyup',   e => { this._keys[e.code] = false; });

    this.canvas.addEventListener('mousedown', e => {
      if (e.button !== 0) return;
      this._mouse.down = true; this._mouse.prevX = e.clientX; this._mouse.prevY = e.clientY;
    });
    window.addEventListener('mouseup',  e => { if (e.button === 0) this._mouse.down = false; });
    window.addEventListener('mousemove', e => {
      if (!this._mouse.down) return;
      const dx = e.clientX - this._mouse.prevX;
      const dy = e.clientY - this._mouse.prevY;
      this._mouse.prevX = e.clientX; this._mouse.prevY = e.clientY;
      this.camTargetTheta -= dx * 0.007;
      this.camPhi = clamp(this.camPhi + dy * 0.006, 0.08, 1.25);
    });
    this.canvas.addEventListener('wheel', e => {
      this.camTargetDist = clamp(this.camTargetDist + e.deltaY * 0.012, ZOOM_MIN, ZOOM_MAX);
    }, { passive: true });
  }

  // ── Update ────────────────────────────────────────────────
  update(delta) {
    if (this.isSitting || this.isReading) {
      this._breathe(delta);
      this._updateCamera();
      return;
    }

    const k = this._keys;
    const fwd   = k['ArrowUp']    || k['KeyW'];
    const back  = k['ArrowDown']  || k['KeyS'];
    const left  = k['ArrowLeft']  || k['KeyA'];
    const right = k['ArrowRight'] || k['KeyD'];
    this.isMoving = fwd || back || left || right;

    if (this.isMoving) {
      const camDir   = new THREE.Vector3(Math.sin(this.camTheta), 0, Math.cos(this.camTheta));
      const camRight = new THREE.Vector3(Math.cos(this.camTheta), 0, -Math.sin(this.camTheta));
      const move = new THREE.Vector3();
      if (fwd)   move.addScaledVector(camDir,    1);
      if (back)  move.addScaledVector(camDir,   -1);
      if (left)  move.addScaledVector(camRight, -1);
      if (right) move.addScaledVector(camRight,  1);

      if (move.lengthSq() > 0) {
        move.normalize();
        this._targetRotY = Math.atan2(move.x, move.z);
      }

      const nextPos = this.group.position.clone().addScaledVector(move, MOVE_SPEED * delta);
      if (!this._checkCollision(nextPos)) {
        this.group.position.copy(nextPos);
      } else {
        const nx = this.group.position.clone(); nx.x += move.x * MOVE_SPEED * delta;
        if (!this._checkCollision(nx)) this.group.position.copy(nx);
        const nz = this.group.position.clone(); nz.z += move.z * MOVE_SPEED * delta;
        if (!this._checkCollision(nz)) this.group.position.copy(nz);
      }
      this.group.position.y = 0;
    }

    // Smooth rotation
    let diff = this._targetRotY - this.group.rotation.y;
    while (diff >  Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.group.rotation.y += diff * ROTATE_SPEED * delta;

    this._animate(delta);
    this._updateCamera();
  }

  _checkCollision(pos) {
    for (const c of this.collidables) {
      const dx = pos.x - c.pos.x, dz = pos.z - c.pos.z;
      if (Math.sqrt(dx*dx + dz*dz) < c.radius + 0.45) return true;
    }
    return false;
  }

  _updateCamera() {
    this.camTheta = lerp(this.camTheta, this.camTargetTheta, 0.10);
    this.camDist  = lerp(this.camDist,  this.camTargetDist,  0.10);
    const target  = this.group.position.clone().add(new THREE.Vector3(0, 1.2, 0));
    const offset  = new THREE.Vector3(
      this.camDist * Math.sin(this.camTheta) * Math.cos(this.camPhi),
      this.camDist * Math.sin(this.camPhi) + 1.2,
      this.camDist * Math.cos(this.camTheta) * Math.cos(this.camPhi)
    );
    this.camera.position.lerp(target.clone().add(offset), 0.09);
    this.camera.lookAt(target);
  }

  _animate(delta) {
    this._animTime += delta;
    const t = this._animTime;
    if (this.isMoving) {
      const s = Math.sin(t * 7.5) * 0.42;
      this.legL.rotation.x  =  s;  this.legR.rotation.x = -s;
      this.armL.rotation.x  = -s * 0.55; this.armR.rotation.x = s * 0.55;
      this.group.position.y = Math.abs(Math.sin(t * 7.5)) * 0.045;
    } else {
      this._breathe(delta);
      [this.legL, this.legR, this.armL, this.armR].forEach(m => { m.rotation.x = lerp(m.rotation.x, 0, 0.12); });
    }
  }

  _breathe(delta) {
    this._animTime += delta;
    const b = Math.sin(this._animTime * 1.4) * 0.012;
    this.torso.position.y = 1.22 + b;
    this.head.position.y  = 1.84 + b * 0.5;
    this.sash.position.y  = 1.0  + b * 0.5;
  }

  sitAt(targetPos) {
    this.isSitting = true;
    this.group.position.set(targetPos.x, -0.3, targetPos.z + 1.2);
    this.group.rotation.y = Math.PI;
    this.legL.rotation.x = -Math.PI / 2.1;
    this.legR.rotation.x = -Math.PI / 2.1;
    this.armL.rotation.x = -0.35;
    this.armR.rotation.x = -0.35;
  }

  stand() {
    this.isSitting = false; this.isReading = false;
    this.group.position.y = 0;
    this.legL.rotation.x = this.legR.rotation.x = 0;
    this.armL.rotation.x = this.armR.rotation.x = 0;
  }

  get position() { return this.group.position; }
  isKeyPressed(code) { return !!this._keys[code]; }
}
