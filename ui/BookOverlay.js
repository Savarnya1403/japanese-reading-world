export class BookOverlay {
  constructor(pdfReader, { onStand }) {
    this._pdf      = pdfReader;
    this._onStand  = onStand;
    this.isOpen    = false;
    this.isLowered = false;

    this._page    = 1;
    this._lowerT  = 0;
    this._lowerD  = 0;

    this._coffeeReady = false;  // set by main when coffee landed

    // DOM refs
    this._overlay  = document.getElementById('reading-overlay');
    this._bookEl   = document.getElementById('book-container');
    this._blurEl   = document.getElementById('reading-blur');
    this._canvas   = document.getElementById('book-page-canvas');
    this._pageInfo = document.getElementById('book-page-info');

    this._bindKeys();
    this._bindButtons();
  }

  // Call from CoffeeManager when cup lands
  notifyCoffeeReady() { this._coffeeReady = true; }

  async open() {
    if (!this._pdf.hasDoc) return false;
    this.isOpen = true; this.isLowered = false;
    this._overlay.classList.remove('hidden');
    this._blurEl.style.opacity = '1';
    this._bookEl.classList.remove('book-lowered');
    this._bookEl.classList.add('book-raised');
    await this._render();
    return true;
  }

  async lower() {
    if (this.isLowered) return;
    this.isLowered = true;
    this._lowerD = 5 + Math.random() * 5;
    this._lowerT = 0;

    this._bookEl.classList.add('book-lowered');
    this._blurEl.style.opacity = '0';

    // 40% chance to drink coffee if available
    if (this._coffeeReady && Math.random() < 0.4) {
      setTimeout(() => this._drinkCoffeeAnim(), 700);
    }
  }

  raise() {
    if (!this.isLowered) return;
    this.isLowered = false;
    this._lowerT   = 0;
    this._bookEl.classList.remove('book-lowered');
    this._blurEl.style.opacity = '1';
  }

  close() {
    this.isOpen = false; this.isLowered = false;
    this._overlay.classList.add('hidden');
    this._onStand?.();
  }

  update(delta) {
    if (!this.isOpen || !this.isLowered) return;
    this._lowerT += delta;
    if (this._lowerT >= this._lowerD) this.raise();
  }

  // ── Page navigation ───────────────────────────────────────────────────────────
  async _render() {
    if (!this._pdf.hasDoc) return;
    this._pageInfo.textContent = `${this._page} / ${this._pdf.totalPages}`;
    await this._pdf.renderToCanvas(this._canvas, this._page);
  }

  async _goNext() {
    if (this._page >= this._pdf.totalPages || this.isLowered) return;
    this._page++;
    await this._flipAnim();
  }

  async _goPrev() {
    if (this._page <= 1 || this.isLowered) return;
    this._page--;
    await this._flipAnim();
  }

  async _flipAnim() {
    this._canvas.classList.add('page-flip-out');
    await _delay(220);
    await this._render();
    this._canvas.classList.remove('page-flip-out');
    void this._canvas.offsetWidth;
    this._canvas.classList.add('page-reveal');
    await _delay(300);
    this._canvas.classList.remove('page-reveal');
  }

  _drinkCoffeeAnim() {
    if (!this._coffeeReady) return;
    this._coffeeReady = false;

    const el = document.getElementById('coffee-drink-anim');
    if (!el) return;
    el.classList.remove('hidden');
    el.classList.add('drinking');
    el.addEventListener('animationend', () => {
      el.classList.remove('drinking');
      el.classList.add('hidden');
    }, { once: true });
  }

  // ── Key bindings ──────────────────────────────────────────────────────────────
  _bindKeys() {
    window.addEventListener('keydown', async (e) => {
      if (!this.isOpen) return;
      if (e.code === 'Space') {
        e.preventDefault();
        if (this.isLowered) this.raise(); else await this.lower();
      }
      if (e.code === 'KeyE' || e.code === 'Escape') this.close();
      if (!this.isLowered) {
        if (e.code === 'ArrowRight' || e.code === 'KeyD') await this._goNext();
        if (e.code === 'ArrowLeft'  || e.code === 'KeyA') await this._goPrev();
      }
    });
  }

  _bindButtons() {
    document.getElementById('book-btn-prev')?.addEventListener('click',  () => this._goPrev());
    document.getElementById('book-btn-next')?.addEventListener('click',  () => this._goNext());
    document.getElementById('book-btn-close')?.addEventListener('click', () => this.close());
    document.getElementById('book-btn-zoom-in')?.addEventListener('click',  () => {
      this._pdf.setScale(this._pdf._scale + 0.25);
      this._render();
    });
    document.getElementById('book-btn-zoom-out')?.addEventListener('click', () => {
      this._pdf.setScale(this._pdf._scale - 0.25);
      this._render();
    });
  }
}

function _delay(ms) { return new Promise(r => setTimeout(r, ms)); }
