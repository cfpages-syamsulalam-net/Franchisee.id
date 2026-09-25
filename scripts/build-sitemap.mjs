import { open, readdir, writeFile } from 'node:fs/promises';
import { join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ORIGIN = 'https://franchisee.id';
const NON_CONTENT_ROUTES = new Set(['/404', '/login', '/daftar', '/sso-callback', '/dashboard', '/profil']);
const XML_HEADER = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

function attribute(tag, name) {
  return tag.match(new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, 'i'))?.[2] || '';
}

async function htmlHead(path) {
  const file = await open(path, 'r');
  try {
    const buffer = Buffer.alloc(96 * 1024);
    const { bytesRead } = await file.read(buffer, 0, buffer.length, 0);
    return buffer.toString('utf8', 0, bytesRead).split(/<\/head>/i)[0];
  } finally {
    await file.close();
  }
}

function publicPath(root, file) {
  const path = '/' + relative(root, file).split(sep).join('/');
  return path.endsWith('/index.html') ? path.slice(0, -'index.html'.length) : path.replace(/\.html$/, '');
}

function canonicalFromHead(head) {
  for (const tag of head.match(/<link\b[^>]*>/gi) || []) {
    if (attribute(tag, 'rel').split(/\s+/).includes('canonical')) return attribute(tag, 'href');
  }
  return '';
}

function isNoindex(head) {
  return (head.match(/<meta\b[^>]*>/gi) || []).some((tag) =>
    ['robots', 'googlebot'].includes(attribute(tag, 'name').toLowerCase()) &&
    /(?:^|[,\s])noindex(?:[,\s]|$)/i.test(attribute(tag, 'content'))
  );
}

export async function buildSitemap(root = resolve('dist')) {
  const urls = new Set();
  async function visit(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        await visit(path);
      } else if (entry.isFile() && entry.name.endsWith('.html')) {
        const head = await htmlHead(path);
        if (isNoindex(head)) continue;
        const href = canonicalFromHead(head);
        if (!href) continue;
        const canonical = new URL(href, ORIGIN);
        const route = publicPath(root, path);
        if (NON_CONTENT_ROUTES.has(route.replace(/\/$/, ''))) continue;
        if (canonical.origin !== ORIGIN || canonical.search || canonical.hash ||
            canonical.pathname.replace(/\/$/, '') !== route.replace(/\/$/, '')) continue;
        urls.add(canonical.origin + canonical.pathname);
      }
    }
  }
  await visit(root);
  const xml = XML_HEADER + [...urls].sort().map((url) => `  <url><loc>${url.replaceAll('&', '&amp;')}</loc></url>\n`).join('') + '</urlset>\n';
  await writeFile(join(root, 'sitemap.xml'), xml);
  await writeFile(join(root, 'sitemap_index.xml'), xml);
  await writeFile(join(root, 'sitemap-complete.xml'), xml);
  return urls;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const urls = await buildSitemap();
  console.log(`Sitemap: ${urls.size} canonical indexable pages from built HTML`);
}