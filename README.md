# Coming Up — a TRMNL calendar recipe

Display upcoming events from up to five ICS calendars, however far ahead they are.

**Status: private preview.** Two live feeds and all four layouts have been tested by the author in TRMNL. The latest Shared refactor and expanded recurrence handling need a final live smoke test before publication.

## Features

- One to five ICS feed links, combined chronologically.
- Maximum 1–15 events (default 10); fewer may fit on smaller screens.
- Optional Today / This week / Next week / Later grouping, with Monday–Sunday weeks.
- Full, half vertical, two-column half horizontal and quadrant layouts.
- Separate calendar labels and two-line event names in compact layouts.
- Custom title/footer, with `{count}` reporting visible events and `{limit}` reporting the chosen maximum.
- Recurring events, excluded occurrences, moved occurrences and future occurrence changes/cancellations.

## Where it runs

**TRMNL Serverless** downloads and processes the feeds; TRMNL renders the screen. Users enter their links in plugin settings. No user-installed code, Google Apps Script project or Cloudflare account is needed.

## Setup

Follow [the setup guide](docs/setup.md). Use the JSON polling trigger specified there. Paste `settings.yml` into Custom Fields, `dist/serverless.js` into Serverless → Node, and **`layouts/shared.html` into Shared**. Paste each remaining layout into its matching tab. Use `assets/icon.svg` as the icon.

Private ICS links belong in TRMNL settings, not in this repository. The GitHub repo stores the code; it does not run the plugin.

## Development and checks

Node 20+, no package installation required for parser tests:

```sh
node scripts/build.cjs
node tests/calendar.cjs
```

Edit `src/serverless.js`, then rebuild `dist/serverless.js`. The build enforces TRMNL's 100 KB code limit. Browser test instructions are in [the setup guide](docs/setup.md).

Tests cover five feeds, invalid links, recurrence exceptions and future changes, timezones, layout fitting, chronological ordering and visible counts. Large or slow feeds can exceed TRMNL's runtime limits; see the setup guide. Five-feed live testing and recipe export/import remain release checks.

## License

Original code: [MIT](LICENSE). ICAL.js 2.2.1: [MPL-2.0](vendor/LICENSE-ICAL.txt), with [upstream source](https://github.com/kewisch/ical.js/tree/v2.2.1). Its vendored source is unmodified; the build adapts the module export in the generated bundle.
