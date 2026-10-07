// Keep the official spacing rules, while the browser fixtures supply their own screen shell.
const fs = require('fs');
module.exports = function frameworkSpacing() {
  if (!process.env.FRAMEWORK_CSS) throw new Error('Set FRAMEWORK_CSS to the downloaded TRMNL plugins.css file.');
  const source = fs.readFileSync(process.env.FRAMEWORK_CSS, 'utf8');
  const rules = [];
  for (const match of source.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const [, selectors, declarations] = match;
    if ((selectors.trim().startsWith('@property --tn-') && /^@property --tn-[pm]/.test(selectors.trim())) ||
        (selectors.startsWith('.trmnl ') && /--tn-[pm]/.test(declarations)) || selectors === '.text--left') {
      rules.push(match[0]);
    }
  }
  if (!rules.length) throw new Error('No TRMNL spacing utility rules found in FRAMEWORK_CSS.');
  return rules.join('');
};
