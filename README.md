# The Makers' Hub (Angular)

The Royal Holloway Makers' Society hub as an Angular 22 single-page app, published with GitHub Pages at `hub.rhulmakerssociety.site`.

## Pages

| Address | Page | Access |
|---|---|---|
| `/` | Login | Public |
| `/sockeyrings` | Society keyrings quote | Public |
| `/home` | Members' Dashboard | Members |
| `/workshops` | Workshop Lab Sheets | Members |
| `/events` | Events Calendar | Members |
| `/faqs` | Members' FAQs | Members |
| `/about` | Contact Details & Members' Communities | Members |

Addresses from the old site (`/workshops.html`, `/sockeyrings.html` and so on) forward to the new ones, so existing links and bookmarks keep working. Any other address shows a "Page Not Found" page.

## How the members' content is protected

This repository is public, so the members-only content is never stored in it in readable form.

- The originals (lab sheet PDFs, FAQ wording and pictures, calendar and community links) live in the **`private/`** folder on your computer. Git ignores that folder, so it is never committed.
- `npm run protect` encrypts them with the hub password into **`public/protected/`**. Those scrambled files are what gets committed and published.
- When a member signs in, their browser turns the password into the key and decrypts the content. Without the password the files are unreadable, on GitHub and on the live site.

No copy or hash of the password is stored anywhere. The protection is exactly as strong as the password, so use a long one: four or five random words is good.

**Back up `private/`.** It is not in GitHub. Keep a copy somewhere only the committee can reach, such as the society's OneDrive. You can also keep it there permanently and run `npm run protect -- --from "path\to\that\folder"`.

Public pages (the password screen, keyrings quote, logo and banner) are not encrypted. Neither is anything in `src/app/site-content.ts`.

## Editing content

### Members-only content (encrypted)

| To change | Edit |
|---|---|
| Lab sheet list, events calendar, WhatsApp/Discord links | `private/content.json` |
| FAQ wording | `private/faqs.html` |
| Lab sheet PDFs, FAQ pictures | `private/files/` |

After any change there, run:

```bash
npm run protect
```

It asks for the hub password (nothing shows as you type), re-encrypts what changed, and tells you if a file named in `content.json` or `faqs.html` is missing. Then commit and push as usual. Files in `private/files/` that nothing refers to are left unpublished.

**Adding a lab sheet**

1. Put the PDF in a folder under `private/files/pdf/`.
2. Add a `{ "title": "...", "file": "pdf/Folder/File name.pdf" }` line to the right group in `private/content.json` (or add a new group).
3. Run `npm run protect`, then commit and push.

Each sheet appears as a dropdown, two per row. Its PDF is only downloaded and decrypted when the dropdown is first opened.

### Public content

| To change | Edit |
|---|---|
| Email, address, map, socials, public nav links | `src/app/site-content.ts` |
| Keyring models, prices, colours, discounts | `src/app/pages/keyring/keyring-pricing.ts` |
| Page titles and subtitles | `src/app/app.routes.ts` |
| Home page tiles | `src/app/pages/home/home.ts` |
| Colours and fonts | `src/styles.css` |
| Logo, banner, favicon | `public/assets/img/` |

## Changing the password

```bash
npm run protect
```

Type the new password when asked. The script notices it differs from last time, asks you to type it again, and re-encrypts everything with it. Commit and push, then tell members the new password. Anyone still signed in is signed out the next time they refresh.

Never write the password in this repository, including code comments, commit messages and this README. Keep it in the committee's password manager.

## Making a change

1. Sign in to GitHub in VS Code with the society's account.
2. Clone `rhulmakerssoc/hub` and work on the `source` branch.
3. Copy the `private/` folder into the project (it is not in GitHub), or use `--from` as above.
4. Make your edits and check them with `npm start` (see below).
5. If you changed anything in `private/`, run `npm run protect`.
6. Commit and push. The live site updates by itself a few minutes later.

## Running it on your computer

You need Node.js 22.22+ or 24.15+.

```bash
npm install
npm start          # opens at http://localhost:4200
npm test           # runs the unit tests
```

Everything works locally, including the lab sheets. Sign in with the hub password.

## Publishing

Publishing is automatic: every push to the `source` branch builds the site and deploys it to GitHub Pages (see the **Actions** tab). Nothing needs deploying by hand, and the old Firebase steps no longer apply. The build stops with an error if unencrypted members' files have been committed by mistake.

One-time setup when moving from the old static site:

1. Replace the contents of the repository with this project and push to `source`.
2. In the repository, go to **Settings → Pages → Build and deployment** and change **Source** to **GitHub Actions**.
3. Check that **Custom domain** on the same page still says `hub.rhulmakerssociety.site`.

Direct links such as `/events` work because the build publishes a copy of `index.html` as `404.html`, which GitHub Pages serves for unknown paths so the app can show the right page.

**The old commits still contain the unencrypted files.** Encrypting only protects what is published from now on. The repository's history (and its old `assets` branch) still holds every PDF and the old password in readable form. To close that, start the repository afresh with this project as its first commit, or delete the repository and create a new one with the same name, and choose a new password.

## What this does and doesn't protect

- **Protected:** the members' content. It can't be read from GitHub, from the live site's files, or by skipping the password screen, because it only exists encrypted.
- **Not protected against a member:** anyone who has the password can read and download everything, and can pass the password on. Change it when that matters, for example each year.
- **Not hidden:** that the files exist, how many there are and their sizes; and the public pages.

## Project layout

```
private/                   members-only originals (NOT in GitHub; back this up)
  content.json             lab sheet list, calendar, community links
  faqs.html                FAQ wording
  files/                   PDFs and FAQ pictures
src/
  index.html               fonts, icons, favicon, banner image path
  styles.css               brand colours, type, nav, footer, shared blocks
  app/
    site-content.ts        public content
    app.routes.ts          page addresses, titles and subtitles
    core/                  decryption (vault) and route guards
    layout/                banner + nav + title + footer frame
    components/            shared parts (the lab sheet PDF viewer)
    pages/                 one folder per page, each with the same three files:
                           name.ts (logic), name.html (markup), name.css (styles)
public/
  protected/               encrypted members' content (made by npm run protect)
  assets/img               logo, banner, favicon
  CNAME                    custom domain
  robots.txt
scripts/protect.mjs            encrypts private/ into public/protected/
scripts/postbuild-pages.mjs    adds 404.html for direct links
.github/workflows/deploy.yml   GitHub Pages publishing
```