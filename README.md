# Scanix — Next.js

The Scanix site and its browser-based PDF tools, as a Next.js 15 App Router project. Statically exported (32 pages), so it deploys to any host with no server.

Design follows the approved **Classic** direction: Plus Jakarta Sans, teal `#0E9AA7` accent, `#0F2A33` ink, `#0B2129` footer. All tokens live in `:root` at the top of `app/globals.css`.

## Run it

```bash
npm install     # also copies the pdf.js worker into /public
npm run dev     # http://localhost:3000
npm run build   # static site in ./out
```

`npm run build` needs network access the first time: `next/font` downloads Inter and Poppins and self-hosts them, which removes the render-blocking request to Google Fonts and the layout shift that comes with it.

## What changed from the single-file version

| Before | Now |
|---|---|
| Hash routes (`#/tools/merge-pdf`) | Real routes (`/tools/merge-pdf/`), statically generated |
| A `prerender.js` script bolted on for SEO | `generateStaticParams` — 26 pages built by Next |
| Manual `document.title` juggling | `generateMetadata` per route |
| Hand-written `sitemap.xml` and `robots.txt` | `app/sitemap.js` and `app/robots.js` |
| Imperative DOM (`innerHTML`, `querySelector`) | React components and state |
| Libraries from cdnjs | npm dependencies, dynamically imported |
| One 118 KB HTML file | ~106 KB shared JS, tool code split per route |

## Layout

```
app/
  layout.js              root shell, metadata, JSON-LD, fonts
  page.js                home
  tools/page.js          tool index
  tools/[slug]/page.js   one page per tool + FAQPage/HowTo/Breadcrumb schema
  blog/[slug]/page.js    articles
  sitemap.js robots.js   generated at build time
components/
  Header Footer Brand Icon PageHead Faq ToolCard ToolGrid PhoneMock StoreBadges ContactForm
  tools/ToolWorkspace.jsx   dropzone, file list, options, progress, results
  tools/Segs.jsx            segmented option control
lib/
  tools.js posts.js howto.js site.js    content and config
  icon-paths.js brand-svg.js            icon geometry
  pdf/loaders.js                        dynamic imports for pdf-lib, pdf.js, JSZip, Tesseract
  pdf/utils.js pdf/flatten.js           shared helpers
  pdf/encrypt.js                        RC4-128 standard security handler
  engines/                              one object per tool: metadata + Options + Extra + run()
```

## Tools

Five headline tools are featured in the grid:

| Tool | Route | What it does |
|---|---|---|
| **PDF Studio** | `/tools/pdf-studio` | Hub with four tabs: Compress, Merge, To Word, Edit pages |
| **OCR** | `/tools/ocr` | Scanned image or PDF → editable text, 12 languages |
| **Image to PDF** | `/tools/image-to-pdf` | JPG/PNG/WebP → one PDF, page size and margin options |
| **Protect PDF** | `/tools/protect-pdf` | Hub with two tabs: lock with a password, remove a password |
| **eSign PDF** | `/tools/esign-pdf` | Draw or type a signature, click the page to place it |

The rest keep their own pages: Compress, Merge, PDF to Word, Edit, Split, Rotate, PDF to Image, Lock, Unlock. Compress, Merge and PDF to Word each carry a cross-link into PDF Studio; Lock and Unlock cross-link to each other and to Protect PDF. That way each high-intent search term has a page of its own while the flagship stays the destination.

### Hub tools

`HUBS` in `lib/engines/index.js` maps a slug to a list of `[label, engineSlug]` tabs. A tool with a `HUBS` entry renders `ToolTabs` instead of `ToolWorkspace`; the workspace is keyed by slug so switching tabs clears files and results.

### The Edit PDF editor

`components/tools/PdfEditor.jsx` is a three-pane editor: page thumbnails on the left, canvas in the middle, item list on the right.

- **Tools:** select/move, edit existing page text, text box, image, freehand pen, highlighter, whiteout (redact), rectangle, ellipse, line and arrow.
- **Undo/redo** with a 60-step history (`Ctrl+Z` / `Ctrl+Y`), snapshot-based so page reorders and deletes are undoable too.
- **Keyboard:** `V` select, `T` text, `P` pen, `H` highlighter, `R` rectangle, `E` ellipse, `Ctrl+B/I/U` on a selected text box, `Ctrl+D` duplicate, `Delete` remove, arrows nudge (hold Shift for bigger steps), `Esc` deselect.
- **Objects** are stored in page ratios (0–1), so they survive zoom changes and page reordering. Drag to move, drag a corner handle to resize. Text resizes its point size with the box.
- **Text properties:** family (Helvetica/Times/Courier), size, bold, italic, underline, strikethrough, text colour, highlight background, alignment and line spacing — all 12 standard font variants embed.
- **Shape properties:** fill colour, line colour, line width and opacity.
- **Right panel** lists every item on the current page with z-order arrows, rename, delete and *Remove all*, plus the flatten toggle and the Save changes button.
- **Editing existing text** is the part most free editors do not have: pdf.js reports each text run's position, size and font family, and the replacement is redrawn in the same place.

`hideRun` on the engine suppresses the workspace's own run button, since the editor supplies its own; `wide` widens the container to the full 1240px grid.

### Unlock PDF — how it works, and the trade-off

Unlocking needs the user's password; there is no cracking or bypass. pdf.js handles decryption for every standard security handler including AES-256. Writing the decrypted file back out is the hard part: pdf-lib cannot parse encrypted object streams, so each page is re-rendered and rebuilt as a high-resolution image. That works on every protected file, but the text stops being selectable — so the extracted text is offered as a `.txt` sidecar alongside the PDF. This is stated plainly on the tool page rather than hidden.

## Admin panel (blog + FAQ CMS)

`/admin` is a login-protected panel where you create, edit, publish and delete blog posts and FAQs. It talks to a small API served by the same Cloudflare Worker that serves the site, backed by a D1 database.

### Why one worker

The API lives at `/api/*` on the **same origin** as the site. That means the session cookie can be `HttpOnly; Secure; SameSite=Strict`, there is no CORS to configure, and there is no token sitting in `localStorage` for a script to steal.

### Security

- Passwords hashed with **PBKDF2-SHA512, 210,000 iterations**, random 16-byte salt per user. Verification is constant-time.
- Sessions are HMAC-SHA256 signed tokens in an `HttpOnly` cookie, 8-hour expiry, with a `token_version` column so changing your password signs out every device.
- Login is rate limited to 8 failed attempts per IP per 15 minutes, and an unknown email takes the same time as a wrong password so you cannot enumerate accounts.
- Writes require a same-origin `Origin` header on top of `SameSite=Strict`.
- Post and FAQ HTML is **sanitised on write**: `<script>`, `<iframe>`, `<svg>`, `<form>`, `on*` handlers and `javascript:`/`data:text/html` URLs are stripped. Tested against 10 payloads in `worker/api.test.mjs`.
- `/admin` is `noindex, nofollow` in its metadata, gets an `x-robots-tag` header from the worker, and is disallowed in `robots.txt`.
- Secrets live in Worker secrets, never in the repo.

Run the API test suite — it exercises the real handler against a real SQLite database, no Cloudflare account needed:

```bash
npm run test:api
```

### Content flow, and why it is not live-fetched

Public blog and FAQ content is read at **build time**, so pages stay static HTML and keep their SEO value. After editing, press **Publish to site** in the admin; that calls a Cloudflare deploy hook which rebuilds and redeploys. Content is live in a minute or two rather than instantly — a deliberate trade for static-page speed and indexability.

If no API is configured, or it is unreachable during a build, the bundled seed posts in `lib/posts.js` are used. A broken API can never produce an empty blog.

### Setup, once

```bash
# 1. database
npx wrangler d1 create scanix                 # paste database_id into wrangler.jsonc
npx wrangler d1 execute scanix --remote --file=worker/schema.sql

# 2. admin user — hashes locally, plaintext never leaves your machine
npm run admin:create -- "you@example.com" "Your Name"
npx wrangler d1 execute scanix --remote --command "<the INSERT it prints>"

# 3. secrets
npx wrangler secret put SESSION_SECRET        # 32+ random chars, one is suggested for you
npx wrangler secret put DEPLOY_HOOK_URL       # optional: enables "Publish to site"

# 4. tell the build where the API is
#    NEXT_PUBLIC_API_URL=https://scanix.<subdomain>.workers.dev
```

Then deploy. Sign in at `/admin`.

## Adding a tool

1. Add an entry to `TOOLS` in `lib/tools.js` (name, icon, colour, page copy, FAQs).
2. Add three steps to `lib/howto.js`.
3. Write an engine in `lib/engines/` and register it in `lib/engines/index.js`.

The grid, nav dropdown, footer, sitemap and static route all pick it up automatically.

### Engine shape

```js
export const myTool = {
  slug: 'my-tool',
  accept: 'application/pdf',
  multiple: false,        // allow several files
  reorder: false,         // show up/down arrows
  min: 1,                 // files needed before the button enables
  cta: 'Do the thing',
  drop: 'Choose a PDF',
  hint: 'Shown under the drop zone.',
  defaults: { level: 'balanced' },
  Options: ({ opt, setOpt }) => <Segs name="level" items={[...]} opt={opt} setOpt={setOpt} />,
  Extra: MyPreviewComponent,   // optional canvas UI; writes state into extraRef.current
  async run({ files, opt, extra, status }) {
    status('Working…', 40);
    return { title: 'Done', sub: '1 page', outputs: [{ name: 'out.pdf', blob }] };
  },
};
```

Return `{ text, textFileName }` instead of `outputs` for text results — OCR does this.

## Performance

- Static HTML for every route; no server rendering at request time.
- 106 KB of shared JS. Tool pages add ~16 KB.
- pdf-lib, pdf.js, JSZip and Tesseract load on first use, not on page load. Opening a tool page costs nothing until you press the button.
- Fonts self-hosted by `next/font`, so no third-party connection and no layout shift.
- All illustrations are CSS and inline SVG. There are no images to download.

## Deploy

**Cloudflare (Workers Builds)** — `wrangler.jsonc` is included and points at `./out`.

- Build command: `npm install && npm run build`
- Deploy command: `npx wrangler deploy`

**Netlify / Vercel / GitHub Pages** — build command `npm run build`, publish directory `out`.

Set your domain once, via an environment variable, and every canonical URL, Open Graph tag and sitemap entry follows:

```
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
```

The fallback in `lib/site.js` is the current workers.dev URL.

## Known limits

- Edit PDF replaces text by painting over the original and redrawing it. Choose **Remove it properly** (the default) to flatten edited pages, otherwise the original wording stays recoverable in the file.
- PDF to Word recovers text and paragraph order, not tables or multi-column layout.
- Compression flattens pages to images, so text stops being selectable.
- OCR needs one online request to fetch its language model, after which the browser caches it.
- The contact form and newsletter box are front-end only.
