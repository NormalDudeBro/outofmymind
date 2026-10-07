# AP World History Notes

Static study notes for Unit 1 (The Global Tapestry) and Unit 2 (Networks of Exchange), c. 1200-1450. Fourteen ordered topics contain two independent 24-line pages each. All 672 lines are present in the HTML, without JavaScript, fetching, external fonts, or runtime dependencies. Native unit/topic anchors work offline, including `file://`.

## Build and Import

The generator needs Node.js 20 or later; the existing pinned validation tools need Node.js 22.16 or later (Node 24 is recommended). Use npm. All dependency and package versions are unchanged.

```sh
npm ci
npx playwright install chromium
npm run build
npm test
```

The checked-in Node generator imports original and marked `.txt` files byte-for-byte. It validates all fourteen topics before replacing the site; it does not generate, rewrite, or recolor notes. Initial import or reimport after independent source review:

```sh
node scripts/build.mjs --unit1 "C:/Users/Kenny/Desktop/Prompts/AP-World-History-Unit-1" --unit2 "C:/Users/Kenny/Desktop/Prompts/AP-World-History-Unit-2" --preview "C:/Users/Kenny/Desktop/Prompts/AP-World-History-Units-1-2/preview.html"
```

Rebuild without Desktop sources using `npm run build`. Export a standalone local preview from the checked-in notes using:

```sh
node scripts/build.mjs --preview "C:/Users/Kenny/Desktop/Prompts/AP-World-History-Units-1-2/preview.html"
```

Preview export copies `notes/unit-1` and `notes/unit-2` beside the exported HTML. Each topic provides two kinds of native links: `Download` original/colored links embed the exact text bytes as base64 `text/plain` data URLs for one-click downloads with JavaScript disabled over both HTTP and `file://`; `Open original file` and `Open colored file` links use relative paths to `notes/unit-N/file.txt` and `notes/unit-N/Colored/file.txt`. Chromium opens these relative local text links instead of forcing a download. Only the fourteen named originals and their `Colored` counterparts are imported. Source previews, validators, and metadata are not imported. Original and colored files remain in `notes/unit-1/`, `notes/unit-2/`, and each unit's `Colored/` directory. Colored downloads contain `(pen)` and the approved highlight markers. All HTML text is escaped before rendering.

## Presentation

The neutral paper and Georgia typography follow the approved Unit 2 preview. All eleven approved ink hex values are preserved, topic headings are light blue, and complete marked section titles have uniform colors in both headings and Overview listings. On small screens pages stack; all topics remain visible. Printing uses A4 portrait with one note sheet per physical page (28 pages), repeating topic titles on each sheet. Browser print headers/footers should be off and background graphics on for the closest match.

## Verification

`npm run validate` runs html-validate and static/content checks. `npm run test:e2e` runs Chromium checks at desktop/mobile sizes, native navigation and history, keyboard entry, exact line order, all downloads, offline/no-JavaScript operation, accessibility, and physical PDF page count. `npm test` runs both. Set `PREVIEW_PATH` to an exported HTML path to include it in the offline browser/download checks. Download clicks are paced to stay below Chromium's ten-per-second limit. The PDF is inspected in memory and not written to the repo.

Content validation enforces 14 topics, 28 pages, 48 lines/topic, 24 lines/page, a 65-character maximum, exact stripped equality (CRLF normalized only), valid markers, pencil prefixes and punctuation, immediate resets, no more than two highlights per line, complete uniform non-LB section title colors, and matching Overview/header rendering. Generated HTML must match a fresh in-memory build exactly. Structural/color tests do not independently certify historical accuracy or semantic word-family ownership; independent content review remains necessary.

## Accessibility Limitation

Semantic landmarks/headings, native keyboard-accessible links, a skip link, visible focus, and a complete no-JavaScript document are provided. The approved pastel palette intentionally remains unchanged: several highlight colors and light-blue topic headings fail WCAG text contrast requirements. This is a documented limitation, not a full WCAG compliance claim. Axe still runs its contrast rule; tests permit only `color-contrast` violations on the approved ink and topic-title elements and reject every other violation. Original pencil-only text downloads are available for every topic. Manual assistive-technology and visual review remains advisable.

## Hosting

GitHub Pages continues to serve the checked-in `index.html` and relative notes at `www.joltlined.com`. `CNAME` and the existing `Quality` workflow are preserved; CI installs the existing tools and runs `npm test`. No Desktop paths or generation step are required at deployment. Existing Pages configuration is not changed by this work. Keep the current Pages publishing source and enable Enforce HTTPS in repository settings when DNS/certificate provisioning is complete.

Legacy journal images remain checked in but are unused and never requested. No reuse license is declared; confirm intended terms before adding one.
