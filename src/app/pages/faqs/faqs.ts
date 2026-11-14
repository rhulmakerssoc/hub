import { Component, ViewEncapsulation, effect, inject, signal } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { VaultService } from '../../core/vault.service';

/**
 * The FAQ wording is members-only: it is written in private/faqs.html and
 * reaches the browser encrypted. This page shows it once it is unlocked and
 * fills in its pictures, which are stored encrypted too.
 */
@Component({
  selector: 'app-faqs-page',
  templateUrl: './faqs.html',
  styleUrl: './faqs.css',
  // The FAQ markup is inserted as-is, so its styles can't be scoped the usual
  // way; faqs.css scopes everything under "app-faqs-page" instead.
  encapsulation: ViewEncapsulation.None,
})
export class FaqsPage {
  private readonly vault = inject(VaultService);
  private readonly sanitizer = inject(DomSanitizer);

  protected readonly html = signal<SafeHtml | null>(null);

  constructor() {
    effect(() => {
      const faqsHtml = this.vault.content()?.faqsHtml;
      if (faqsHtml) void this.show(faqsHtml);
    });
  }

  private async show(faqsHtml: string): Promise<void> {
    const doc = new DOMParser().parseFromString(faqsHtml, 'text/html');

    // <img data-file="img/photo.jpg"> names an encrypted picture: decrypt it and point the image at it.
    await Promise.all(
      Array.from(doc.querySelectorAll<HTMLImageElement>('img[data-file]')).map(async (img) => {
        try {
          img.src = await this.vault.fileUrl(img.dataset['file']!);
        } catch {
          img.remove(); // picture missing: show the text without it
        }
      }),
    );

    // Safe to trust: this markup was written by the committee and could only
    // be decrypted because it is exactly what "npm run protect" encrypted.
    this.html.set(this.sanitizer.bypassSecurityTrustHtml(doc.body.innerHTML));
  }
}
