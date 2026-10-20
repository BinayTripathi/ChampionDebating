/**
 * Generates sitemap.xml and robots.txt from the HTML pages in the site root.
 *
 * Run before every deploy:  node tools/generate-sitemap.mjs
 *
 * - Pages marked <meta name="robots" content="noindex"> are left out.
 * - lastmod is the page's last git commit date, or its file date when the
 *   page is uncommitted or has local changes.
 * - Fails if a page's canonical URL does not match siteUrl in
 *   site.config.json, so a domain change cannot ship half-applied.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { siteUrl } = JSON.parse(readFileSync(join(root, 'site.config.json'), 'utf8'));

const pages = readdirSync(root)
  .filter((file) => file.endsWith('.html'))
  .sort((a, b) => (a === 'index.html' ? -1 : b === 'index.html' ? 1 : a.localeCompare(b)))
  .map((file) => ({ file, html: readFileSync(join(root, file), 'utf8') }))
  .filter(({ html }) => !/<meta\s+name="robots"\s+content="[^"]*noindex/i.test(html));

const problems = [];
const entries = pages.map(({ file, html }) => {
  const url = file === 'index.html' ? `${siteUrl}/` : `${siteUrl}/${file}`;
  const canonical = html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i)?.[1];
  if (canonical !== url) problems.push(`${file}: canonical is ${canonical ?? 'missing'}, expected ${url}`);
  return { url, lastmod: getLastModified(file) };
});

if (problems.length) {
  console.error(`Sitemap not written:\n  ${problems.join('\n  ')}`);
  process.exit(1);
}

const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...entries.map(({ url, lastmod }) => `  <url>\n    <loc>${url}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>`),
  '</urlset>',
  '',
].join('\n');

const robots = ['User-agent: *', 'Allow: /', '', `Sitemap: ${siteUrl}/sitemap.xml`, ''].join('\n');

writeFileSync(join(root, 'sitemap.xml'), sitemap);
writeFileSync(join(root, 'robots.txt'), robots);
console.log(`Wrote sitemap.xml (${entries.length} pages) and robots.txt for ${siteUrl}`);

function getLastModified(file) {
  try {
    const git = (args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
    // Uncommitted edits are newer than the last commit, so the file date wins.
    const hasLocalChanges = git(['status', '--porcelain', '--', file]) !== '';
    const committed = hasLocalChanges ? '' : git(['log', '-1', '--format=%cs', '--', file]);
    if (committed) return committed;
  } catch {
    // Not a git checkout (e.g. a zip of the site): fall back to the file date.
  }
  return statSync(join(root, file)).mtime.toISOString().slice(0, 10);
}
