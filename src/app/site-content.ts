/* =========================================================
   SITE CONTENT (public) — edit this file to update the hub.

   Everything in this file is PUBLIC: it is readable in the
   repository and by anyone who opens the site, signed in or
   not. Do not put members-only information here.

   Members-only content lives in the private/ folder, which is
   never committed:
   - Lab sheets, calendar, community links:  private/content.json
   - FAQ wording:                            private/faqs.html
   - PDFs and FAQ images:                    private/files/
   After editing those, run:  npm run protect

   Elsewhere:
   - Keyring prices:   src/app/pages/keyring/keyring-pricing.ts
   - Page titles:      src/app/app.routes.ts

   File paths below are relative to the `public/` folder.
   ========================================================= */

export interface IconLink {
  label: string;
  url: string;
  /** Font Awesome classes, e.g. 'fa-brands fa-instagram' */
  icon: string;
}

export interface NavLink {
  label: string;
  /** A page inside the hub, e.g. '/sockeyrings' … */
  path?: string;
  /** … or an outside website (opens in a new tab) */
  url?: string;
}

export const SITE = {
  hubName: "The Makers' Hub",
  societyName: "Royal Holloway Makers' Society",
  logo: 'assets/img/blue.png',

  footerText:
    "© 2021-26 Makers' Society of RHSU & Royal Holloway, University of London. All rights reserved, any unauthorised duplication is strictly prohibited.",
  loginFootnote:
    "© 2021-26 Makers' Society of RHSU & Royal Holloway, University of London. All rights reserved.",

  /* ---------------------------------------------------------
    CONTACT (About page, keyring quotes)
     --------------------------------------------------------- */
  email: 'makers@royalholloway.su',

  /** Leave both empty to show "(to be added)". `phoneLink` is the number with country code and no spaces. */
  phoneDisplay: '',
  phoneLink: '',

  addressLines: [
    'Department of Electronic Engineering',
    'Beatrice Shilling Building',
    'Royal Holloway, University of London',
    'Egham Hill,',
    'Egham, Surrey',
    'TW20 0EX',
  ],

  /** Google Maps → Share → Embed a map → copy only the src="…" URL */
  mapEmbedUrl:
    'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d9951.10624631914!2d-0.5716404383411572!3d51.425530992302825!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x487677138a372981%3A0xc3e50ca59ee46f11!2sDepartment%20of%20Electronic%20Engineering!5e0!3m2!1sen!2suk!4v1783044954632!5m2!1sen!2suk',
  mapTitle: 'Department of Electronic Engineering',

  socials: [
    { label: 'Instagram', url: 'https://instagram.com/rhulmakerssoc', icon: 'fa-brands fa-instagram' },
    { label: 'LinkedIn', url: 'https://linkedin.com/company/rhulmakerssoc', icon: 'fa-brands fa-linkedin' },
    { label: 'YouTube', url: 'https://youtube.com/@rhulmakerssoc', icon: 'fa-brands fa-youtube' },
    { label: 'Threads', url: 'https://threads.net/rhulmakerssoc', icon: 'fa-brands fa-threads' },
    { label: 'Facebook', url: 'https://facebook.com/rhulmakerssoc', icon: 'fa-brands fa-facebook' },
    { label: 'TikTok', url: 'https://tiktok.com/@rhulmakerssoc', icon: 'fa-brands fa-tiktok' },
  ] satisfies IconLink[],

  /* ---------------------------------------------------------
     PUBLIC PAGES — links shown in the nav bar on public pages
     (keyrings, page-not-found), left of the Sign In button.
     --------------------------------------------------------- */
  publicNavLinks: [
    { label: 'RHSU', url: 'https://su.rhul.ac.uk/societies/a-z/makers/' },
    { label: 'Linktree', url: 'https://linktr.ee/rhulmakerssoc' },
  ] satisfies NavLink[],

  /** Buttons under the keyring quote form */
  keyringContacts: [
    { label: 'Email us', url: 'mailto:makers@royalholloway.su', icon: 'fa-solid fa-envelope' },
    { label: 'DM us on Instagram', url: 'https://instagram.com/rhulmakerssoc', icon: 'fa-brands fa-instagram' },
    { label: 'DM us on Threads', url: 'https://threads.net/rhulmakerssoc', icon: 'fa-brands fa-threads' },
  ] satisfies IconLink[],
};
