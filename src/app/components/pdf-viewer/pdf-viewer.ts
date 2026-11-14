import { Component, ElementRef, OnDestroy, computed, effect, inject, input, signal, viewChild, viewChildren } from '@angular/core';
import type { PDFDocumentLoadingTask, PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';
import { VaultService } from '../../core/vault.service';

type PdfJs = typeof import('pdfjs-dist');

interface PageBox {
  number: number;
  /** width / height, so the empty box has the right shape before the page is drawn */
  aspect: number;
}

/** Sharpness on high-density screens, capped so phones don't run out of memory. */
const MAX_PIXEL_RATIO = 2;

let pdfJs: Promise<PdfJs> | null = null;

/** The PDF library is large, so it is only downloaded the first time a lab sheet is opened. */
function loadPdfJs(): Promise<PdfJs> {
  pdfJs ??= import('pdfjs-dist').then((lib) => {
    lib.GlobalWorkerOptions.workerSrc = new URL('pdfjs/pdf.worker.min.mjs', document.baseURI).href;
    return lib;
  });
  return pdfJs;
}

/**
 * Shows one encrypted lab sheet. The file is decrypted in the browser and
 * drawn page by page (each page only when it scrolls into view), with its
 * web links kept clickable and a button to download the original PDF.
 */
@Component({
  selector: 'app-pdf-viewer',
  templateUrl: './pdf-viewer.html',
  styleUrl: './pdf-viewer.css',
})
export class PdfViewer implements OnDestroy {
  /** Path of the file inside private/files/ */
  readonly file = input.required<string>();
  readonly title = input('');

  private readonly vault = inject(VaultService);

  protected readonly state = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly pages = signal<PageBox[]>([]);
  protected readonly downloadUrl = signal<string | null>(null);
  protected readonly fileName = computed(() => this.file().split('/').pop() ?? 'lab-sheet.pdf');

  private readonly scroller = viewChild<ElementRef<HTMLElement>>('scroller');
  private readonly pageBoxes = viewChildren<ElementRef<HTMLElement>>('pageBox');

  private loadingTask: PDFDocumentLoadingTask | null = null;
  private document: PDFDocumentProxy | null = null;
  private observer: IntersectionObserver | null = null;
  private drawQueue: Promise<void> = Promise.resolve();
  private destroyed = false;

  constructor() {
    effect(() => void this.load(this.file()));

    // Once the page boxes exist, draw each page when it comes into view.
    effect(() => {
      const boxes = this.pageBoxes();
      const scroller = this.scroller()?.nativeElement;
      if (!boxes.length || !scroller) return;

      this.observer?.disconnect();
      this.observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            this.observer?.unobserve(entry.target);
            this.queueDraw(entry.target as HTMLElement);
          }
        },
        { root: scroller, rootMargin: '100% 0px' },
      );
      for (const box of boxes) {
        if (!box.nativeElement.dataset['drawn']) this.observer.observe(box.nativeElement);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.observer?.disconnect();
    void this.loadingTask?.destroy();
  }

  private async load(file: string): Promise<void> {
    this.state.set('loading');
    try {
      const [lib, url] = await Promise.all([loadPdfJs(), this.vault.fileUrl(file)]);
      if (this.destroyed) return;
      this.downloadUrl.set(url);

      const assets = new URL('pdfjs/', document.baseURI).href;
      this.loadingTask = lib.getDocument({
        url,
        cMapUrl: `${assets}cmaps/`,
        cMapPacked: true,
        standardFontDataUrl: `${assets}standard_fonts/`,
        wasmUrl: `${assets}wasm/`,
        iccUrl: `${assets}iccs/`,
      });
      const pdf = await this.loadingTask.promise;
      if (this.destroyed) return;
      this.document = pdf;

      const boxes: PageBox[] = [];
      for (let n = 1; n <= pdf.numPages; n++) {
        const viewport = (await pdf.getPage(n)).getViewport({ scale: 1 });
        boxes.push({ number: n, aspect: viewport.width / viewport.height });
      }
      this.pages.set(boxes);
      this.state.set('ready');
    } catch {
      if (!this.destroyed) this.state.set('error');
    }
  }

  /** Pages are drawn one at a time so scrolling stays smooth. */
  private queueDraw(box: HTMLElement): void {
    this.drawQueue = this.drawQueue.then(() => this.draw(box)).catch(() => undefined);
  }

  private async draw(box: HTMLElement): Promise<void> {
    if (this.destroyed || !this.document || box.dataset['drawn']) return;
    box.dataset['drawn'] = 'true';

    const page = await this.document.getPage(Number(box.dataset['page']));
    const cssWidth = box.clientWidth || 600;
    const base = page.getViewport({ scale: 1 });
    const scale = (cssWidth / base.width) * Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    canvas.style.cssText = 'display:block;width:100%;height:100%';
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', `${this.title() || 'Lab sheet'}, page ${page.pageNumber}`);

    await page.render({ canvas, viewport }).promise;
    if (this.destroyed) return;
    box.replaceChildren(canvas);
    await this.addLinks(page, box);
  }

  /** Lays an invisible, clickable area over every web link on the page. */
  private async addLinks(page: PDFPageProxy, box: HTMLElement): Promise<void> {
    const viewport = page.getViewport({ scale: 1 });
    for (const annotation of await page.getAnnotations()) {
      if (annotation.subtype !== 'Link' || typeof annotation.url !== 'string') continue;
      if (!/^(https?:|mailto:)/i.test(annotation.url)) continue;

      // PDF coordinates (measured from the bottom-left) → position on the drawn page
      const [left, bottom, right, top] = annotation.rect as number[];
      const [x1, y1] = viewport.convertToViewportPoint(left, bottom) as number[];
      const [x2, y2] = viewport.convertToViewportPoint(right, top) as number[];
      const link = document.createElement('a');
      link.href = annotation.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.title = annotation.url;
      link.setAttribute('aria-label', annotation.url);
      link.style.cssText =
        'position:absolute;' +
        `left:${(Math.min(x1, x2) / viewport.width) * 100}%;` +
        `top:${(Math.min(y1, y2) / viewport.height) * 100}%;` +
        `width:${(Math.abs(x2 - x1) / viewport.width) * 100}%;` +
        `height:${(Math.abs(y2 - y1) / viewport.height) * 100}%`;
      box.appendChild(link);
    }
  }
}
