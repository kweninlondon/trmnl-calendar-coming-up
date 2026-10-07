# Upcoming ICS events — private preview

This is the new Serverless version. Keep the working Google Apps Script plugin while testing this as a separate private plugin. It has not been deployed, published or tested in the live TRMNL runtime.

## Files

- settings.yml: user-facing settings; paste into the plugin's custom form fields editor.
- serverless.js: complete Node.js Serverless code including the pinned ICAL.js 2.2.1 parser. Paste the entire file into Edit Markup > Serverless, choosing Node.
- full.html: full-screen markup; paste into Full.
- LICENSE-ICAL.txt: license for the bundled parser. Retain alongside the source when sharing.

## First live test

1. Create a separate private plugin named Upcoming ICS events (test).
2. Choose Polling. For an initial trigger, use TRMNL's public example endpoint: https://trmnl.com/custom_plugin_example_data.json . Its content is ignored; the Serverless run function fetches the configured ICS feeds directly. This starter endpoint/trigger arrangement needs verification in TRMNL before release.
3. Paste settings.yml into custom form fields. Save, then configure one ICS link and select your display timezone. Only add further feeds after the first works.
4. In Edit Markup, select Serverless and Node. Paste all of serverless.js and save.
5. Paste full.html into Full and save. Enable Debug Logs while testing. Refresh/preview and check the returned variables and layout.
6. Choose an appropriate plugin refresh interval in TRMNL. There is no Google script or Cloudflare Worker in this version.

For Google Calendar, the feed is found under calendar Settings > Integrate calendar > Secret address in iCal format (if available to you). This address gives access to the feed; use it only in your own plugin settings, never in a published sample or screenshot. A standard browser share link is not a feed.

## Settings

Five calendar inputs (four optional), a maximum of 1–15 upcoming events combined across all feeds, grouping on/off, display timezone, optional title and footer. Blank title uses Coming Up. Blank footer uses the single feed's description if present, otherwise the displayed event/calendar counts.

Optional placeholders: {count} means the visible event count after the layout fits the screen; {limit} means requested maximum; {calendars} means feed names; {calendar_count} means distinct input feeds; {description} means the description of a single feed. Example: Next {count} events from {calendar_count} calendars.

Weeks run Monday–Sunday. Ended events disappear; ongoing events remain. Empty groups are hidden. No future date cutoff is imposed. Recurring occurrences count as individual events. Repeated identical input URLs are collapsed; events appearing in different feeds remain separate.

## Preview limitations and release work

- Local tests passed: old event removal, distant one-off events, yearly and daily recurrence, EXDATE, cancelled overrides, moved overrides, IANA timezone, settings and placeholder substitution.
- Live TRMNL runtime has 5 seconds / 128 MB. This preview downloads feeds in parallel with a 3.5-second timeout and 2 MB per-feed cap, then allows 1.2 seconds for processing. Very long recurrence history may hit the processing cap and returns an explanatory error rather than an incomplete list.
- RANGE=THISANDFUTURE recurrence changes are explicitly rejected for now. This must be supported before claiming broad ICS compatibility.
- Any failed feed produces an error for the whole display, avoiding a silently incomplete combined list. Private URLs are not included in returned errors.
- Full-screen layout is the first preview. Fifteen rows plus group headers and row-height gaps may exceed small devices. Device-specific sizing and smaller playlist layouts still need implementation and visual testing before publishing. Do not advertise all layout support yet.
- Title and footer overrides are capped at 150 characters. Calendar labels may be truncated on narrow screens.
- Final publication still requires testing on real feeds and TRMNL, plus checking recipe export/import carries Serverless code. This package is a private test build, not a published recipe.

Documentation:
- https://help.trmnl.com/en/articles/14130649-serverless
- https://help.trmnl.com/en/articles/10513740-custom-plugin-form-builder
- https://kewisch.github.io/ical.js/api/ICAL.Event.html

ICAL.js 2.2.1 is bundled unmodified from its npm distribution under MPL-2.0. Source: https://github.com/kewisch/ical.js/tree/v2.2.1 . The author-written application code follows the bundled library in serverless.js.

Live polling finding: direct Google ICS polling can fail with Malformed JSON before Serverless runs. Use the public JSON trigger URL above and let Serverless fetch all configured feeds in parallel. Native polling text acceptance is not confirmed.

Build size: the modern Node-compatible ICAL.js distribution is used rather than its larger ES5 compatibility build. The build fails if the final UTF-8 bundle reaches 100,000 bytes, matching the live editor limit.

OG overflow: copy the latest full.html. It measures available height and preserves readable rows. There is no extra count line. Use {count} in a title/footer override to report only the visible events. Update both Serverless and Full markup together for this behaviour. Browser test: tests/layout.cjs (requires Playwright and a Chromium browser; optional BROWSER_PATH).

Half vertical is available in layouts/half_vertical.html. Paste it into its matching tab; save and preview using your target device. Dates omit the year in this narrower view. No Serverless changes needed.
