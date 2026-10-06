const fs = require('node:fs');
const library = fs.readFileSync('vendor/ical.min.js', 'utf8');
// Adapt the package's ES module export to a local variable for TRMNL's editor.
const exportPattern = /export\{([A-Za-z_$][\w$]*) as default\};\s*$/;
if (!exportPattern.test(library)) throw new Error('Unexpected ICAL.js export format');
const adapted = library.replace(exportPattern, 'return $1;');
const application = fs.readFileSync('src/serverless.js', 'utf8');
const bundle = 'const ICAL = (() => {\n' + adapted + '\n})();\n' + application;
if (Buffer.byteLength(bundle, 'utf8') >= 100000) throw new Error('TRMNL Serverless bundle must be below 100 KB');
fs.mkdirSync('dist', {recursive: true});
fs.writeFileSync('dist/serverless.js', bundle);
console.log('Serverless bundle: ' + Buffer.byteLength(bundle, 'utf8') + ' bytes');
