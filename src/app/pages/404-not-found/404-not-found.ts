import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { VaultService } from '../../core/vault.service';

@Component({
  selector: 'app-not-found-page',
  imports: [RouterLink],
  templateUrl: './404-not-found.html',
  styleUrl: './404-not-found.css',
})
export class NotFoundPage {
  protected readonly vault = inject(VaultService);
}
