// Builds dist/ from tokens/ and brand-assets/:
//   dist/css/{tokens,fonts,brand}.css   CSS custom properties + @font-face
//   dist/scss/_tokens.scss              Sass variables
//   dist/js/tokens.{js,d.ts}            ES module for TS/JS (PrimeNG presets, canvas, maps)
//   dist/json/tokens.json               plain resolved values
//   dist/fonts/                         Figtree variable woff2 (self-hosted, OFL)
//   dist/logos/                         logos with descriptive names
//   dist/icons/                         favicon.ico/.svg, apple-touch-icon, PWA icons
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';
import StyleDictionary from 'style-dictionary';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const require = createRequire(import.meta.url);
const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));

const PREFIX = 'kk';
const SCHEMES = ['light', 'dark'];
const banner = `Kaptajn Kasper brand ${pkg.version}. Generated from Kaptajn-Kasper/brand-identity, do not edit.`;

await rm(dist, { recursive: true, force: true });

// ---------------------------------------------------------------- tokens

const sd = new StyleDictionary({
  source: [path.join(root, 'tokens/**/*.json')],
  usesDtcg: true,
  log: { verbosity: 'silent' },
});

const isScheme = (token) => token.path[0] === 'color' && SCHEMES.includes(token.path[1]);
// color.light.primary -> --kk-color-primary; everything else keeps its full path.
const cssName = (token) =>
  `--${PREFIX}-${(isScheme(token) ? ['color', ...token.path.slice(2)] : token.path).join('-')}`;
const cssValue = (token) => {
  const value = token.$value;
  if (Array.isArray(value)) return value.map((f) => (/\s/.test(f) ? `"${f}"` : f)).join(', ');
  return String(value);
};
const declarations = (tokens, indent = '  ') =>
  tokens.map((t) => `${indent}${cssName(t)}: ${cssValue(t)};`).join('\n');

StyleDictionary.registerFormat({
  name: 'kk/css',
  format: ({ dictionary }) => {
    const all = dictionary.allTokens;
    const constant = all.filter((t) => !isScheme(t));
    const scheme = (name) => all.filter((t) => isScheme(t) && t.path[1] === name);
    return `/* ${banner} */

/* Brand constants: logo colours and typography. */
:root {
${declarations(constant)}
}

/* Colour roles (Material 3). Light by default; opt into dark with
   data-theme="dark", or follow the OS with data-theme="auto". */
:root,
[data-theme="light"] {
  color-scheme: light;
${declarations(scheme('light'))}
}

[data-theme="dark"] {
  color-scheme: dark;
${declarations(scheme('dark'))}
}

@media (prefers-color-scheme: dark) {
  [data-theme="auto"] {
    color-scheme: dark;
${declarations(scheme('dark'), '    ')}
  }
}
`;
  },
});

StyleDictionary.registerFormat({
  name: 'kk/scss',
  format: ({ dictionary }) =>
    `// ${banner}\n\n` +
    dictionary.allTokens
      .map((t) => `$${PREFIX}-${t.path.join('-')}: ${cssValue(t)};`)
      .join('\n') +
    '\n',
});

// Nested plain object of resolved values: { color: { light: { onPrimary: '#ffffff' } } }.
// Keys are camelCased for JS; the JSON output keeps the kebab-case token names.
const camel = (key) => key.replace(/-(\w)/g, (_, c) => c.toUpperCase());
const plain = (tokens, rename = (k) => k) =>
  Object.fromEntries(
    Object.entries(tokens).map(([k, v]) => [
      rename(k),
      '$value' in v ? v.$value : plain(v, rename),
    ]),
  );

StyleDictionary.registerFormat({
  name: 'kk/esm',
  format: ({ dictionary }) => {
    const values = plain(dictionary.tokens, camel);
    return (
      `// ${banner}\n\n` +
      Object.entries(values)
        .map(([k, v]) => `export const ${k} = ${JSON.stringify(v, null, 2)};\n`)
        .join('\n') +
      `\nexport default { ${Object.keys(values).join(', ')} };\n`
    );
  },
});

StyleDictionary.registerFormat({
  name: 'kk/dts',
  format: ({ dictionary }) => {
    const values = plain(dictionary.tokens, camel);
    const literal = (v, d = 0) => {
      const pad = '  '.repeat(d + 1);
      if (Array.isArray(v)) return `readonly [${v.map((x) => JSON.stringify(x)).join(', ')}]`;
      if (typeof v === 'object')
        return `{\n${Object.entries(v)
          .map(([k, x]) => `${pad}readonly ${JSON.stringify(k)}: ${literal(x, d + 1)};`)
          .join('\n')}\n${'  '.repeat(d)}}`;
      return JSON.stringify(v);
    };
    return (
      `// ${banner}\n\n` +
      Object.entries(values)
        .map(([k, v]) => `export declare const ${k}: ${literal(v)};\n`)
        .join('\n') +
      `\ndeclare const tokens: { ${Object.keys(values)
        .map((k) => `readonly ${k}: typeof ${k}`)
        .join('; ')} };\nexport default tokens;\n`
    );
  },
});

StyleDictionary.registerFormat({
  name: 'kk/json',
  format: ({ dictionary }) => JSON.stringify(plain(dictionary.tokens), null, 2) + '\n',
});

const platform = (dir, files) => ({ buildPath: path.join(dist, dir) + '/', files });
await sd.extend({
  platforms: {
    css: platform('css', [{ destination: 'tokens.css', format: 'kk/css' }]),
    scss: platform('scss', [{ destination: '_tokens.scss', format: 'kk/scss' }]),
    js: platform('js', [
      { destination: 'tokens.js', format: 'kk/esm' },
      { destination: 'tokens.d.ts', format: 'kk/dts' },
    ]),
    json: platform('json', [{ destination: 'tokens.json', format: 'kk/json' }]),
  },
}).then((s) => s.buildAllPlatforms());

// ---------------------------------------------------------------- fonts

// Self-host Figtree (no Google Fonts request: faster, no third-party tracking).
const fontPkg = path.dirname(require.resolve('@fontsource-variable/figtree/package.json'));
await mkdir(path.join(dist, 'fonts'), { recursive: true });
for (const file of await readdir(path.join(fontPkg, 'files'))) {
  if (/^figtree-latin(-ext)?-wght-(normal|italic)\.woff2$/.test(file)) {
    await cp(path.join(fontPkg, 'files', file), path.join(dist, 'fonts', file));
  }
}
await cp(path.join(fontPkg, 'LICENSE'), path.join(dist, 'fonts', 'OFL.txt'));

let fontFaces = '';
for (const css of ['wght.css', 'wght-italic.css']) {
  const src = await readFile(path.join(fontPkg, css), 'utf8');
  // Keep only the latin + latin-ext faces (Danish needs nothing else) and
  // expose the family under its real name, "Figtree".
  for (const block of src.match(/\/\* [\w-]+ \*\/\s*@font-face\s*{[^}]*}/g) ?? []) {
    if (!/^\/\* figtree-latin(-ext)?-wght-(normal|italic) \*\//.test(block)) continue;
    fontFaces +=
      block
        .replace(/font-family:\s*'Figtree Variable'/, "font-family: 'Figtree'")
        .replace(/url\(\.\/files\//g, 'url(../fonts/') + '\n\n';
  }
}
if (!fontFaces.includes('figtree-latin-wght-normal')) throw new Error('Figtree @font-face not found');
const fontsCss = `/* ${banner} */\n/* Figtree, SIL Open Font License 1.1 (see ../fonts/OFL.txt). */\n\n${fontFaces}`;
await writeFile(path.join(dist, 'css', 'fonts.css'), fontsCss);

// brand.css = fonts + tokens + a minimal base, as one file (no runtime @import).
const tokensCss = await readFile(path.join(dist, 'css', 'tokens.css'), 'utf8');
const strip = (css) => css.replace(/^\/\* Kaptajn Kasper brand .*\*\/\n/, '');
await writeFile(
  path.join(dist, 'css', 'brand.css'),
  `/* ${banner} */\n\n${strip(fontsCss)}${strip(tokensCss)}
/* Base: brand font and surface colours. Override freely in the app. */
:where(:root) {
  font-family: var(--${PREFIX}-font-family-brand);
  background-color: var(--${PREFIX}-color-surface);
  color: var(--${PREFIX}-color-on-surface);
}
`,
);

// ---------------------------------------------------------------- logos

// brand-board labels -> descriptive names. variant-1 is the mark on white,
// variant-2 on a light tint of the colour, variant-3 light mark on a dark tile.
const BACKGROUND = { 1: 'white', 2: 'light', 3: 'dark' };
// The playful logo's 3D extrusion makes its SVGs ~1 MB each, so the package
// ships it as PNG only; the SVGs stay in brand-assets/ for print and design.
const LOGO_DIRS = {
  'logos': { kind: 'icon', formats: ['svg', 'png'] },
  'logos-with-brand-name': { kind: 'wordmark', formats: ['svg', 'png'] },
  'logos-playful': { kind: 'playful', formats: ['png'] },
};
await mkdir(path.join(dist, 'logos'), { recursive: true });
for (const [dir, { kind, formats }] of Object.entries(LOGO_DIRS)) {
  for (const file of await readdir(path.join(root, 'brand-assets', dir))) {
    const m = file.match(/^logo-\d-color-(primary|secondary|tertiary)-variant-([1-3])\.(svg|png)$/);
    if (!m || !formats.includes(m[3])) continue;
    const [, role, variant, ext] = m;
    await cp(
      path.join(root, 'brand-assets', dir, file),
      path.join(dist, 'logos', `${kind}-${role}-${BACKGROUND[variant]}.${ext}`),
    );
  }
}

// ---------------------------------------------------------------- icons

// Favicons from the dark primary tile, which reads well on light and dark tabs.
const iconSvg = await readFile(path.join(root, 'brand-assets/logos/logo-1-color-primary-variant-3.svg'));
const tileColour = '#083a42'; // the tile's own background, for full-bleed icons
const png = (size, background) =>
  new Resvg(iconSvg, { fitTo: { mode: 'width', value: size }, background }).render().asPng();

// ICO containing PNG-encoded 16/32/48 images (supported by every current browser).
const ico = (sizes) => {
  const images = sizes.map((s) => png(s));
  const header = Buffer.alloc(6 + 16 * images.length);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach((img, i) => {
    const e = 6 + 16 * i;
    header.writeUInt8(sizes[i] % 256, e);
    header.writeUInt8(sizes[i] % 256, e + 1);
    header.writeUInt16LE(1, e + 4);
    header.writeUInt16LE(32, e + 6);
    header.writeUInt32LE(img.length, e + 8);
    header.writeUInt32LE(offset, e + 12);
    offset += img.length;
  });
  return Buffer.concat([header, ...images]);
};

const icons = path.join(dist, 'icons');
await mkdir(icons, { recursive: true });
await writeFile(path.join(icons, 'favicon.svg'), iconSvg);
await writeFile(path.join(icons, 'favicon.ico'), ico([16, 32, 48]));
// iOS and Android mask these themselves, so they must be full-bleed (no transparent corners).
await writeFile(path.join(icons, 'apple-touch-icon.png'), png(180, tileColour));
await writeFile(path.join(icons, 'icon-192.png'), png(192, tileColour));
await writeFile(path.join(icons, 'icon-512.png'), png(512, tileColour));

console.log(`built ${path.relative(root, dist)}/ for ${pkg.name}@${pkg.version}`);
