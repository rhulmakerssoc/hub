import { Routes } from '@angular/router';
import { membersOnly, redirectIfSignedIn } from './core/auth.guards';
import { SiteLayout } from './layout/site-layout';

const hub = "The Makers' Hub";
const society = "Royal Holloway Makers' Society";

/** Addresses from the old multi-page site, so existing links and bookmarks keep working. */
const oldAddresses: Routes = [
  { path: 'index.html', redirectTo: '' },
  { path: 'home.html', redirectTo: 'home' },
  { path: 'workshops.html', redirectTo: 'workshops' },
  { path: 'events.html', redirectTo: 'events' },
  { path: 'faqs.html', redirectTo: 'faqs' },
  { path: 'about.html', redirectTo: 'about' },
  { path: 'sockeyrings.html', redirectTo: 'sockeyrings' },
  { path: 'keyring.html', redirectTo: 'sockeyrings' },
  { path: 'keyring', redirectTo: 'sockeyrings' },
];

export const routes: Routes = [
  // Password page (entry point)
  {
    path: '',
    pathMatch: 'full',
    title: hub,
    canActivate: [redirectIfSignedIn],
    loadComponent: () => import('./pages/login/login').then((m) => m.LoginPage),
  },

  ...oldAddresses,

  // Members-only pages
  {
    path: '',
    component: SiteLayout,
    data: { variant: 'members' },
    canActivateChild: [membersOnly],
    children: [
      {
        path: 'home',
        title: hub,
        data: {
          page: { heading: 'Welcome Back, Members!', subtitle: 'This is the hub for our makers!' },
        },
        loadComponent: () => import('./pages/home/home').then((m) => m.HomePage),
      },
      {
        path: 'workshops',
        title: `Workshop Lab Sheets | ${hub}`,
        data: {
          page: { heading: 'Workshop Lab Sheets', subtitle: 'Tailored for the needs of our makers' },
        },
        loadComponent: () => import('./pages/workshops/workshops').then((m) => m.WorkshopsPage),
      },
      {
        path: 'events',
        title: `Events | ${hub}`,
        data: {
          page: { heading: 'Events', subtitle: 'Subscribe to our events calendar to stay updated!' },
        },
        loadComponent: () => import('./pages/events/events').then((m) => m.EventsPage),
      },
      {
        path: 'faqs',
        title: `Members' FAQs | ${hub}`,
        data: {
          page: { heading: "Members' FAQs", subtitle: 'Get your most frequently asked questions answered here' },
        },
        loadComponent: () => import('./pages/faqs/faqs').then((m) => m.FaqsPage),
      },
      {
        path: 'about',
        title: `About | ${hub}`,
        data: { page: { heading: 'About Us' } },
        loadComponent: () => import('./pages/about/about').then((m) => m.AboutPage),
      },
    ],
  },

  // Public pages: nav shows the public links + Sign In
  {
    path: '',
    component: SiteLayout,
    data: { variant: 'public' },
    children: [
      {
        path: 'sockeyrings',
        title: `Society Keyrings | ${society}`,
        data: {
          page: {
            heading: 'Society Keyrings Quote',
            subtitle: 'Get a quote for custom 3D printed keyrings for your student group',
          },
        },
        loadComponent: () => import('./pages/keyring/keyring').then((m) => m.KeyringPage),
      },
      {
        // Anything else: page not found
        path: '**',
        title: `404 Error: Page Not Found | ${society}`,
        data: { page: { heading: 'Page Not Found', subtitle: '404 Error' } },
        loadComponent: () => import('./pages/404-not-found/404-not-found').then((m) => m.NotFoundPage),
      },
    ],
  },
];
