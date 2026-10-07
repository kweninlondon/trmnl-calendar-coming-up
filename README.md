# Calendar Coming Up for TRMNL

Display the next events from up to five ICS calendars, however far ahead they are.

**Status: private preview.** Local parser tests pass. Live TRMNL Serverless testing, additional device layouts and publication checks remain before release.

## Features

- Up to five ICS feed links, merged chronologically.
- Choose a maximum of 1–15 events (default 10), with no future date cutoff. Smaller screens may show fewer; the {count} title/footer placeholder reports visible events without an extra count line.
- Optional Today / This week / Next week / Later groups; empty groups stay hidden.
- Monday–Sunday weeks in the selected display timezone.
- Default title Coming Up; automatic description for one feed; optional title and footer overrides.
- Placeholders: `{count}`, `{limit}`, `{calendars}`, `{calendar_count}`, `{description}`.
- Ongoing events remain until they end. Recurring occurrences count separately.

## Where it runs

The complete JavaScript bundle runs in **TRMNL Serverless**. Users configure feed links inside TRMNL. No Google Apps Script, Cloudflare account, or user-installed code is required by this design. This hosting flow still needs a live smoke test.

## Installation for testing

Create a separate private plugin and follow [the setup guide](docs/setup.md). Paste `settings.yml` into custom form fields, `dist/serverless.js` into the Node Serverless editor, and `layouts/full.html` into Full. The setup guide uses the deliverable filename `full.html` and `serverless.js`; these correspond to the paths above. Use `assets/icon.svg` as the icon.

Keep any existing working calendar plugin during testing. Personal ICS links belong only in TRMNL settings; do not commit them.

## Development

Node.js 20 or newer, no package installation needed:

```sh
node scripts/build.cjs
node tests/calendar.cjs
```

Edit `src/serverless.js`, then rebuild the bundled `dist/serverless.js`. The pinned ICAL.js 2.2.1 parser is vendored to avoid requiring TRMNL runtime package installation.

## Current limitations

Full-screen layout adapts to available height and reports the visible event count after fitting rows. Local browser checks passed at 800×480 and 1200×900; live TRMNL OG confirmation and small playlist layouts remain. Feeds using `RANGE=THISANDFUTURE` are rejected explicitly. Large feeds (over 2 MB each) and long recurrence histories may exceed runtime safeguards. Any feed failure displays an error instead of an incomplete combined list. Five-second TRMNL runtime compatibility remains to be verified live.

## License

Original application code is MIT licensed; see [LICENSE](LICENSE). The unmodified ICAL.js parser retains MPL-2.0; see [its license](vendor/LICENSE-ICAL.txt) and [upstream source](https://github.com/kewisch/ical.js/tree/v2.2.1).
