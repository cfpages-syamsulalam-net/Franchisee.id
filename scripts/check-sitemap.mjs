import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildSitemap } from './build-sitemap.mjs';

const root = await mkdtemp(join(tmpdir(), 'franchise-sitemap-'));
try {
  await mkdir(join(root, 'public'));
  await mkdir(join(root, 'private'));
  await writeFile(join(root, 'index.html'), '<head><link rel="canonical" href="/"></head>');
  await writeFile(join(root, 'public', 'index.html'), '<head><link href="/public" rel="canonical"></head>');
  await writeFile(join(root, 'private', 'index.html'), '<head><meta name="robots" content="noindex,follow"><link rel="canonical" href="/private"></head>');
  await writeFile(join(root, 'alias.html'), '<head><link rel="canonical" href="/public"></head>');
  await writeFile(join(root, '404.html'), '<head><link rel="canonical" href="/404"></head>');
  await writeFile(join(root, 'login.html'), '<head><link rel="canonical" href="/login"></head>');
  const urls = await buildSitemap(root);
  assert.deepEqual([...urls].sort(), ['https://franchisee.id/', 'https://franchisee.id/public']);
  const xml = await readFile(join(root, 'sitemap.xml'), 'utf8');
  assert.equal((xml.match(/<url>/g) || []).length, 2);
  assert.equal(await readFile(join(root, 'sitemap_index.xml'), 'utf8'), xml);
  assert.equal(await readFile(join(root, 'sitemap-complete.xml'), 'utf8'), xml);
  console.log('Sitemap includes only indexable canonical built routes');
} finally {
  await rm(root, { recursive: true, force: true });
}