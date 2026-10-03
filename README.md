# Brand Identity

The Kaptajn Kasper brand: colour palette, typography and logos. This repo is the
single source of truth for them. Apps consume it as the versioned npm package
`@kaptajn-kasper/brand`; they do not copy hex codes or logo files.

```
brand-board.svg          design source (Inkscape): logos + palette
brand-assets/            logos exported from the board (SVG with outlined text, 1024px PNG)
tokens/*.json            design tokens, W3C DTCG format: colour + typography
scripts/build.mjs        tokens + assets -> dist/ (Style Dictionary)
scripts/export-logos.sh  brand-board.svg -> brand-assets/
```

## Using it in an app

### Install

Install a released version (see [Releases](../../releases)):

```sh
npm install https://github.com/Kaptajn-Kasper/brand-identity/releases/download/v1.0.0/kaptajn-kasper-brand-1.0.0.tgz
```

The tarball URL needs no registry login and no `git`, so it works in `npm ci`
inside `node:*-alpine` Docker builds. To upgrade, install the newer release URL.

### CSS: font, colours, dark mode

```scss
// src/styles.scss
@import "@kaptajn-kasper/brand/brand.css";
```

`brand.css` contains the self-hosted Figtree font, every token as a CSS custom
property, and a minimal base (brand font and surface colours on `:root`). If you
want only part of that, import `fonts.css` or `tokens.css` on their own.

```css
.card {
  background: var(--kk-color-surface-container);
  color: var(--kk-color-on-surface);
  font-weight: var(--kk-font-weight-semibold);
}
.cta {
  background: var(--kk-color-primary);
  color: var(--kk-color-on-primary);
}
```

Colour roles are light by default. Set `data-theme` on `<html>` to change that:
`data-theme="dark"` forces dark, and `data-theme="auto"` follows the OS setting.

Angular's build bundles the woff2 files into `media/` with hashed names, so no
request goes to Google Fonts. Remove any `fonts.googleapis.com` import.

### SCSS variables

```scss
@use "@kaptajn-kasper/brand/tokens.scss" as brand;
$header-bg: brand.$kk-color-brand-teal-850;
```

### TypeScript: PrimeNG presets, maps, canvas

```ts
import { color, font } from '@kaptajn-kasper/brand';

color.light.primary;          // '#003c45'
color.dark.onPrimary;         // '#00363f'
color.brand.purple[200];      // '#d0b1e3'
font.family.brand.join(', '); // 'Figtree, system-ui, …'
```

Values are typed as literals. For example, a PrimeNG preset:

```ts
import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';
import { color } from '@kaptajn-kasper/brand';

export const BrandPreset = definePreset(Aura, {
  semantic: {
    colorScheme: {
      light: {
        primary: {
          color: color.light.primary,
          contrastColor: color.light.onPrimary,
          hoverColor: color.light.primaryContainer,
          activeColor: color.brand.teal[850],
        },
      },
    },
  },
});
```

`@kaptajn-kasper/brand/tokens.json` has the same values with kebab-case keys,
for tools that are not JavaScript.

### Logos and favicons

Copy them into the build output with an `angular.json` asset entry:

```json
"assets": [
  { "glob": "**/*", "input": "public" },
  { "glob": "**/*", "input": "node_modules/@kaptajn-kasper/brand/dist/icons", "output": "/" },
  { "glob": "*.svg", "input": "node_modules/@kaptajn-kasper/brand/dist/logos", "output": "/brand" }
]
```

```html
<!-- index.html -->
<link rel="icon" href="favicon.ico" sizes="48x48" />
<link rel="icon" href="favicon.svg" type="image/svg+xml" />
<link rel="apple-touch-icon" href="apple-touch-icon.png" />
<meta name="theme-color" content="#083a42" />
```

```html
<img src="/brand/wordmark-primary-dark.svg" alt="Kaptajn Kasper" height="48" />
```

Delete the app's own `public/favicon.ico` so it doesn't shadow the brand one.

| File in `dist/icons/` | Use |
|---|---|
| `favicon.ico` | 16/32/48 px, legacy browsers |
| `favicon.svg` | modern browsers |
| `apple-touch-icon.png` | 180 px, iOS home screen (full-bleed) |
| `icon-192.png`, `icon-512.png` | web app manifest (full-bleed) |

Logos in `dist/logos/` are named `<kind>-<colour>-<background>.{svg,png}`:

- **kind**: `icon` is the boat mark alone; `wordmark` adds "Kaptajn Kasper";
  `playful` is the tilted 3D wordmark for informal, game-like contexts
  (PNG only, 1024 px wide).
- **colour**: `primary` (teal), `secondary` (slate), `tertiary` (purple).
- **background**: every logo is a rounded tile. `white` has a coloured mark on
  white, `light` has a dark mark on a light tint, and `dark` has a light mark on
  a dark tile.

Prefer the SVGs. The text in them is converted to outlines, so they look the
same everywhere, including in `<img>` tags, which cannot load web fonts.

The playful logo's SVGs (~1 MB each, because of the 3D extrusion) are only in
`brand-assets/logos-playful/` in this repo, for print and design work.

## Palette

The colour roles are the Material 3 scheme from the brand board. They map
directly to [M3 colour roles](https://m3.material.io/styles/color/roles), so
`on-X` is always the readable text colour on `X`.

| Role | Light | Dark |
|---|---|---|
| primary / on-primary | `#003c45` / `#ffffff` | `#94d0de` / `#00363f` |
| primary-container / on- | `#0c5460` / `#8bc6d4` | `#0c5460` / `#8bc6d4` |
| secondary / on-secondary | `#4c6267` / `#ffffff` | `#b4cad0` / `#1e3438` |
| secondary-container / on- | `#cfe7ed` / `#52686d` | `#374c51` / `#a6bcc2` |
| tertiary / on-tertiary | `#432b54` / `#ffffff` | `#dbbbed` / `#3e264e` |
| tertiary-container / on- | `#5b426c` / `#d0b1e3` | `#5b426c` / `#d0b1e3` |
| error / on-error | `#ba1a1a` / `#ffffff` | `#ffb4ab` / `#690005` |
| surface / on-surface | `#f8f9fa` / `#191c1d` | `#111415` / `#e1e3e3` |

The surface containers, outline, inverse and scrim roles are in
[`tokens/color.json`](tokens/color.json). The logo colours are also exposed as
fixed constants (`--kk-color-brand-teal-900` and so on). They are the same in
both schemes.

**Typography:** [Figtree](https://fonts.google.com/specimen/Figtree) (SIL OFL
1.1), shipped as a variable font (weights 300–900, latin and latin-ext). The
wordmark is set in SemiBold (600).

## Changing the brand

- **Colours or fonts:** edit `tokens/*.json`.
- **Logos:** edit `brand-board.svg` in Inkscape, then run
  `npm run export-logos`. This needs Inkscape and the Figtree font installed.
  Commit the regenerated files in `brand-assets/`.

Then run `npm run build` and check `dist/`.

## Releasing

1. Bump `version` in `package.json` (semver: removing or renaming a token or
   logo is a major bump), merge to `main`.
2. Tag it: `git tag v1.1.0 && git push origin v1.1.0`, or on GitHub use
   **Releases → Draft a new release**, type the new tag `v1.1.0` and publish.
3. The `release` workflow builds the package and attaches the `.tgz` to the
   GitHub Release.
4. Update the URL in each app's `package.json`.
