export class UIManager {
  constructor({ onUpload, onCoffee, onSitRead, onUploadKey }) {
    this._onUpload    = onUpload;
    this._onCoffee    = onCoffee;
    this._onSitRead   = onSitRead;
    this._onUploadKey = onUploadKey;

    this._currentHint = '';
    this._hintEl  = document.getElementById('hint-box');
    this._hudEl   = document.getElementById('hud');

    this._bindButtons();
    this._bindFileInput();
  }

  showHUD() {
    this._hudEl?.classList.remove('hidden');
    this._fadeControlsHelp();
  }

  showHint(msg) {
    if (!this._hintEl || this._currentHint === msg) return;
    this._currentHint = msg;
    this._hintEl.textContent = msg;
    this._hintEl.classList.remove('hidden');
  }

  hideHint(msg) {
    if (msg && this._currentHint !== msg) return;
    this._currentHint = '';
    this._hintEl?.classList.add('hidden');
  }

  clearHint() {
    this._currentHint = '';
    this._hintEl?.classList.add('hidden');
  }

  _fadeControlsHelp() {
    const el = document.getElementById('controls-help');
    if (!el) return;
    setTimeout(() => el.classList.add('fade-out'), 6000);
  }

  _bindButtons() {
    document.getElementById('btn-upload')?.addEventListener('click', () => {
      document.getElementById('file-input')?.click();
    });
    document.getElementById('btn-coffee')?.addEventListener('click', () => this._onCoffee?.());
    window.addEventListener('keydown', e => {
      if (e.code === 'KeyC') this._onCoffee?.();
      if (e.code === 'KeyE') this._onSitRead?.();
      if (e.code === 'Enter') this._onUploadKey?.();
    });
  }

  _bindFileInput() {
    const input = document.getElementById('file-input');
    if (!input) return;
    input.addEventListener('change', e => {
      const file = e.target.files?.[0];
      if (file?.type === 'application/pdf') this._onUpload?.(file);
      input.value = '';
    });
  }

  setUploadLabel(text) {
    const btn = document.getElementById('btn-upload');
    if (btn) btn.textContent = text;
  }

  setCoffeeEnabled(enabled) {
    const btn = document.getElementById('btn-coffee');
    if (btn) btn.disabled = !enabled;
  }
}
