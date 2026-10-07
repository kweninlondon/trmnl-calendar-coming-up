# Install Coming Up on TRMNL

The recipe runs on TRMNL Serverless. No Google Apps Script project or Cloudflare service is needed.

## Configure the plugin

1. Create a Private Plugin named Calendar Coming Up.
2. Choose **Polling**, method **GET**, and this single polling URL:

   https://trmnl.com/custom_plugin_example_data.json

   This JSON endpoint triggers refreshes. Its contents are ignored. Do not put ICS feeds in the Polling URL box: direct Google ICS polling produced a Malformed JSON error in live testing.
3. Paste `settings.yml` into Custom Fields and save.
4. Enter one to five ICS links, your display timezone, a maximum of 1–15 events, and your grouping preference. Blank calendar inputs are ignored.
5. Open Edit Markup. Paste the complete `dist/serverless.js` into **Serverless → Node**.
6. Paste `layouts/shared.html` into **Shared**. This is required by every layout.
7. Paste each file into its matching tab:

   | File | TRMNL tab |
   | --- | --- |
   | layouts/full.html | Full |
   | layouts/half_vertical.html | Half vertical |
   | layouts/half_horizontal.html | Half horizontal |
   | layouts/quadrant.html | Quadrant |

8. Save, then Force Refresh. If the plugin was degraded by previous failed refreshes, Reset Health first.
9. Preview the layouts on your target device. Add the plugin to a playlist and choose its refresh interval.

## Updating an existing test installation

The refactored version requires **Shared plus all four layout tabs**. Paste Shared first, then replace the four layout tabs; save the complete update before refreshing. Replace the Serverless code too to enable future recurring changes. Settings remain compatible, so personal links and overrides do not need changing.

## Getting an ICS feed

In Google Calendar: Settings → your calendar → Integrate calendar → **Secret address in iCal format**. Do not use a public address for a private calendar. Other providers need an ICS subscription feed accessible by its link without an interactive sign-in.

Keep private feed links in plugin settings. Do not commit them to GitHub or include them in published screenshots or sample settings.

## Title and footer

Default title: **Coming Up in [calendar name]** for one calendar, or **Coming Up** for multiple calendars. Default footer: the description for a single calendar, if present; otherwise **X events coming up**. Both can be overridden.

| Placeholder | Meaning |
| --- | --- |
| {count} | Events actually visible after fitting this layout |
| {limit} | Selected maximum, which can exceed the visible count |
| {calendars} | Calendar names from the feeds |
| {calendar_count} | Number of distinct configured feed links |
| {description} | Description when using a single feed |

Example: `{count} events coming up from {calendar_count} calendars`.

## Display behaviour

Events are combined chronologically, without a future date cutoff. Ended events disappear; ongoing events remain. Recurring occurrences count separately. Optional groups are Today / This week / Next week / Later. Weeks run Monday–Sunday in the selected timezone. Empty groups are hidden.

Screen size determines how many events fit, up to the selected maximum. Narrow layouts wrap event names to two lines and retain a separate calendar label. Half horizontal reads down the left column, then the right. Dates omit the year in compact layouts.

Duplicate identical feed links are ignored. The same event present in different feeds can appear twice.

## Troubleshooting and limits

- HTTP 404: check that the feed link works and is a secret feed when appropriate.
- Malformed JSON in plugin health: restore the JSON polling trigger above.
- Save rejected above 100 KB: copy the current built file; the build checks that it is below 100,000 bytes.
- Download timeout: the feed may be slow. A failed feed displays an error rather than a silently incomplete combined list.
- A feed above 2 MB or a complex recurrence history can exceed runtime safeguards. TRMNL permits 5 seconds and 128 MB; downloads run in parallel, with a 3.5-second timeout where supported and a 1.2-second parsing budget.
- Blank description or calendar name: the feed may not provide those optional fields. Use an override.

## Validation and publication

The user has tested two live feeds, 15 selected events, title/footer overrides, grouping on/off, all four layouts, the Shared refactor, and an export/import into a fresh plugin.

Local tests cover five merged feeds, excluded occurrences, moved and cancelled occurrences, changes/cancellation of this-and-future occurrences, timezone conversion, invalid feed responses, chronological layout fitting and visible counts.

Five feeds have automated coverage; optional additional live testing can verify the runtime budget with five real feeds. The repository is public; TRMNL recipe submission is pending.

## Development

Build and parser checks (Node 20+):

```sh
node scripts/build.cjs
node tests/calendar.cjs
node tests/publication.cjs
```

Browser checks require Playwright plus Chromium. Download the official stylesheet once and set `FRAMEWORK_CSS`; the fixture isolates its native spacing utilities from the page shell. Optionally set `BROWSER_PATH` for an existing browser:

```sh
curl -fL https://trmnl.com/css/3.4.0/plugins.css -o /tmp/trmnl-plugins.css
export FRAMEWORK_CSS=/tmp/trmnl-plugins.css
node tests/layout.cjs
LAYOUT_FILE=layouts/half_vertical.html node tests/layout.cjs
LAYOUT_FILE=layouts/quadrant.html node tests/layout.cjs
node tests/horizontal.cjs
```

ICAL.js 2.2.1 is vendored under MPL-2.0. The build adapts its ES-module export for TRMNL; retain its license and upstream attribution. Our application code is MIT licensed.

## Publication stylesheet

Shared links to `assets/coming-up.css` via jsDelivr, pinned to an immutable Git commit.
This avoids embedding custom CSS in the markup that Chef scans. No calendar data is sent to the CDN.
Layout styles are scoped to each layout root to avoid cross-layout conflicts in mashups.
When changing this stylesheet, publish its new commit and update Shared to pin that commit.
`tests/publication.cjs` checks both the published Chef terms and the broader best-practices list.
