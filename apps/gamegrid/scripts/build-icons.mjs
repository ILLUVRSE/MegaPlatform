import fs from 'node:fs';
import path from 'node:path';

const cwd = process.cwd();
const rawDir = path.join(cwd, 'src/assets/icons/raw');
const publicDir = path.join(cwd, 'public/icons');
const generatedDir = path.join(cwd, 'src/assets/icons/generated');

function optimizeSvg(svg) {
  return svg
    .replace(/<\?xml[\s\S]*?\?>/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/>\s+</g, '><')
    .replace(/\n/g, '')
    .trim();
}

function toSymbol(svg, id) {
  const withoutWrapper = svg
    .replace(/<svg[^>]*viewBox="([^"]+)"[^>]*>/i, '<symbol id="icon-$ID$" viewBox="$1">')
    .replace(/<svg[^>]*>/i, `<symbol id="icon-${id}" viewBox="0 0 24 24">`)
    .replace(/<\/svg>/i, '</symbol>')
    .replace('$ID$', id);
  return withoutWrapper;
}

function run() {
  if (!fs.existsSync(rawDir)) {
    throw new Error(`Missing raw icon dir: ${rawDir}`);
  }
  fs.mkdirSync(publicDir, { recursive: true });
  fs.mkdirSync(generatedDir, { recursive: true });

  const files = fs
    .readdirSync(rawDir)
    .filter((file) => file.endsWith('.svg'))
    .sort((a, b) => a.localeCompare(b));

  const manifest = {};
  const symbols = [];

  for (const file of files) {
    const iconId = file.replace(/\.svg$/i, '');
    const raw = fs.readFileSync(path.join(rawDir, file), 'utf8');
    const optimized = optimizeSvg(raw);
    symbols.push(toSymbol(optimized, iconId));
    manifest[iconId] = `icon-${iconId}`;
    fs.writeFileSync(path.join(generatedDir, file), `${optimized}\n`);
  }

  const sprite = `<svg xmlns="http://www.w3.org/2000/svg" style="display:none">${symbols.join('')}</svg>\n`;
  fs.writeFileSync(path.join(publicDir, 'sprite.svg'), sprite);
  fs.writeFileSync(path.join(cwd, 'src/assets/icons/manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Built ${files.length} icons.`);
}

run();
