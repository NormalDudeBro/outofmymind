# AP World History Notes

Static study notes for Unit 1 (The Global Tapestry) and Unit 2 (Networks of Exchange), c. 1200-1450. Fourteen ordered topics contain two independent 24-line pages each. All 672 lines are present in the HTML, without JavaScript, fetching, external fonts, or runtime dependencies. Native unit/topic anchors work offline, including `file://`.

The subject navigation opens **AP Lang notes** at `ap-lang.html`, titled **AP Lang Unit 1: Rhetorical Analysis**. The finished Unit 1 page preserves 96 note lines in 12 sections of eight lines each, covering rhetorical situation, Describe, Function, Effect, Justify, a worked connection, framing and diction, evidence and reasoning, credibility and emotion, objections and qualifications, relationships and sequence, and revision. Original notes in `notes/ap-lang.txt` use the World-style `o` header prefix, which the importer supports; `notes/Colored/ap-lang.txt` uses the exact World marker format. Notes remain ASCII, at most 65 characters per stripped line, and exactly four physical printable pages of 24 lines each. Original and colored downloads are named `ap-lang.txt` and `ap-lang-colored.txt` and preserve their respective source bytes exactly. AP Lang uses only the existing approved palette markers `g`, `li`, `pu`, `br`, `y`, `r`, `db`, `p`, `lb`, `hp`, and `pen`: pencil body text with selective keyword highlights in one or two colors per line, neutral prefixes and punctuation, designated reserved non-`lb` section-title colors, and light-blue topic/page headings. The worked connection is explicitly hypothetical, not a quotation from the article; other examples are paraphrases. They illustrate plausible, text-grounded audience responses, not guaranteed reactions or proof that labels alone caused reported outcomes.

The third tab, **Algebra 2 notes**, opens `algebra-2.html`, titled **Algebra 2 Unit 1B: Relations and Functions**. Eight lessons cover linear equations and inequalities, piecewise functions, step functions, absolute value, parent functions, translations, dilations, and combined transformations. Each lesson has 48 source lines in six eight-line sections, split into two 24-line printable pages: sixteen physical pages and 384 lines total. These are study-guide notes for the packet, not fabricated reconstructions of unavailable graphs; invented examples are identified, and known worked-answer errors are corrected before publishing. Sources are `notes/algebra-2/<file>.txt` and `notes/algebra-2/Colored/<file>.txt`. Original and colored downloads are named `<file>.txt` and `<file>-colored.txt` and preserve the respective source bytes exactly. Notes use the existing inks and marker style: `o` headers, `->` support lines, initial `(pen)`, neutral prefixes, punctuation, formulas and numbers, selective letter/space highlights with immediate pencil resets and at most two non-pencil colors per line, and uniform non-`lb` section-title ink. Stripped text is ASCII and at most 65 characters per line.

## Build and Import

The generator needs Node.js 20 or later; the existing pinned validation tools need Node.js 22.16 or later (Node 24 is recommended). Use npm. All dependency and package versions are unchanged.

```sh
npm ci
npx playwright install chromium
npm run build
npm test
```

The checked-in Node generator imports original and marked `.txt` files byte-for-byte. The `.gitattributes` rule `*.txt text eol=lf` enforces LF checkouts on Windows and Linux, including AP Lang, so embedded downloads preserve the exact source bytes consistently across platforms. The generator does not rewrite source line endings. It validates all fourteen topics before replacing the site; it does not generate, rewrite, or recolor notes. Initial import or reimport after independent source review:

```sh
node scripts/build.mjs --unit1 "C:/Users/Kenny/Desktop/Prompts/AP-World-History-Unit-1" --unit2 "C:/Users/Kenny/Desktop/Prompts/AP-World-History-Unit-2" --preview "C:/Users/Kenny/Desktop/Prompts/AP-World-History-Units-1-2/preview.html"
```

Rebuild without Desktop sources using `npm run build`. The default build also regenerates `ap-lang.html` and `algebra-2.html`. Preview exports include all three subject pages, both AP Lang source files, and all sixteen Algebra 2 source files so subject navigation and downloads work offline. Export a standalone local preview from the checked-in notes using:

```sh
node scripts/build.mjs --preview "C:/Users/Kenny/Desktop/Prompts/AP-World-History-Units-1-2/preview.html"
```

Preview export copies `notes/unit-1` and `notes/unit-2` beside the exported HTML. Each topic provides two kinds of native links: `Download` original/colored links embed the exact source text bytes as base64 `text/plain` data URLs for one-click downloads with JavaScript disabled over both HTTP and `file://`; `Open original file` and `Open colored file` links use relative paths to `notes/unit-N/file.txt` and `notes/unit-N/Colored/file.txt`. Relative files and embedded downloads preserve the same source bytes; LF line endings are enforced at checkout by `.gitattributes`, not rewritten by the generator. Chromium opens these relative local text links instead of forcing a download. Only the fourteen named originals and their `Colored` counterparts are imported. Source previews, validators, and metadata are not imported. Original and colored files remain in `notes/unit-1/`, `notes/unit-2/`, and each unit's `Colored/` directory. Colored downloads contain `(pen)` and the approved highlight markers. All HTML text is escaped before rendering.

## Presentation

The neutral paper and Georgia typography follow the approved Unit 2 preview. All eleven approved ink hex values are preserved, topic headings are light blue, and complete marked section titles have uniform colors in both headings and Overview listings. On small screens pages stack; all topics remain visible. Printing uses A4 portrait with one note sheet per physical page (28 pages), repeating topic titles on each sheet. Browser print headers/footers should be off and background graphics on for the closest match.

AP Lang and Algebra 2 inherit the World print font and 8.8mm line rows without dense subject-specific CSS. All subjects print 24 notes per physical page: AP World History has 28 pages, AP Lang has four, and Algebra 2 has sixteen.

## Verification

`npm run validate` runs html-validate and static/content checks. `npm run test:e2e` runs Chromium checks at desktop/mobile sizes, native navigation and history, keyboard entry, exact line order, all downloads, offline/no-JavaScript operation, accessibility, and physical PDF page count. `npm test` runs both. Set `PREVIEW_PATH` to an exported HTML path to include it in the offline browser/download checks. Download clicks are paced to stay below Chromium's ten-per-second limit. The PDF is inspected in memory and not written to the repo.

Content validation enforces 14 topics, 28 pages, 48 lines/topic, 24 lines/page, a 65-character maximum, exact stripped equality (CRLF normalized only), valid markers, pencil prefixes and punctuation, immediate resets, no more than two highlights per line, complete uniform non-LB section title colors, and matching Overview/header rendering. Generated HTML must match a fresh in-memory build exactly. Structural/color tests do not independently certify historical accuracy or semantic word-family ownership; independent content review remains necessary.

AP Lang checks enforce the exact Unit 1 heading/title, 96 ASCII lines in source order, 12 eight-line sections, four articles of exactly 24 notes, a 65-character maximum, World-style markers and palette assignments, pencil body text and neutral prefixes/punctuation, selective keyword highlights in one or two colors per line, reserved non-`lb` section titles, light-blue topic/page headings, and exact original/colored source download bytes with filenames `ap-lang.txt` and `ap-lang-colored.txt`. Browser checks cover desktop/mobile, both subject links, keyboard navigation, English under forced RTL, HTTP and offline `file://` without JavaScript, accessibility with the approved-palette contrast exception below, printed notes fitting their line heights and lines staying within sheet bottoms (1px tolerance), and exactly four actual PDF pages. These checks do not independently certify the rhetorical interpretations or their hypothetical and paraphrased examples.

Algebra static checks in `tests/algebra-checks.mjs` enforce reproducible HTML, eight ordered lessons with 48 source lines each, sixteen articles with 24 notes each, six eight-line sections per lesson, 384 notes rendered through the shared `renderLine`, shared palette declarations, exact ASCII sources and stripped equality, the 65-character limit, all three subject links with the current tab marked, and sixteen exact embedded downloads plus sixteen matching relative source paths. The loader validates marker and title-color rules. Selected arithmetic checks cover corrected jersey totals of 825 and 1625, negative floor values, and reciprocal horizontal point mapping; these checks do not replace independent mathematical review.

## Accessibility Limitation

Semantic landmarks/headings, native keyboard-accessible links, a skip link, visible focus, and a complete no-JavaScript document are provided. Both AP World History and AP Lang retain the approved pastel palette: several highlight colors and light-blue topic/page headings fail WCAG text contrast requirements. This is a documented approved-palette contrast exception, not a WCAG compliance claim. Axe still runs its contrast rule; both subject pages permit only `color-contrast` violations on approved ink, topic-title, and page-title elements and reject every other violation. Original pencil-only text downloads are available as an alternative for every AP World History topic and AP Lang. Manual assistive-technology and visual review remains advisable.

Algebra 2 shares the same approved-palette contrast limitation, not a WCAG compliance claim. Each lesson also offers an original pencil-only text download as an alternative.

## Hosting

GitHub Pages continues to serve the checked-in `index.html` and relative notes at `www.joltlined.com`. `CNAME` and the existing `Quality` workflow are preserved; CI installs the existing tools and runs `npm test`. No Desktop paths or generation step are required at deployment. Existing Pages configuration is not changed by this work. Keep the current Pages publishing source and enable Enforce HTTPS in repository settings when DNS/certificate provisioning is complete.

Legacy journal images remain checked in but are unused and never requested. No reuse license is declared; confirm intended terms before adding one.
