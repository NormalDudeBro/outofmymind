# Out of My Mind Literary Journal

A static educational resource about *Out of My Mind* by Sharon M. Draper. The site covers the author, context, characters, setting, tone, point of view, plot, and cited sources.

## Live Site

The GitHub Pages custom domain is [www.joltlined.com](https://www.joltlined.com/).

## Technology

- Static HTML and CSS
- Vanilla browser JavaScript
- Google Fonts for typography
- GitHub Pages deployment from this repository
- Playwright, Axe, and html-validate for development checks

There is no application server, database, authentication system, or production build step.

## Local Development

Requirements:

- Node.js 20 or later
- npm

Install the development tools:

```sh
npm install
npx playwright install chromium
```

Run all validation and browser tests:

```sh
npm test
```

Run checks separately:

```sh
npm run validate
npm run test:e2e
```

The Playwright configuration starts a local HTTP server automatically. To preview manually, run:

```sh
node tests/server.mjs
```

Then open `http://127.0.0.1:4173/`.

## Navigation and Citations

Each journal section is represented by a URL fragment such as `#characters` or `#plot`. Direct links, refresh, Back, and Forward are expected to preserve the active section.

Citation IDs must remain unique. An in-text citation activates its Works Cited entry, and the entry's badge returns to the most recently followed occurrence. `npm run validate` rejects duplicate IDs and missing fragment targets.

## Accessibility

The site includes:

- Keyboard-accessible fragment navigation
- Managed focus when sections or citations change
- High-contrast, readable-font, and reduced-motion controls
- Persisted preferences with a safe fallback when browser storage is unavailable
- Native `prefers-reduced-motion` support
- A no-JavaScript fallback that exposes the complete document
- Automated Axe checks for the Home page

When changing colors or interaction behavior, run the full test suite and verify keyboard behavior at both desktop and mobile sizes.

## Content and Asset Maintenance

Local image references are checked by filename only. Every content image must have meaningful alternative text and use lazy loading. Keep documentation for the source, permission, and attribution of each asset outside or alongside the repository as appropriate.

`cover.jpg` is currently retained but unused. Confirm whether it is needed before deleting or displaying it.

Google Fonts is the only production third-party request. If the site needs stricter privacy or offline support, self-host the required font files and their licenses before removing the Google Fonts stylesheet.

## Deployment

GitHub Pages serves the repository through the hostname in `CNAME`.

After DNS is configured and the certificate is available, enable **Enforce HTTPS** in the repository's Pages settings. Repository files cannot enable this setting or add arbitrary HTTP response headers. Verify deployment with:

```sh
curl -I http://www.joltlined.com/
curl -I https://www.joltlined.com/
```

The HTTP request should permanently redirect to the HTTPS URL.

The `Quality` GitHub Actions workflow validates HTML, fragments, asset references, navigation, preferences, responsive behavior, no-JavaScript behavior, and accessibility on pushes and pull requests.

## Licensing

No reuse license is currently declared. Add a license only after confirming the intended terms for the source, written content, and media assets.
