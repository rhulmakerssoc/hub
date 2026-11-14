import { Component, computed, inject } from '@angular/core';
import { SafeResourceUrlPipe } from '../../core/safe-resource-url.pipe';
import { VaultService } from '../../core/vault.service';

@Component({
  selector: 'app-events-page',
  imports: [SafeResourceUrlPipe],
  templateUrl: './events.html',
  styleUrl: './events.css',
})
export class EventsPage {
  private readonly vault = inject(VaultService);

  /** Set in private/content.json */
  protected readonly calendarUrl = computed(() => this.vault.content()?.calendarEmbedUrl ?? '');
}
