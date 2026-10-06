const fs = require('node:fs');
const library = fs.readFileSync('vendor/ical.es5.min.cjs', 'utf8');
const application = fs.readFileSync('src/serverless.js', 'utf8');
fs.mkdirSync('dist', {recursive: true});
fs.writeFileSync('dist/serverless.js', 'const ICAL = (() => { const module = {exports: {}}; const exports = module.exports;\n' + library + '\nreturn module.exports; })();\n' + application);
