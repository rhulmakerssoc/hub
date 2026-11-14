// GitHub Pages has no server-side routing, so opening /events directly (or
// refreshing on it) would 404. Serving a copy of index.html as 404.html lets
// Angular's router load and show the right page instead.
import { copyFileSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const out = join('dist', 'makers-portal', 'browser');
const index = join(out, 'index.html');

if (!existsSync(index)) {
  console.error(`No build found at ${index}. Run "ng build" first.`);
  process.exit(1);
}

copyFileSync(index, join(out, '404.html'));
writeFileSync(join(out, '.nojekyll'), '');
console.log('Added 404.html and .nojekyll to', out);
