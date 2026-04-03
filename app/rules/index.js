const fs = require('fs');
const path = require('path');

const DIR = __dirname;

/**
 * 規則目錄：
 * - default.json：全站預設（必填）
 * - 其餘 *.json：檔名（不含 .json）= hostname，例如 blog.pulipuli.info.json
 *   比對邏輯與先前相同：完全相等或 host 為 *.該網域
 */
function loadRulesConfig() {
  const defaultPath = path.join(DIR, 'default.json');
  if (!fs.existsSync(defaultPath)) {
    throw new Error(`rules: 缺少 ${defaultPath}`);
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
