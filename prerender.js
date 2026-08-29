/**
 * Scanix prerenderer — builds crawlable static HTML for every route.
 *
 *   npm install jsdom
 *   node prerender.js
 *
 * Output lands in ./dist. Each file contains the fully rendered markup,
 * so search engines and no-JavaScript visitors get real content, while
 * the same page still hydrates into the single-page app in the browser.
 */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const SRC = path.join(__dirname, 'index.html');
const OUT = path.join(__dirname, 'dist');
const ORIGIN = process.env.ORIGIN || 'https://scanix.app';

const html = fs.readFileSync(SRC, 'utf8');
const dom = new JSDOM(html, { runScripts: 'dangerously', url: ORIGIN + '/', pretendToBeVisual: true });
const w = dom.window;

const TOOLS = w.eval('TOOLS.map(t => t.slug)');
const POSTS = w.eval('POSTS.map(p => p.slug)');
const ROUTES = ['', 'tools', 'features', 'blog', 'about', 'contact', 'help', 'privacy', 'terms', 'download']
  .concat(TOOLS.map(s => 'tools/' + s))
  .concat(POSTS.map(s => 'blog/' + s));

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const written = [];
for (const route of ROUTES) {
  w.location.hash = route ? '#/' + route : '#/';
  w.eval('renderRoute(true)');
  const doc = w.document;
  const page = doc.documentElement.outerHTML
    .replace('<div id="app"></div>', '<div id="app">' + doc.getElementById('app').innerHTML + '</div>')
    .replace('<script>', '<script>window.__ROUTE__=' + JSON.stringify(route) + ';</script>\n<script>');
  const dir = route ? path.join(OUT, route) : OUT;
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), '<!DOCTYPE html>\n' + page);
  written.push(route);
}

const today = new Date().toISOString().slice(0, 10);
const priority = r => (r === '' ? '1.0' : r.indexOf('tools/') === 0 ? '0.9' : '0.7');
fs.writeFileSync(path.join(OUT, 'sitemap.xml'),
  '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  written.map(r => '  <url><loc>' + ORIGIN + '/' + (r ? r + '/' : '') + '</loc><lastmod>' + today +
    '</lastmod><changefreq>weekly</changefreq><priority>' + priority(r) + '</priority></url>').join('\n') +
  '\n</urlset>\n');
if (fs.existsSync(path.join(__dirname, 'robots.txt'))) fs.copyFileSync(path.join(__dirname, 'robots.txt'), path.join(OUT, 'robots.txt'));

console.log('Prerendered ' + written.length + ' pages into dist/');
