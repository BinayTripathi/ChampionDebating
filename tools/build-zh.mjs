/**
 * Builds the Chinese site in zh/ from the English pages and i18n/zh.json.
 *
 * Run after editing any English page:  node tools/build-zh.mjs
 *
 * - Every English text run, alt/aria-label/placeholder and meta description is
 *   looked up in i18n/zh.json ("translations"). Text listed in "keep" stays in
 *   English (names, tournament titles, debate motions).
 * - Fails, listing the strings, if any English text has no translation, so
 *   the Chinese pages can never silently fall behind the English ones.
 * - Also writes hreflang links into the English pages so search engines
 *   pair each page with its translation.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PAGES = ['index.html', 'programs.html', 'coaches.html', 'competitions.html', 'contact.html'];
const { siteUrl } = JSON.parse(readFileSync(join(root, 'site.config.json'), 'utf8'));
const { translations, keep } = JSON.parse(readFileSync(join(root, 'i18n/zh.json'), 'utf8'));
const keepSet = new Set(keep);
const CJK_FONT = '<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;500&display=swap" rel="stylesheet">';

const decode = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const plain = (s) => decode(s.replace(/<[^>]+>/g, ''));
const plainLookup = new Map(Object.entries(translations).map(([en, zh]) => [plain(en), plain(zh)]));
const hasLatinWords = (s) => /[A-Za-z]{2,}/.test(plain(s));
const missing = new Set();

function translate(text) {
  const key = text.trim();
  if (!hasLatinWords(key) || keepSet.has(key)) return text;
  if (!(key in translations)) {
    missing.add(key);
    return text;
  }
  // A function, not a string, so "$75" in a translation isn't read as a replacement pattern.
  return text.replace(key, () => translations[key]);
}

const zhUrl = (page) => (page === 'index.html' ? `${siteUrl}/zh/` : `${siteUrl}/zh/${page}`);
const enUrl = (page) => (page === 'index.html' ? `${siteUrl}/` : `${siteUrl}/${page}`);

// Page URLs move under /zh/; the shared organisation, website and image URLs do not.
function toZhUrl(value) {
  if (/\/#(organization|website)$/.test(value) || /\.(png|jpe?g|svg)$/.test(value)) return value;
  if (value === `${siteUrl}/` || value.startsWith(`${siteUrl}/#`)) return `${siteUrl}/zh/${value.slice(siteUrl.length + 1)}`;
  if (/^[^#]*\.html/.test(value.slice(siteUrl.length + 1)) && value.startsWith(`${siteUrl}/`)) return `${siteUrl}/zh/${value.slice(siteUrl.length + 1)}`;
  return value;
}

function translateJsonLd(json) {
  const data = JSON.parse(json);
  const walk = (node) => {
    if (Array.isArray(node)) return node.map(walk);
    if (node && typeof node === 'object') {
      return Object.fromEntries(Object.entries(node).map(([k, v]) => {
        if (k === 'inLanguage') return [k, 'zh-Hans'];
        return [k, walk(v)];
      }));
    }
    if (typeof node !== 'string') return node;
    if (node.startsWith(siteUrl)) return toZhUrl(node);
    return plainLookup.get(node) ?? node;
  };
  // The organisation and website describe the business, not this page: leave them as they are.
  data['@graph'] = data['@graph'].map((n) => (['EducationalOrganization', 'WebSite'].includes(n['@type']) ? n : walk(n)));
  return JSON.stringify(data, null, 2).split('\n').map((line) => `  ${line}`).join('\n');
}

function hreflangLinks(page) {
  return [
    `  <link rel="alternate" hreflang="en-AU" href="${enUrl(page)}">`,
    `  <link rel="alternate" hreflang="zh-Hans" href="${zhUrl(page)}">`,
    `  <link rel="alternate" hreflang="x-default" href="${enUrl(page)}">`,
  ].join('\n');
}

function withHreflang(html, page) {
  const cleaned = html.replace(/\n  <link rel="alternate" hreflang="[^"]+" href="[^"]+">/g, '');
  return cleaned.replace(/(  <link rel="canonical" href="[^"]+">)/, `$1\n${hreflangLinks(page)}`);
}

function buildZh(en, page) {
  // Translate text runs and the few attributes people or screen readers see; skip scripts.
  // Only scripts and styles are skipped: splitting out SVGs would hide text that sits right before an icon.
  let html = en.split(/(<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>)/).map((part) => {
    if (/^<(script|style)/.test(part)) return part;
    return part
      .replace(/>([^<]*(?:<(em|strong|b)>[^<]*<\/\2>[^<]*)*)</g, (m, text) => `>${translate(text)}<`)
      .replace(/ (aria-label|alt|placeholder)="([^"]+)"/g, (m, attr, value) => ` ${attr}="${translate(value)}"`)
      .replace(/(<meta (?:name="description"|property="og:(?:title|description|image:alt)") content=")([^"]+)"/g, (m, start, value) => `${start}${translate(value)}"`);
  }).join('');

  html = html
    .replace('<html lang="en-AU">', '<html lang="zh-Hans">')
    .replace('<meta property="og:locale" content="en_AU">', '<meta property="og:locale" content="zh_CN">')
    .replace(/<link rel="canonical" href="[^"]+">/, `<link rel="canonical" href="${zhUrl(page)}">`)
    .replace(/<meta property="og:url" content="[^"]+">/, `<meta property="og:url" content="${zhUrl(page)}">`)
    .replace(/(<link href="https:\/\/fonts\.googleapis\.com[^>]+>)/, `$1\n  ${CJK_FONT}`)
    .replace(/<a class="(nav|menu)__lang" href="zh\/([^"]+)" lang="zh-Hans" hreflang="zh-Hans">中文<\/a>/g,
      '<a class="$1__lang" href="../$2" lang="en" hreflang="en-AU">EN</a>')
    .replace(/ (src|href)="(?!https?:|\.\.\/|#|mailto:|tel:)([^"]+\.(?:css|js|png|jpe?g|svg)(?:\?[^"]*)?)"/g, ' $1="../$2"')
    .replace(/(<script type="application\/ld\+json">\n)([\s\S]*?)(\n  <\/script>)/, (m, open, json, close) => open + translateJsonLd(json) + close);
  return withHreflang(html, page);
}

mkdirSync(join(root, 'zh'), { recursive: true });
const outputs = PAGES.map((page) => {
  const en = withHreflang(readFileSync(join(root, page), 'utf8'), page);
  return { page, en, zh: buildZh(en, page) };
});

if (missing.size) {
  console.error(`No Chinese translation for ${missing.size} string(s). Add them to i18n/zh.json ("translations", or "keep" to leave in English):\n`);
  console.error(JSON.stringify([...missing], null, 2));
  process.exit(1);
}

for (const { page, en, zh } of outputs) {
  writeFileSync(join(root, page), en);
  writeFileSync(join(root, 'zh', page), zh);
}
console.log(`Wrote zh/ (${outputs.length} pages) and hreflang links in the English pages.`);
