const fs = require('fs');
const path = require('path');

const DIR = __dirname;

/**
 * Rules directory:
 * - default.json: global default (required)
 * - other *.json: basename (without .json) = hostname, e.g. blog.pulipuli.info.json
 *   Match: exact host equality or host under *.that-domain
 */
function loadRulesConfig() {
  const defaultPath = path.join(DIR, 'default.json');
  if (!fs.existsSync(defaultPath)) {
    throw new Error(`rules: missing required file ${defaultPath}`);
  }
  const defaultRule = JSON.parse(fs.readFileSync(defaultPath, 'utf8'));

  const domains = {};
  const names = fs.readdirSync(DIR).filter((n) => n.endsWith('.json') && n !== 'default.json');
  names.sort();
  for (const file of names) {
    const domain = file.slice(0, -'.json'.length).toLowerCase();
    if (!domain) continue;
    const full = path.join(DIR, file);
    domains[domain] = JSON.parse(fs.readFileSync(full, 'utf8'));
  }

  return { default: defaultRule, domains };
}

module.exports = loadRulesConfig();
