// Builds index.json, the repository index the app reads (LNReader's
// plugins.min.json format): one entry per plugin under plugins/<language>/,
// with raw GitHub URLs for its code and icon.
//
//   node scripts/build-index.mjs
//
// Each plugin is loaded with stand-in modules just to read its id, name, site
// and version, so a plugin that doesn't even load fails the build.
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';

const RAW = 'https://raw.githubusercontent.com/mtgims/novelscraper-extensions/master/';

// A module stand-in: every property and call gives back another stand-in.
const stub = () => new Proxy(function () {}, {
  get: (_, k) => (k === Symbol.toPrimitive ? () => '' : stub()),
  apply: () => stub(),
  construct: () => stub(),
});

const title = s => s.charAt(0).toUpperCase() + s.slice(1);
const entries = [];
for (const lang of readdirSync('plugins').sort()) {
  for (const file of readdirSync(join('plugins', lang)).filter(f => f.endsWith('.js')).sort()) {
    const path = join('plugins', lang, file);
    const module = { exports: {} };
    new Function('require', 'module', 'exports', readFileSync(path, 'utf8'))(stub, module, module.exports);
    const p = module.exports.default;
    for (const k of ['id', 'name', 'site', 'version']) {
      if (typeof p?.[k] !== 'string' || !p[k]) throw new Error(`${path}: missing ${k}`);
    }
    if (!p.id.startsWith('novelscraper.')) throw new Error(`${path}: ids start with "novelscraper." (got ${p.id})`);
    const icon = join('icons', basename(file, '.js') + '.png');
    entries.push({
      id: p.id,
      name: p.name,
      site: p.site,
      lang: title(lang),
      version: p.version,
      url: RAW + path,
      iconUrl: existsSync(icon) ? RAW + icon : '',
    });
  }
}
const ids = entries.map(e => e.id);
const dup = ids.find((id, i) => ids.indexOf(id) !== i);
if (dup) throw new Error(`duplicate id ${dup}`);
writeFileSync('index.json', JSON.stringify(entries, null, 2) + '\n');
console.log(`index.json: ${entries.length} plugins`);
