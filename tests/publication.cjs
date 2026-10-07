const fs = require('node:fs');
const assert = require('node:assert/strict');
const layouts = ['full', 'half_vertical', 'half_horizontal', 'quadrant', 'shared'];
for (const name of layouts.filter(name => name !== 'shared')) {
  const source = fs.readFileSync(`layouts/${name}.html`, 'utf8');
  assert.equal((source.match(/class="layout /g) || []).length, 1, `${name} must contain one layout wrapper`);
  assert(source.includes('class="title_bar"'));
}
const markup = layouts.map(name => fs.readFileSync(`layouts/${name}.html`, 'utf8')).join('\n');
// Cover the broader best-practices list as well as the published Chef implementation.
const properties = ['display', 'justify-content', 'padding', 'margin', 'background-color', 'color', 'border-radius', 'text-align', 'object-fit', 'font-size'];
for (const property of properties) assert(!markup.includes(property), `Publication markup contains ${property}`);
assert(!/\bstyle\s*=/i.test(markup), 'Publication markup contains an inline style attribute');
assert(!/<style\b/i.test(markup), 'Publication markup contains an embedded stylesheet');
assert(/<link rel="stylesheet" href="https:\/\/cdn\.jsdelivr\.net\/gh\/kweninlondon\/trmnl-calendar-coming-up@[a-f0-9]{40}\/assets\/coming-up\.css">/.test(markup), 'Stylesheet URL must pin an immutable commit');
const transform = fs.readFileSync('dist/serverless.js', 'utf8');
for (let i = 1; i <= 5; i++) assert(transform.includes(`fields.ics_${i}`));
assert(Buffer.byteLength(transform) < 100000);
assert(fs.readFileSync('settings.yml', 'utf8').includes('field_type: author_bio'));
console.log('Publication checks pass: zero documented style terms, zero inline styles, pinned stylesheet, explicit ICS fields and author bio.');
