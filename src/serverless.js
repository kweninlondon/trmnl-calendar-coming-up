// The release file includes ICAL.js above this code; no npm installation is needed.
function clean(value, max = 120) {
  return Array.from(String(value || '').replace(/\s+/g, ' ').trim()).slice(0, max).join('');
}
function parts(date, zone) {
  return Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
  }).formatToParts(date).filter(p => p.type !== 'literal').map(p => [p.type, p.value]));
}
function dayKey(date, zone) {
  const p = parts(date, zone); return `${p.year}-${p.month}-${p.day}`;
}
function civilDate(time) {
  return `${time.year}-${String(time.month).padStart(2, '0')}-${String(time.day).padStart(2, '0')}`;
}
function wallMillis(time, zone) {
  const wall = Date.UTC(time.year, time.month - 1, time.day, time.hour || 0, time.minute || 0, time.second || 0);
  let guess = wall;
  for (let i = 0; i < 4; i++) {
    const p = parts(new Date(guess), zone);
    const shown = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
    const correction = wall - shown;
    if (!correction) break;
    guess += correction;
  }
  return guess;
}
function millis(time, prop, displayZone) {
  if (time.isDate) return wallMillis(time, displayZone);
  const tzid = prop && prop.getParameter('tzid');
  if (tzid && !ICAL.TimezoneService.has(tzid)) return wallMillis(time, tzid);
  if (!tzid && time.zone.tzid === 'floating') return wallMillis(time, displayZone);
  return time.toUnixTime() * 1000;
}
function parseFeed(text, index, limit, zone, now, deadline) {
  ICAL.TimezoneService.reset();
  const root = new ICAL.Component(ICAL.parse(text));
  if (root.name !== 'vcalendar') throw new Error('Expected an ICS calendar feed.');
  for (const tz of root.getAllSubcomponents('vtimezone')) {
    const id = tz.getFirstPropertyValue('tzid');
    ICAL.TimezoneService.register(new ICAL.Timezone({component: tz, tzid: id}), id);
  }
  const name = clean(root.getFirstPropertyValue('x-wr-calname') || root.getFirstPropertyValue('name') || `Calendar ${index + 1}`, 60);
  const description = clean(root.getFirstPropertyValue('x-wr-caldesc') || root.getFirstPropertyValue('description'), 150);
  const components = root.getAllSubcomponents('vevent');
  const masters = components.filter(c => !c.hasProperty('recurrence-id'));
  const overrides = components.filter(c => c.hasProperty('recurrence-id'));
  const rows = [];
  const seen = new Set();
  function add(item, start, end, identity) {
    if (String(item.component.getFirstPropertyValue('status')).toUpperCase() === 'CANCELLED') return false;
    const startMs = millis(start, item.component.getFirstProperty('dtstart'), zone);
    const endMs = millis(end, item.component.getFirstProperty('dtend') || item.component.getFirstProperty('dtstart'), zone);
    if (endMs <= now.getTime() && !(startMs === endMs && startMs >= now.getTime())) return false;
    const key = `${item.uid}|${identity}`;
    if (seen.has(key)) return false;
    seen.add(key);
    const dateKey = start.isDate ? civilDate(start) : dayKey(new Date(startMs), zone);
    const displayDate = start.isDate ? new Date(dateKey + 'T12:00:00Z') : new Date(startMs);
    rows.push({title: clean(item.summary || '(Untitled event)', 100), calendar: name,
      date_key: dateKey, sort: startMs,
      date: new Intl.DateTimeFormat('en-GB', {timeZone: start.isDate ? 'UTC' : zone, weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'}).format(displayDate),
      time: start.isDate ? 'All day' : new Intl.DateTimeFormat('en-GB', {timeZone: zone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}).format(displayDate)});
    return true;
  }
  // Process moved occurrences separately so an occurrence moved much earlier is not missed.
  for (const component of overrides) {
    const item = new ICAL.Event(component);
    if (component.hasProperty('dtstart')) add(item, item.startDate, item.endDate, item.recurrenceId.toString());
  }
  for (const component of masters) {
    if (Date.now() > deadline) throw new Error('Calendar is too complex for the runtime limit.');
    const item = new ICAL.Event(component, {exceptions: []});
    if (!component.hasProperty('dtstart')) continue;
    if (!item.isRecurring()) { add(item, item.startDate, item.endDate, 'single'); continue; }
    const related = overrides.filter(c => c.getFirstPropertyValue('uid') === item.uid);
    for (const exception of related) {
      let normalized = exception;
      if (!exception.hasProperty('dtstart') && exception.getFirstProperty('recurrence-id').getParameter('range') === 'THISANDFUTURE') {
        // A cancellation may omit DTSTART. Supply the original occurrence time
        // for the library's range arithmetic; its CANCELLED status is preserved.
        normalized = new ICAL.Component(JSON.parse(JSON.stringify(exception.toJSON())));
        const start = exception.getFirstPropertyValue('recurrence-id').clone();
        normalized.addPropertyWithValue('dtstart', start);
        const end = start.clone(); end.addDuration(item.duration);
        normalized.addPropertyWithValue('dtend', end);
      }
      if (normalized.hasProperty('dtstart')) item.relateException(normalized);
    }
    const replaced = new Set(related.filter(c => !c.getFirstProperty('recurrence-id').getParameter('range'))
      .map(c => c.getFirstPropertyValue('recurrence-id').toString()));
    const iterator = item.iterator();
    let accepted = 0, steps = 0, occurrence;
    while ((occurrence = iterator.next())) {
      if (++steps > 50000 || Date.now() > deadline) throw new Error('Recurrence expansion exceeded the runtime limit.');
      if (replaced.has(occurrence.toString())) continue;
      const detail = item.getOccurrenceDetails(occurrence);
      const cancelled = String(detail.item.component.getFirstPropertyValue('status')).toUpperCase() === 'CANCELLED';
      if (cancelled && detail.item.modifiesFuture()) {
        const laterActiveRange = related.some(c => c.getFirstProperty('recurrence-id').getParameter('range') === 'THISANDFUTURE'
          && c.getFirstPropertyValue('recurrence-id').compare(occurrence) > 0
          && String(c.getFirstPropertyValue('status')).toUpperCase() !== 'CANCELLED');
        if (!laterActiveRange) break;
      }
      if (add(detail.item, detail.startDate, detail.endDate, occurrence.toString())) accepted++;
      if (accepted >= limit) break;
    }
  }
  rows.sort((a, b) => a.sort - b.sort || a.title.localeCompare(b.title));
  return {name, description, events: rows.slice(0, limit)};
}
async function fetchFeed(url) {
  const address = url.replace(/^webcal:/i, 'https:');
  if (!/^https:\/\/[^\s/]+\//i.test(address)) throw new Error('Use an HTTPS calendar feed link.');
  // TRMNL may provide fetch without the native Web Streams / AbortSignal globals.
  const options = typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function'
    ? {signal: AbortSignal.timeout(3500)} : {};
  const response = await fetch(address, options);
  if (!response.ok) throw new Error(`Calendar download failed (HTTP ${response.status}).`);
  const declaredSize = Number(response.headers?.get?.('content-length') || 0);
  if (declaredSize > 2000000) throw new Error('Calendar feed exceeds the 2 MB preview limit.');
  const text = await response.text();
  if (text.length > 2000000) throw new Error('Calendar feed exceeds the 2 MB preview limit.');
  if (!text.trimStart().startsWith('BEGIN:VCALENDAR')) throw new Error('Expected an ICS calendar feed, but the link returned another page.');
  return text;
}
// A separate deadline also covers runtimes whose fetch shim lacks AbortSignal.
async function downloadFeeds(urls, timeoutMs = 3500) {
  let timer;
  try {
    return await Promise.race([
      Promise.all(urls.map(url => fetchFeed(url))),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('Calendar downloads timed out. Try refreshing again or use a smaller feed.')), timeoutMs);
      })
    ]);
  } finally {
    clearTimeout(timer);
  }
}
// Native polling can supply raw text inside a payload wrapper. Find calendar
// strings without depending on a particular TRMNL plaintext wrapper key.
function polledFeeds(input) {
  const found = [];
  const visited = new Set();
  function visit(value, depth) {
    if (depth > 8 || value == null) return;
    if (typeof value === 'string') {
      if (value.trimStart().startsWith('BEGIN:VCALENDAR')) found.push(value);
      return;
    }
    if (typeof value !== 'object' || visited.has(value)) return;
    visited.add(value);
    for (const [key, child] of Object.entries(value)) {
      if (key !== 'trmnl' && key !== 'custom_fields_values') visit(child, depth + 1);
    }
  }
  visit(input, 0);
  return [...new Set(found)];
}
async function run(input) {
  const fields = input.trmnl?.plugin_settings?.custom_fields_values || input.custom_fields_values || {};
  const limit = Math.max(1, Math.min(15, parseInt(fields.event_limit, 10) || 10));
  const zone = fields.time_zone || input.trmnl?.user?.time_zone || 'UTC';
  const now = new Date();
  const grouping = ![false, 'false', 'no', '0'].includes(fields.group_events);
  const urls = [...new Set([fields.ics_1, fields.ics_2, fields.ics_3, fields.ics_4, fields.ics_5].map(value => String(value || '').trim()).filter(Boolean))];
  let stage = 'timezone';
  try {
    parts(now, zone); // Validate timezone before processing any feed.
    if (!urls.length) throw new Error('Add at least one ICS calendar link in settings.');
    stage = 'download';
    const polled = polledFeeds(input);
    const downloaded = polled.length === urls.length ? polled : await downloadFeeds(urls);
    stage = 'parse';
    const deadline = Date.now() + 1200;
    const feeds = downloaded.map((text, i) => parseFeed(text, i, limit, zone, now, deadline));
    stage = 'format';
    const selected = feeds.flatMap(f => f.events).sort((a, b) => a.sort - b.sort || a.title.localeCompare(b.title)).slice(0, limit);
    const today = dayKey(now, zone);
    const monday = new Date(today + 'T00:00:00Z');
    monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
    const next = new Date(monday); next.setUTCDate(next.getUTCDate() + 7);
    const later = new Date(monday); later.setUTCDate(later.getUTCDate() + 14);
    const events = selected.map(e => ({title: e.title, date: e.date, time: e.time, calendar: e.calendar,
      group: grouping ? (e.date_key <= today ? 'Today' : e.date_key < next.toISOString().slice(0, 10) ? 'This week' : e.date_key < later.toISOString().slice(0, 10) ? 'Next week' : 'Later') : ''}));
    const values = {count: events.length, limit, calendars: feeds.map(f => f.name).join(', '), calendar_count: feeds.length,
      description: feeds.length === 1 ? feeds[0].description : ''};
    const expand = value => clean(String(value).replace(/\{(count|limit|calendars|calendar_count|description)\}/g, (_, key) => values[key]), 150);
    const defaultTitle = feeds.length === 1 ? 'Coming Up in {calendars}' : 'Coming Up';
    const defaultFooter = values.description || '{count} events coming up';
    const countTemplate = value => clean(String(value).replace(/\{(limit|calendars|calendar_count|description)\}/g, (_, key) => values[key]), 150);
    return {title: expand(fields.title_override || defaultTitle), footer: expand(fields.footer_override || defaultFooter),
      title_count_template: countTemplate(fields.title_override || defaultTitle),
      footer_count_template: countTemplate(fields.footer_override || defaultFooter),
      events, show_calendar: feeds.length > 1, grouping, count: events.length,
      updated: new Intl.DateTimeFormat('en-GB', {timeZone: zone, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}).format(now), error: ''};
  } catch (error) {
    // Never echo private feed URLs or parser input into screen/error output.
    const safe = /^(Add at least|Use an HTTPS|Calendar download failed|Calendar feed exceeds|Expected an ICS|This feed uses|Calendar is too complex|Recurrence expansion)/.test(error.message);
    return {title: 'Coming Up', footer: 'Check calendar settings', events: [], count: 0,
      error: safe ? error.message : `Calendar error during ${stage} (${error.name || 'Error'}). Please report this message.`,
      input_keys: Object.keys(input).filter(k => k !== 'trmnl'), polled_feed_count: polledFeeds(input).length, updated: ''};
  }
}
