import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Data, NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { VaultService } from '../core/vault.service';
import { NavLink, SITE } from '../site-content';

export interface PageData {
  heading: string;
  subtitle?: string;
}

export type NavVariant = 'members' | 'public';

/**
 * Frame shared by every page except the password screen: banner image
 * behind a transparent nav bar and the page title, then the page, then
 * the footer. The nav shows member links or public links depending on
 * the route's `variant` data.
 */
@Component({
  selector: 'app-site-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './site-layout.html',
})
export class SiteLayout {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly vault = inject(VaultService);

  protected readonly site: typeof SITE & { publicNavLinks: NavLink[] } = SITE;
  protected readonly menuOpen = signal(false);

  protected readonly memberLinks = [
    { label: 'Home', path: '/home' },
    { label: 'Workshop Lab Sheets', path: '/workshops' },
    { label: 'Events', path: '/events' },
    { label: 'FAQs', path: '/faqs' },
    { label: 'About', path: '/about' },
  ];

  private readonly routeData = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      startWith(null),
      map(() => {
        this.menuOpen.set(false);
        // Read the router's state snapshot rather than ActivatedRoute: while this
        // layout is being created, the child page's ActivatedRoute has no
        // snapshot yet, but the router's target state is already in place.
        let r = this.router.routerState.snapshot.root;
        while (r.firstChild) r = r.firstChild;
        return r.data;
      }),
    ),
    { initialValue: {} as Data },
  );

  protected readonly page = computed(() => (this.routeData()['page'] ?? { heading: '' }) as PageData);
  protected readonly variant = computed(() => (this.route.snapshot.data['variant'] ?? 'members') as NavVariant);

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  protected logOut(): void {
    this.vault.lock();
    this.router.navigateByUrl('/');
  }
}
