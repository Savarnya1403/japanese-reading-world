import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';

export class PDFReader {
  constructor() {
    this._doc        = null;
    this._cache      = {};
    this._scale      = 1.5;
    this.totalPages  = 0;
  }

  get hasDoc() { return !!this._doc; }

  async loadFile(file) {
    this._cache = {};
    this.totalPages = 0;
    try {
      const buf  = await file.arrayBuffer();
      this._doc  = await pdfjsLib.getDocument({ data: buf }).promise;
      this.totalPages = this._doc.numPages;
      return true;
    } catch (err) {
      console.error('PDF load error:', err);
      return false;
    }
  }

  async renderToCanvas(canvas, pageNum, scale) {
    if (!this._doc) return;
    scale   = scale || this._scale;
    pageNum = Math.max(1, Math.min(pageNum, this.totalPages));

    const key = `${pageNum}:${scale}`;
    const ctx = canvas.getContext('2d');

    if (this._cache[key]) {
      const d = this._cache[key];
      canvas.width = d.width; canvas.height = d.height;
      ctx.putImageData(d, 0, 0);
      return;
    }

    const page     = await this._doc.getPage(pageNum);
    const viewport = page.getViewport({ scale });
    canvas.width   = viewport.width;
    canvas.height  = viewport.height;
    await page.render({ canvasContext: ctx, viewport }).promise;

    // Cache up to 12 pages
    const keys = Object.keys(this._cache);
    if (keys.length >= 12) delete this._cache[keys[0]];
    this._cache[key] = ctx.getImageData(0, 0, canvas.width, canvas.height);
  }

  setScale(s) {
    this._scale = Math.max(0.5, Math.min(3.5, s));
    this._cache = {};
  }
}
