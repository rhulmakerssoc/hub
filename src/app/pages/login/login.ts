import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { VaultService } from '../../core/vault.service';
import { SITE } from '../../site-content';

@Component({
  selector: 'app-login-page',
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class LoginPage {
  private readonly vault = inject(VaultService);
  private readonly router = inject(Router);

  protected readonly site = SITE;
  protected readonly error = signal('');
  protected readonly checking = signal(false);
  private readonly passwordInput = viewChild.required<ElementRef<HTMLInputElement>>('password');

  protected async submit(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    const input = this.passwordInput().nativeElement;
    this.checking.set(true);
    this.error.set('');

    let ok: boolean;
    try {
      // The password is the key to the members' content: it is right if the content opens.
      ok = await this.vault.unlock(input.value);
    } catch {
      this.checking.set(false);
      this.error.set("Couldn't reach the hub. Check your connection and try again.");
      return;
    }
    this.checking.set(false);

    if (ok) {
      await this.router.navigateByUrl('/home');
    } else {
      this.error.set('Invalid password. Please try again.');
      input.value = '';
      input.focus();
    }
  }
}
