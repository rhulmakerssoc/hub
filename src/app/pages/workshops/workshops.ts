import { Component, computed, inject, signal } from '@angular/core';
import { VaultService } from '../../core/vault.service';
import { PdfViewer } from '../../components/pdf-viewer/pdf-viewer';

/**
 * Lab sheets, grouped by category, two per row. Each sheet is a dropdown
 * (<details>); its PDF is only downloaded, decrypted and drawn the first
 * time the dropdown is opened. Once loaded, a sheet stays loaded while you
 * remain on the page, so closing and reopening it is instant.
 *
 * The list of sheets is members-only: it is set in private/content.json.
 */
@Component({
  selector: 'app-workshops-page',
  imports: [PdfViewer],
  templateUrl: './workshops.html',
  styleUrl: './workshops.css',
})
export class WorkshopsPage {
  private readonly vault = inject(VaultService);

  protected readonly groups = computed(() => this.vault.content()?.labSheetGroups ?? []);

  /** Files whose dropdown has been opened at least once. */
  protected readonly loaded = signal<ReadonlySet<string>>(new Set());

  protected onToggle(file: string, event: Event): void {
    const isOpen = (event.target as HTMLDetailsElement).open;
    if (isOpen && !this.loaded().has(file)) {
      this.loaded.update((files) => new Set(files).add(file));
    }
  }
}
