# Scanix

A document-scanner landing page with ten working PDF tools. One HTML file, no build step, no backend, no dependencies to install before it runs.

## Run it

Open `index.html` in a browser, or drop it on any static host — Netlify, Vercel, GitHub Pages, Cloudflare Pages, S3, or plain nginx. There is nothing to compile and nothing to configure.

## What actually works

Every tool runs in the browser. Files are read with JavaScript, processed in memory and written back to the device. Nothing is uploaded, so there is no server to pay for and no privacy policy to write around.

| Tool | What it does |
|---|---|
| OCR | Reads printed text from images and PDFs in 12 languages, via Tesseract |
| Compress PDF | Re-renders pages as optimised JPEGs at three quality levels, reports the saving |
| Split PDF | Every page as its own PDF (zipped), or extracts a range like `1-3, 7` |
| Merge PDF | Combines any number of PDFs, reorderable before merging |
| Rotate PDF | Page thumbnails, click to select, rotate 90/180/270 |
| Image to PDF | JPG/PNG/WebP to PDF with page size and margin options |
| PDF to Image | PNG or JPG at 96/150/300 DPI, per page or as a ZIP |
| PDF to Word | Extracts text and paragraph structure into an editable `.doc` |
| Lock PDF | Real 128-bit encryption (standard security handler, R3) — verified against pypdf and pikepdf |
| eSign PDF | Draw or type a signature, click the page to place it, save |

Libraries load only when a tool needs them, from cdnjs: pdf-lib, pdf.js, JSZip, Tesseract.js. The landing page itself ships no third-party JavaScript at all.

## Speed

- One file, one request. No framework, no bundler, no hydration.
- Fonts load non-blocking with a system-font fallback, so text paints immediately.
- All illustrations — the phone mockup, scanner, icons — are CSS and inline SVG. There are no images to download.
- Tool libraries are fetched on demand and cached, so opening a second tool costs nothing.

## SEO

Built in already: per-route `<title>` and meta description, canonical and Open Graph tags, Organization / WebSite / SoftwareApplication JSON-LD, FAQPage JSON-LD on every tool page, breadcrumbs, one `<h1>` per view, semantic landmarks, and a `<noscript>` fallback.

The catch with any single-page app is that routes live behind `#/`. To get real crawlable URLs, run the prerenderer:

```bash
npm install jsdom
node prerender.js
```

That writes `dist/` with a static, fully rendered `index.html` for all 23 routes (`/tools/merge-pdf/`, `/blog/keep-your-documents-safe/`, and so on), plus a `sitemap.xml`. Each page still hydrates into the app when JavaScript loads. Deploy `dist/` instead of the single file when you want organic search traffic.

Set your own domain first:

```bash
ORIGIN=https://yourdomain.com node prerender.js
```

Then search `scanix.app` in `index.html` and replace the canonical and Open Graph URLs to match.

## Editing content

Everything is data at the top of the `<script>` block:

- `TOOLS` — name, icon, colour, page copy and FAQs for each tool. Add an entry here plus a matching engine in `ENGINE` and the tool appears in the grid, the nav dropdown, the footer and the sitemap automatically.
- `POSTS` — blog articles, written as HTML strings.
- `NAV` — the header links.
- CSS custom properties in `:root` — the whole palette is `--blue`, `--ink`, `--body`, `--line`, `--navy`.

## Known limits

- PDF to Word recovers text and paragraph order, not tables or multi-column layout.
- Compression flattens pages to images, so text stops being selectable. Run OCR afterwards if you need it back.
- Encrypted input PDFs cannot be edited; the tools detect this and say so.
- OCR needs one online request to fetch its language model, after which the browser caches it.
- The contact form and newsletter box are front-end only. Wire them to your own endpoint.
