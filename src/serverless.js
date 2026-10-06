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
    if (component.getFirstProperty('recurrence-id').getParameter('range')) {
      throw new Error('This feed uses changes to all future occurrences, which this preview does not support yet.');
    }
    const item = new ICAL.Event(component);
    if (component.hasProperty('dtstart')) add(item, item.startDate, item.endDate, item.recurrenceId.toString());
  }
  for (const component of masters) {
    if (Date.now() > deadline) throw new Error('Calendar is too complex for the runtime limit.');
    const item = new ICAL.Event(component, {exceptions: []});
    if (!component.hasProperty('dtstart')) continue;
    if (!item.isRecurring()) { add(item, item.startDate, item.endDate, 'single'); continue; }
    const related = overrides.filter(c => c.getFirstPropertyValue('uid') === item.uid);
    const replaced = new Set(related.map(c => c.getFirstPropertyValue('recurrence-id').toString()));
    const iterator = item.iterator();
    let accepted = 0, steps = 0, occurrence;
    while ((occurrence = iterator.next())) {
      if (++steps > 50000 || Date.now() > deadline) throw new Error('Recurrence expansion exceeded the runtime limit.');
      if (replaced.has(occurrence.toString())) continue;
      const end = occurrence.clone(); end.addDuration(item.duration);
      if (add(item, occurrence, end, occurrence.toString())) accepted++;
      if (accepted >= limit) break;
    }
  }
  rows.sort((a, b) => a.sort - b.sort || a.title.localeCompare(b.title));
  return {name, description, events: rows.slice(0, limit)};
}
async function fetchFeed(url) {
  const parsed = new URL(url.replace(/^webcal:/i, 'https:'));
  if (parsed.protocol !== 'https:') throw new Error('Use an HTTPS calendar feed link.');
  const response = await fetch(parsed.href, {signal: AbortSignal.timeout(2800)});
  if (!response.ok) throw new Error(`Calendar download failed (HTTP ${response.status}).`);
  const reader = response.body.getReader();
  let total = 0; const chunks = [];
  while (true) {
    const {done, value} = await reader.read(); if (done) break;
    total += value.length;
    if (total > 2000000) { await reader.cancel(); throw new Error('Calendar feed exceeds the 2 MB preview limit.'); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return new TextDecoder().decode(bytes);
}
async function run(input) {
  const fields = input.trmnl?.plugin_settings?.custom_fields_values || input.custom_fields_values || {};
  const limit = Math.max(1, Math.min(15, parseInt(fields.event_limit, 10) || 10));
  const zone = fields.time_zone || input.trmnl?.user?.time_zone || 'UTC';
  const now = new Date();
  const grouping = ![false, 'false', 'no', '0'].includes(fields.group_events);
  const urls = [...new Set([1, 2, 3, 4, 5].map(i => String(fields[`ics_${i}`] || '').trim()).filter(Boolean))];
  try {
    parts(now, zone); // Validate timezone before processing any feed.
    if (!urls.length) throw new Error('Add at least one ICS calendar link in settings.');
    const downloaded = await Promise.all(urls.map(url => fetchFeed(url)));
    const deadline = Date.now() + 1200;
    const feeds = downloaded.map((text, i) => parseFeed(text, i, limit, zone, now, deadline));
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
    const defaultTitle = feeds.length === 1 ? feeds[0].name : 'Upcoming events';
    const defaultFooter = values.description || `Next ${events.length} events from ${feeds.length} calendar${feeds.length === 1 ? '' : 's'}`;
    return {title: expand(fields.title_override || defaultTitle), footer: expand(fields.footer_override || defaultFooter),
      events, show_calendar: feeds.length > 1, grouping, count: events.length,
      updated: new Intl.DateTimeFormat('en-GB', {timeZone: zone, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}).format(now), error: ''};
  } catch (error) {
    // Never echo private feed URLs or parser input into screen/error output.
    const safe = /^(Add at least|Use an HTTPS|Calendar download failed|Calendar feed exceeds|Expected an ICS|This feed uses|Calendar is too complex|Recurrence expansion)/.test(error.message);
    return {title: 'Upcoming events', footer: 'Check calendar settings', events: [], count: 0,
      error: safe ? error.message : 'Unable to read the feed. Check the ICS link and timezone, or try a smaller calendar.', updated: ''};
  }
}
