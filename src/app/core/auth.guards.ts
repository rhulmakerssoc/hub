import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { VaultService } from './vault.service';

/**
 * Members-only pages: the members' content must be unlocked. After a
 * refresh this reopens it with the session's key; otherwise the visitor is
 * sent to the password page.
 */
export const membersOnly: CanActivateFn = async () => {
  const router = inject(Router);
  return (await inject(VaultService).restore()) || router.createUrlTree(['/']);
};

/** Password page: skip it if this tab is already signed in. */
export const redirectIfSignedIn: CanActivateFn = async () => {
  const router = inject(Router);
  return (await inject(VaultService).restore()) ? router.createUrlTree(['/home']) : true;
};
