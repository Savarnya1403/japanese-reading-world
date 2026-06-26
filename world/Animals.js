import * as THREE from 'three';
import { randF, randI, lerp } from '../utils/helpers.js';

// ═══════════════════════════════════════════════════════════════════════════════
//  DEER
// ═══════════════════════════════════════════════════════════════════════════════

function buildDeerMesh() {
  const group = new THREE.Group();

  const bodyM  = new THREE.MeshStandardMaterial({ color:0x8B4A1C, roughness:.88 });
  const bellyM = new THREE.MeshStandardMaterial({ color:0xC88A5A, roughness:.88 });
  const whiteM = new THREE.MeshStandardMaterial({ color:0xF0E8DC, roughness:.88 });
  const darkM  = new THREE.MeshStandardMaterial({ color:0x281004, roughness:.90 });
  const eyeM   = new THREE.MeshStandardMaterial({ color:0x060200, roughness:.30, metalness:.4 });
  const antlM  = new THREE.MeshStandardMaterial({ color:0x6A3810, roughness:.85 });

  // Body (capsule rotated horizontal)
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.26,0.52,5,8), bodyM);
  body.rotation.x = Math.PI/2;
  body.scale.set(1,0.72,1);
  body.position.set(0,0.85,0);
  body.castShadow = true; group.add(body);

  // Belly lighter patch
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.22,6,4), bellyM);
  belly.scale.set(0.9,0.38,1.0); belly.position.set(0,0.62,0); group.add(belly);

  // Neck
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.11,0.16,0.36,7), bodyM);
  neck.position.set(0,1.06,0.28); neck.rotation.x = -0.55;
  neck.castShadow = true; group.add(neck);

  // Head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.185,8,6), bodyM);
  head.scale.set(0.88,0.92,1.18); head.position.set(0,1.36,0.50);
  head.castShadow = true;
  group.add(head);
  const headRef = head; // for animation

  // Snout
  const snout = new THREE.Mesh(new THREE.CylinderGeometry(0.065,0.09,0.13,7), bellyM);
  snout.rotation.x = Math.PI/2; snout.position.set(0,1.26,0.67); group.add(snout);

  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.048,6,4), darkM);
  nose.position.set(0,1.25,0.755); group.add(nose);

  // Eyes + highlights
  [-1,1].forEach(s => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.038,6,4), eyeM);
    eye.position.set(s*0.135, 1.40, 0.57); group.add(eye);
    const hl = new THREE.Mesh(new THREE.SphereGeometry(0.011,4,3), whiteM);
    hl.position.set(s*0.14, 1.41, 0.60); group.add(hl);
  });

  // Ears
  [-1,1].forEach(s => {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.062,0.21,6), bodyM);
    ear.position.set(s*0.19, 1.54, 0.49);
    ear.rotation.set(-0.18, 0, s*0.38); group.add(ear);
    const inner = new THREE.Mesh(new THREE.ConeGeometry(0.036,0.15,6), bellyM);
    inner.position.set(s*0.185, 1.53, 0.49);
    inner.rotation.set(-0.18, 0, s*0.38); group.add(inner);
  });

  // Legs (4 groups, stored for animation)
  const legs = [];
  const legDefs = [
    { x: 0.18, z:  0.22 }, { x:-0.18, z: 0.22 },
    { x: 0.18, z: -0.22 }, { x:-0.18, z:-0.22 },
  ];
  legDefs.forEach(({ x, z }) => {
    const lg = new THREE.Group();
    lg.position.set(x, 0.88, z);
    const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.042,0.038,0.34,6), bodyM);
    upper.position.y = -0.17; upper.castShadow = true; lg.add(upper);
    const lower = new THREE.Mesh(new THREE.CylinderGeometry(0.028,0.023,0.30,6), darkM);
    lower.position.y = -0.50; lower.castShadow = true; lg.add(lower);
    const hoof = new THREE.Mesh(new THREE.CylinderGeometry(0.036,0.034,0.05,6), darkM);
    hoof.position.y = -0.68; lg.add(hoof);
    group.add(lg); legs.push(lg);
  });

  // Tail
  const tail = new THREE.Mesh(new THREE.SphereGeometry(0.085,6,4), whiteM);
  tail.position.set(0,0.95,-0.36); group.add(tail);

  // Antlers (50% chance)
  if (Math.random() > 0.5) {
    const ag = new THREE.Group();
    ag.position.set(0,1.60,0.47);
    [-1,1].forEach(s => {
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.016,0.022,0.40,5), antlM);
      beam.position.set(s*0.11,0.21,0); beam.rotation.set(-0.14,0,s*0.34); ag.add(beam);
      const b1 = new THREE.Mesh(new THREE.CylinderGeometry(0.011,0.014,0.20,5), antlM);
      b1.position.set(s*0.17,0.36,0); b1.rotation.set(-0.28,0,s*0.72); ag.add(b1);
      const b2 = new THREE.Mesh(new THREE.CylinderGeometry(0.009,0.012,0.17,5), antlM);
      b2.position.set(s*0.22,0.30,0.04); b2.rotation.set(0.18,0,s*0.90); ag.add(b2);
    });
    group.add(ag);
  }

  return { group, legs, headRef };
}

class Deer {
  constructor(scene, startPos) {
    const { group, legs, headRef } = buildDeerMesh();
    this._group   = group;
    this._legs    = legs;
    this._headRef = headRef;
    scene.add(group);

    this.pos    = startPos.clone();
    this.yaw    = Math.random() * Math.PI * 2;
    this._yawTarget = this.yaw;
    this._target = startPos.clone();
    this._state  = 'grazing';
    this._timer  = 4 + Math.random() * 8;
    this._phase  = Math.random() * Math.PI * 2;
    this._speed  = 1.4;
  }

  update(delta, playerPos, elapsed) {
    const distP = this.pos.distanceTo(playerPos);
    this._timer -= delta;

    // State machine transitions
    if (this._state !== 'flee') {
      if (distP < 4.5) {
        this._state = 'flee';
        this._timer = 6;
        this._pickTarget(playerPos, true); // flee direction
      } else if (distP < 11 && this._state !== 'approach') {
        if (this._state !== 'alert') {
          this._state = 'alert';
          this._timer = 2 + Math.random() * 4;
        }
      } else if (this._state === 'alert' && distP > 13) {
        this._state = 'grazing';
        this._timer = 5 + Math.random() * 8;
      }
    }

    if (this._timer <= 0) this._nextState(playerPos, distP);

    // Behaviour
    const currentSpeed = this._state === 'flee' ? 4.8 : (this._state === 'approach' ? 0.65 : this._speed);

    if (this._state === 'walking' || this._state === 'flee' || this._state === 'approach') {
      const dx = this._target.x - this.pos.x;
      const dz = this._target.z - this.pos.z;
      const dist = Math.sqrt(dx*dx + dz*dz);
      if (dist > 0.5) {
        this._yawTarget = Math.atan2(dx, dz);
        const step = Math.min(dist, currentSpeed * delta);
        this.pos.x += (dx / dist) * step;
        this.pos.z += (dz / dist) * step;
      } else if (this._state !== 'flee') {
        this._state = 'grazing';
        this._timer = 5 + Math.random() * 10;
      }
    } else if (this._state === 'alert') {
      // Look toward player
      const dx = playerPos.x - this.pos.x;
      const dz = playerPos.z - this.pos.z;
      this._yawTarget = Math.atan2(dx, dz);
    }

    // Smooth yaw
    let dyaw = this._yawTarget - this.yaw;
    while (dyaw > Math.PI) dyaw -= Math.PI * 2;
    while (dyaw < -Math.PI) dyaw += Math.PI * 2;
    this.yaw += dyaw * Math.min(1, 3.5 * delta);

    // Leg animation
    const walking = (this._state === 'walking' || this._state === 'flee' || this._state === 'approach');
    const freq    = this._state === 'flee' ? 8.0 : 4.5;
    this._phase  += delta * (walking ? freq : 0.8);
    const swing   = walking ? 0.45 : 0.04;
    this._legs[0].rotation.x =  Math.sin(this._phase) * swing;
    this._legs[1].rotation.x = -Math.sin(this._phase) * swing;
    this._legs[2].rotation.x = -Math.sin(this._phase) * swing;
    this._legs[3].rotation.x =  Math.sin(this._phase) * swing;

    // Head bob
    if (this._state === 'grazing') {
      this._headRef.position.z = 0.50 + Math.sin(elapsed * 0.9 + this._phase * 0.2) * 0.04;
      this._headRef.position.y = 1.36 + Math.sin(elapsed * 0.9 + this._phase * 0.2) * 0.05;
    } else if (this._state === 'alert') {
      this._headRef.position.y = lerp(this._headRef.position.y, 1.46, 4 * delta);
    } else {
      this._headRef.position.y = lerp(this._headRef.position.y, 1.36, 3 * delta);
    }

    // Apply
    this._group.position.set(this.pos.x, 0, this.pos.z);
    this._group.rotation.y = this.yaw;
  }

  _nextState(playerPos, distP) {
    const r = Math.random();
    if (this._state === 'flee') { this._state = 'grazing'; this._timer = 10; return; }
    if (distP < 13 && r < 0.25) { // curious approach
      this._state = 'approach';
      this._target.set(playerPos.x + randF(-1,1), 0, playerPos.z + randF(-1,1));
      this._timer = 6 + Math.random() * 5;
    } else if (r < 0.5) {
      this._state = 'grazing';
      this._timer = 5 + Math.random() * 10;
    } else {
      this._state = 'walking';
      this._pickTarget(playerPos, false);
      this._timer = 12;
    }
  }

  _pickTarget(playerPos, flee) {
    const angle = flee
      ? Math.atan2(this.pos.x - playerPos.x, this.pos.z - playerPos.z) + randF(-0.5, 0.5)
      : Math.random() * Math.PI * 2;
    const dist = flee ? randF(12, 22) : randF(5, 18);
    this._target.set(
      this.pos.x + Math.sin(angle) * dist,
      0,
      this.pos.z + Math.cos(angle) * dist
    );
    this._target.x = THREE.MathUtils.clamp(this._target.x, -60, 60);
    this._target.z = THREE.MathUtils.clamp(this._target.z, -110, 60);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  BUTTERFLY
// ═══════════════════════════════════════════════════════════════════════════════

const BUTTERFLY_PALETTES = [
  [0xff7f00, 0x1a0800], // monarch orange
  [0x4488ff, 0xffffff], // blue morpho
  [0xffe040, 0x884400], // yellow swallowtail
  [0xcc44cc, 0xffffff], // purple
];

function buildButterflyMesh() {
  const palette = BUTTERFLY_PALETTES[randI(0, BUTTERFLY_PALETTES.length)];
  const group   = new THREE.Group();

  const wingMat = new THREE.MeshStandardMaterial({
    color: palette[0], roughness: 0.7, metalness: 0.1,
    side: THREE.DoubleSide, transparent: true, opacity: 0.85,
  });
  const bodyMat = new THREE.MeshStandardMaterial({ color: palette[1], roughness: 0.9 });

  // Body
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.012, 0.14, 6), bodyMat);
  group.add(body);

  // 4 wings (2 per side), stored for flap
  const wings = [];
  const sc = 0.11 + Math.random() * 0.06;
  [[-1, 1, 0.10], [-1, -0.6, 0.05], [1, 1, 0.10], [1, -0.6, 0.05]]
    .forEach(([side, yScale, xOff]) => {
      const wGeo = new THREE.SphereGeometry(1, 5, 3);
      wGeo.scale(sc * 1.4, sc * Math.abs(yScale) * 1.1, sc * 0.12);
      const wing = new THREE.Mesh(wGeo, wingMat);
      wing.position.set(side * (sc + 0.01), xOff * sc, 0);
      wing.userData.side = side;
      group.add(wing);
      wings.push(wing);
    });

  return { group, wings, sc };
}

class Butterfly {
  constructor(scene, startPos) {
    const { group, wings, sc } = buildButterflyMesh();
    this._group = group;
    this._wings = wings;
    scene.add(group);

    // Orbit center and phase
    this._center = startPos.clone();
    this._phase  = Math.random() * Math.PI * 2;
    this._vphase = Math.random() * Math.PI * 2;
    this._flapPh = Math.random() * Math.PI * 2;
    this._radius = randF(0.8, 2.5);
    this._speed  = randF(0.5, 1.2);
    this._height = startPos.y + randF(0.5, 2.2);
    this._wander = 0;
  }

  update(delta, elapsed) {
    this._phase  += delta * this._speed;
    this._vphase += delta * 0.7;
    this._flapPh += delta * 9.0;
    this._wander += delta * 0.2;

    // Occasionally drift the orbit center
    if (Math.random() < 0.001) {
      this._center.x += randF(-5, 5);
      this._center.z += randF(-5, 5);
      this._center.x = THREE.MathUtils.clamp(this._center.x, -55, 55);
      this._center.z = THREE.MathUtils.clamp(this._center.z, -110, 55);
    }

    const x = this._center.x + Math.cos(this._phase) * this._radius;
    const z = this._center.z + Math.sin(this._phase * 1.3) * this._radius;
    const y = this._height + Math.sin(this._vphase) * 0.3;

    this._group.position.set(x, y, z);

    // Face direction of travel
    const vx = -Math.sin(this._phase) * this._speed;
    const vz =  Math.cos(this._phase * 1.3) * 1.3 * this._speed;
    if (Math.abs(vx) + Math.abs(vz) > 0.01) {
      this._group.rotation.y = Math.atan2(vx, vz);
    }

    // Wing flap
    const flapAngle = Math.sin(this._flapPh) * 0.9;
    this._wings.forEach(w => {
      w.rotation.y = w.userData.side * flapAngle;
    });

    // Gentle body tilt
    this._group.rotation.z = Math.sin(this._phase * 2) * 0.18;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  RABBIT
// ═══════════════════════════════════════════════════════════════════════════════

function buildRabbitMesh() {
  const group = new THREE.Group();
  const colPalette = Math.random() < 0.5 ? 0xC8B090 : 0x888888;
  const bodyM = new THREE.MeshStandardMaterial({ color: colPalette, roughness: 0.9 });
  const bellyM = new THREE.MeshStandardMaterial({ color: 0xf0e8dc, roughness: 0.9 });
  const eyeM  = new THREE.MeshStandardMaterial({ color: 0x100508, roughness: 0.3, metalness: 0.5 });
  const noseM = new THREE.MeshStandardMaterial({ color: 0xcc6688, roughness: 0.8 });

  // Body
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.18, 7, 5), bodyM);
  body.scale.set(1,0.85,1.1); body.castShadow = true; group.add(body);

  // Belly
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.13, 6, 4), bellyM);
  belly.scale.set(0.9,0.6,0.9); belly.position.set(0,-0.04,0.04); group.add(belly);

  // Head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.125, 7, 5), bodyM);
  head.position.set(0,0.20,0.12); head.castShadow = true; group.add(head);

  // Ears
  [-1,1].forEach(s => {
    const ear = new THREE.Mesh(new THREE.CapsuleGeometry(0.030,0.20,4,5), bodyM);
    ear.position.set(s*0.07,0.45,0.12); ear.castShadow = true; group.add(ear);
    const inner = new THREE.Mesh(new THREE.CapsuleGeometry(0.018,0.15,4,5), noseM);
    inner.position.set(s*0.07,0.44,0.125); inner.scale.set(0.6,1,0.4); group.add(inner);
  });

  // Eyes
  [-1,1].forEach(s => {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.022,5,4), eyeM);
    e.position.set(s*0.075,0.245,0.22); group.add(e);
  });

  // Nose
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.016,5,4), noseM);
  nose.position.set(0,0.195,0.245); group.add(nose);

  // Tail
  const tail = new THREE.Mesh(new THREE.SphereGeometry(0.055,5,4), bellyM);
  tail.position.set(0,0.05,-0.20); group.add(tail);

  // Legs (front pair visible)
  [[0.10,0,-0.05],[-0.10,0,-0.05]].forEach(([x,y,z])=>{
    const l = new THREE.Mesh(new THREE.CapsuleGeometry(0.025,0.10,4,5), bodyM);
    l.position.set(x,y,z); l.rotation.x=0.5; group.add(l);
  });

  return { group, head };
}

class Rabbit {
  constructor(scene, startPos) {
    const { group, head } = buildRabbitMesh();
    this._group = group;
    this._head  = head;
    scene.add(group);

    this.pos     = startPos.clone();
    this._target = startPos.clone();
    this._yaw    = Math.random() * Math.PI * 2;
    this._state  = 'idle';
    this._timer  = 3 + Math.random() * 6;
    this._jumpArc = 0;
    this._jumping = false;
    this._jumpFrom = startPos.clone();
    this._jumpTo   = startPos.clone();
    this._jumpT    = 0;
    this._jumpDur  = 0.5;
  }

  update(delta, playerPos) {
    const distP = this.pos.distanceTo(playerPos);
    this._timer -= delta;

    // Flee if player very close
    if (distP < 4 && this._state !== 'flee') {
      this._state = 'flee';
      this._timer = 5;
      this._pickTarget(playerPos, true);
    } else if (this._state === 'flee' && this._timer <= 0) {
      this._state = 'idle';
      this._timer = 4 + Math.random() * 6;
    } else if (this._timer <= 0) {
      this._nextState();
    }

    // Hop movement
    if (this._jumping) {
      this._jumpT += delta / this._jumpDur;
      if (this._jumpT >= 1) { this._jumpT = 1; this._jumping = false; }
      this.pos.lerpVectors(this._jumpFrom, this._jumpTo, this._jumpT);
      this.pos.y = Math.sin(this._jumpT * Math.PI) * 0.28;
    }

    this._group.position.copy(this.pos);
    this._group.rotation.y = this._yaw;

    // Ear twitch
    this._group.children.forEach(c => {
      if (c.userData && c.userData.ear) {
        c.rotation.z = Math.sin(Date.now() * 0.001 + this._yaw) * 0.12;
      }
    });
  }

  _nextState() {
    const r = Math.random();
    if (r < 0.4) {
      this._state = 'idle';
      this._timer = 2 + Math.random() * 4;
    } else {
      this._state = 'hopping';
      this._pickTarget(null, false);
      this._timer = 6;
      this._doHop();
    }
  }

  _doHop() {
    this._jumpFrom.copy(this.pos);
    this._jumpTo.set(
      this._target.x, 0, this._target.z
    );
    this._jumpT   = 0;
    this._jumping = true;
    const dx = this._target.x - this.pos.x;
    const dz = this._target.z - this.pos.z;
    this._yaw = Math.atan2(dx, dz);
  }

  _pickTarget(playerPos, flee) {
    const angle = flee
      ? Math.atan2(this.pos.x - playerPos.x, this.pos.z - playerPos.z) + randF(-0.8, 0.8)
      : Math.random() * Math.PI * 2;
    const dist = flee ? randF(8, 18) : randF(1.5, 5);
    this._target.set(
      THREE.MathUtils.clamp(this.pos.x + Math.sin(angle) * dist, -55, 55),
      0,
      THREE.MathUtils.clamp(this.pos.z + Math.cos(angle) * dist, -110, 55)
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  FIREFLIES
// ═══════════════════════════════════════════════════════════════════════════════

class FireflySystem {
  constructor(scene) {
    this._scene  = scene;
    this._count  = 90;
    this._pos    = new Float32Array(this._count * 3);
    this._phases = new Float32Array(this._count);
    this._speeds = new Float32Array(this._count);
    this._basePos = new Float32Array(this._count * 3);

    for (let i = 0; i < this._count; i++) {
      const x = (Math.random() - 0.5) * 80;
      const z = (Math.random() - 0.5) * 100;
      const y = 0.4 + Math.random() * 2.5;
      this._basePos[i*3]   = this._pos[i*3]   = x;
      this._basePos[i*3+1] = this._pos[i*3+1] = y;
      this._basePos[i*3+2] = this._pos[i*3+2] = z;
      this._phases[i] = Math.random() * Math.PI * 2;
      this._speeds[i] = 0.6 + Math.random() * 1.0;
    }

    const geo = new THREE.BufferGeometry();
    this._posAttr = new THREE.BufferAttribute(this._pos, 3);
    geo.setAttribute('position', this._posAttr);

    // Custom vertex colors for blink effect baked into sizes
    const sizes = new Float32Array(this._count).fill(6.0);
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    this._mat = new THREE.PointsMaterial({
      color: 0x99ff55, size: 0.12, transparent: true, opacity: 0,
      sizeAttenuation: true, depthWrite: false,
    });
    this._points = new THREE.Points(geo, this._mat);
    scene.add(this._points);

    // A few point lights for glow (fewer for perf)
    this._lights = [];
    for (let i = 0; i < 6; i++) {
      const pl = new THREE.PointLight(0x88ff44, 0, 4.5, 3);
      scene.add(pl);
      this._lights.push({ light: pl, idx: Math.floor(i * (this._count / 6)) });
    }
  }

  update(delta, isEvening, elapsed) {
    const targetOpacity = isEvening ? 0.88 : 0;
    this._mat.opacity = lerp(this._mat.opacity, targetOpacity, 1.5 * delta);

    if (this._mat.opacity < 0.01) return;

    for (let i = 0; i < this._count; i++) {
      this._phases[i] += delta * this._speeds[i];
      const ph = this._phases[i];
      this._pos[i*3]   = this._basePos[i*3]   + Math.sin(ph * 0.7) * 1.2;
      this._pos[i*3+1] = this._basePos[i*3+1] + Math.sin(ph * 1.4) * 0.45;
      this._pos[i*3+2] = this._basePos[i*3+2] + Math.cos(ph * 0.6) * 1.2;
    }
    this._posAttr.needsUpdate = true;

    // Update glow lights
    this._lights.forEach(({ light, idx }) => {
      const blink = Math.max(0, Math.sin(elapsed * 2.5 + this._phases[idx] * 3));
      light.intensity = isEvening ? blink * 1.8 * this._mat.opacity : 0;
      light.position.set(
        this._pos[idx*3], this._pos[idx*3+1], this._pos[idx*3+2]
      );
    });
  }

  dispose() {
    this._scene.remove(this._points);
    this._lights.forEach(({ light }) => this._scene.remove(light));
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  ANIMALS (top-level manager)
// ═══════════════════════════════════════════════════════════════════════════════

export class Animals {
  constructor(scene) {
    // Spawn deer in forest/meadow areas
    const deerSpawns = [
      new THREE.Vector3(-18, 0, -20),
      new THREE.Vector3( 35, 0, -28),
      new THREE.Vector3(-30, 0,  10),
      new THREE.Vector3( 40, 0,  18),
    ];
    this._deer = deerSpawns.map(p => new Deer(scene, p));

    // Butterflies near cherry trees and meadows
    const bfSpawns = [
      new THREE.Vector3(-3, 1, -3),
      new THREE.Vector3( 2, 1,  2),
      new THREE.Vector3(-8, 1,  6),
      new THREE.Vector3( 5, 1, -10),
      new THREE.Vector3(-14, 1, 8),
      new THREE.Vector3( 12, 1, -5),
      new THREE.Vector3(-5,  1,  14),
      new THREE.Vector3( 18, 1,  3),
    ];
    this._butterflies = bfSpawns.map(p => new Butterfly(scene, p));

    // Rabbits in meadow/grass areas
    const rabbitSpawns = [
      new THREE.Vector3(-8,  0, -10),
      new THREE.Vector3( 6,  0,  12),
      new THREE.Vector3(-20, 0,  8),
      new THREE.Vector3( 15, 0,  22),
      new THREE.Vector3(-5,  0, -18),
    ];
    this._rabbits = rabbitSpawns.map(p => new Rabbit(scene, p));

    this._fireflies = new FireflySystem(scene);
  }

  update(delta, playerPos, isEvening, elapsed) {
    this._deer.forEach(d => d.update(delta, playerPos, elapsed));
    this._butterflies.forEach(b => b.update(delta, elapsed));
    this._rabbits.forEach(r => r.update(delta, playerPos));
    this._fireflies.update(delta, isEvening, elapsed);
  }
}
