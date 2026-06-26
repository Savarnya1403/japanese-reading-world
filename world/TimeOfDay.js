import * as THREE from 'three';
import { lerp } from '../utils/helpers.js';

const _c = (hex) => new THREE.Color(hex);

const PRESETS = {
  morning: {
    zenith:    _c(0x1565c0), mid:     _c(0x42a5f5),
    horizon:   _c(0xffe0b2), low:     _c(0xfff8e1),
    sunDir:    new THREE.Vector3(0.6, 0.55, -0.5).normalize(),
    nightBlend: 0.0,
    hemiSky:   _c(0x7ac0ff), hemiGround: _c(0x3a5020), hemiInt: 0.70,
    sunColor:  _c(0xfff3e0), sunInt: 2.2,
    fogColor:  _c(0xadd8f5), fogDensity: 0.008,
  },
  'evening-orange': {
    zenith:    _c(0x1a0a3d), mid:     _c(0x7a1a20),
    horizon:   _c(0xff5510), low:     _c(0xff9933),
    sunDir:    new THREE.Vector3(0.2, 0.1, -1.0).normalize(),
    nightBlend: 0.6,
    hemiSky:   _c(0x664488), hemiGround: _c(0x331a0a), hemiInt: 0.45,
    sunColor:  _c(0xff6622), sunInt: 1.6,
    fogColor:  _c(0x5a2a18), fogDensity: 0.012,
  },
  'evening-purple': {
    zenith:    _c(0x080415), mid:     _c(0x2d1055),
    horizon:   _c(0x8a2560), low:     _c(0xcc6680),
    sunDir:    new THREE.Vector3(0.2, 0.08, -1.0).normalize(),
    nightBlend: 0.85,
    hemiSky:   _c(0x442266), hemiGround: _c(0x1a0a22), hemiInt: 0.35,
    sunColor:  _c(0xbb6688), sunInt: 1.1,
    fogColor:  _c(0x3a1a40), fogDensity: 0.012,
  },
};

export class TimeOfDay {
  constructor(scene, { skyUniforms, sunLight, hemiLight }) {
    this._sky  = skyUniforms;
    this._sun  = sunLight;
    this._hemi = hemiLight;
    this._fog  = scene.fog;

    this.currentTime = 'morning';
    this._from = 'morning';
    this._to   = 'morning';
    this._t    = 1.0;
    this._dur  = 30;

    this._nextChange = 90 + Math.random() * 90;
    this._elapsed    = 0;

    this._apply(PRESETS.morning, 1.0);
  }

  update(delta) {
    this._elapsed += delta;
    this._nextChange -= delta;

    if (this._nextChange <= 0) {
      const times = Object.keys(PRESETS).filter(k => k !== this.currentTime);
      this._startTransition(times[Math.floor(Math.random() * times.length)]);
      this._nextChange = 120 + Math.random() * 120;
    }

    if (this._t < 1.0) {
      this._t = Math.min(1.0, this._t + delta / this._dur);
      const a = PRESETS[this._from], b = PRESETS[this._to];
      this._apply(a, 1 - this._t);
      this._blend(b, this._t);
      if (this._t >= 1.0) this.currentTime = this._to;
    }
  }

  _startTransition(toTime) {
    this._from = this.currentTime;
    this._to   = toTime;
    this._t    = 0;
    this._dur  = 25 + Math.random() * 15;
  }

  _apply(p, w) {
    if (w === 1.0) {
      this._sky.u_zenith.value.copy(p.zenith);
      this._sky.u_mid.value.copy(p.mid);
      this._sky.u_horizon.value.copy(p.horizon);
      this._sky.u_low.value.copy(p.low);
      this._sky.u_sunDir.value.copy(p.sunDir);
      this._sky.u_nightBlend.value = p.nightBlend;
      this._hemi.color.copy(p.hemiSky);
      this._hemi.groundColor.copy(p.hemiGround);
      this._hemi.intensity = p.hemiInt;
      this._sun.color.copy(p.sunColor);
      this._sun.intensity = p.sunInt;
      this._sun.position.copy(p.sunDir).multiplyScalar(80);
      if (this._fog) {
        this._fog.color.copy(p.fogColor);
        this._fog.density = p.fogDensity;
      }
    }
  }

  _blend(p, t) {
    this._sky.u_zenith.value.lerp(p.zenith, t);
    this._sky.u_mid.value.lerp(p.mid, t);
    this._sky.u_horizon.value.lerp(p.horizon, t);
    this._sky.u_low.value.lerp(p.low, t);
    this._sky.u_sunDir.value.lerp(p.sunDir, t);
    this._sky.u_nightBlend.value = lerp(this._sky.u_nightBlend.value, p.nightBlend, t);
    this._hemi.color.lerp(p.hemiSky, t);
    this._hemi.groundColor.lerp(p.hemiGround, t);
    this._hemi.intensity = lerp(this._hemi.intensity, p.hemiInt, t);
    this._sun.color.lerp(p.sunColor, t);
    this._sun.intensity = lerp(this._sun.intensity, p.sunInt, t);
    this._sun.position.lerp(p.sunDir.clone().multiplyScalar(80), t);
    if (this._fog) {
      this._fog.color.lerp(p.fogColor, t);
      this._fog.density = lerp(this._fog.density, p.fogDensity, t);
    }
  }

  get isEvening() {
    return this.currentTime !== 'morning';
  }
}
