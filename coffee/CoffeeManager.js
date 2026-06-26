import * as THREE from 'three';
import { parabolicArc, lerp } from '../utils/helpers.js';
import { SteamSystem } from '../utils/particles.js';

/**
 * Manages coffee ordering, delivery arc animation, and cup placement on table.
 */
export class CoffeeManager {
  constructor(scene, stallPos, tablePos) {
    this.scene     = scene;
    this.stallPos  = stallPos.clone();
    this.tablePos  = tablePos.clone();
    this.cups      = [];
    this.cupCount  = 0;
    this.isDelivering = false;
    this.coffeeReady  = false;
    this._bookOverlay = null;

    // Active delivery state
    this._arc      = [];
    this._arcIdx   = 0;
    this._arcSpeed = 28;    // points per second
    this._activeCup = null;
    this._steam    = null;

    this._notifTimer = 0;

    this._updateCounter();
  }

  setBookOverlay(bookOverlay) { this._bookOverlay = bookOverlay; }

  // ── Order ──────────────────────────────────────────────
  order() {
    if (this.isDelivering) return;
    this.isDelivering = true;

    const cup = this._buildCup();
    cup.position.copy(this.stallPos);
    this.scene.add(cup);
    this._activeCup = cup;

    // Build arc from stall to table (staggered resting positions)
    const offset = (this.cupCount % 5) * 0.45 - 0.9;
    const dest = this.tablePos.clone().add(new THREE.Vector3(offset, 0.5, 0.4));
    this._arc    = parabolicArc(this.stallPos.clone().setY(1.1), dest, 4.0, 50);
    this._arcIdx = 0;

    this._steam  = new SteamSystem(this.scene, this.stallPos.clone().setY(1.4));

    this._showNotif('☕ On its way!');
  }

  // ── Update ─────────────────────────────────────────────
  update(delta) {
    if (this._steam) this._steam.update(delta);

    if (!this.isDelivering || !this._activeCup) return;

    this._arcIdx = Math.min(
      this._arcIdx + this._arcSpeed * delta,
      this._arc.length - 1
    );
    const pt = this._arc[Math.floor(this._arcIdx)];
    this._activeCup.position.copy(pt);

    // Rotate cup while flying
    this._activeCup.rotation.y += delta * 1.5;

    // Update steam to follow cup
    if (this._steam) this._steam.position.copy(pt.clone().add(new THREE.Vector3(0, 0.2, 0)));

    if (this._arcIdx >= this._arc.length - 1) {
      this._onLand();
    }
  }

  _onLand() {
    if (!this._activeCup) return;
    this._activeCup.rotation.y = 0;
    this.cups.push(this._activeCup);
    this.cupCount++;
    this._activeCup = null;
    this.isDelivering = false;
    if (this._steam) { this._steam.dispose(); this._steam = null; }
    this.coffeeReady = true;
    this._bookOverlay?.notifyCoffeeReady();
    this._updateCounter();
    this._showNotif('☕ Here you go! Enjoy ♡');
  }

  // ── Build cup mesh ─────────────────────────────────────
  _buildCup() {
    const group = new THREE.Group();

    const cupMat = new THREE.MeshLambertMaterial({ color: 0xf5ecd7 });
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.09, 0.22, 12),
      cupMat
    );
    body.castShadow = true;
    group.add(body);

    // Coffee surface
    const coffeeMat = new THREE.MeshLambertMaterial({ color: 0x3d1a00 });
    const liquid = new THREE.Mesh(new THREE.CircleGeometry(0.115, 12), coffeeMat);
    liquid.rotation.x = -Math.PI / 2;
    liquid.position.y = 0.108;
    group.add(liquid);

    // Handle
    const handleMat = new THREE.MeshLambertMaterial({ color: 0xe8d5b0 });
    const handle = new THREE.Mesh(
      new THREE.TorusGeometry(0.07, 0.018, 6, 10, Math.PI),
      handleMat
    );
    handle.rotation.y = Math.PI / 2;
    handle.position.set(0.14, 0, 0);
    group.add(handle);

    // Saucer
    const saucer = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.18, 0.03, 12),
      new THREE.MeshLambertMaterial({ color: 0xf0e0c0 })
    );
    saucer.position.y = -0.12;
    group.add(saucer);

    return group;
  }

  // ── UI helpers ─────────────────────────────────────────
  _updateCounter() {
    const counter = document.getElementById('coffee-counter');
    const count   = document.getElementById('coffee-count');
    if (!counter || !count) return;
    if (this.cupCount > 0) {
      counter.classList.remove('hidden');
      count.textContent = this.cupCount;
    }
  }

  _showNotif(msg) {
    const el = document.getElementById('coffee-notif');
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
    clearTimeout(this._notifTimer);
    this._notifTimer = setTimeout(() => el.classList.add('hidden'), 3000);
  }

  dispose() {
    this.cups.forEach(c => { this.scene.remove(c); });
    if (this._activeCup) this.scene.remove(this._activeCup);
    if (this._steam) this._steam.dispose();
  }
}
