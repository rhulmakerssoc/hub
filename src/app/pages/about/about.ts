import { Component, computed, inject } from '@angular/core';
import { SafeResourceUrlPipe } from '../../core/safe-resource-url.pipe';
import { VaultService } from '../../core/vault.service';
import { SITE } from '../../site-content';

@Component({
  selector: 'app-about-page',
  imports: [SafeResourceUrlPipe],
  templateUrl: './about.html',
  styleUrl: './about.css',
})
export class AboutPage {
  private readonly vault = inject(VaultService);

  protected readonly site = SITE;

  /** Members-only invite links, set in private/content.json */
  protected readonly community = computed(() => this.vault.content()?.community ?? []);
}
