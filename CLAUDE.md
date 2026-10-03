# Brand Identity

Source of truth for the Kaptajn Kasper brand, published as the npm package
`@kaptajn-kasper/brand` (tarball attached to GitHub Releases). See README.md for
how apps consume it.

## Repository structure

- `brand-board.svg` — Inkscape design source for logos and palette (large; don't read it whole)
- `brand-assets/` — logos exported from the board by `scripts/export-logos.sh`; never hand-edit
- `tokens/*.json` — design tokens in W3C DTCG format (`$value`, `$type`); `color.light.*`/`color.dark.*` are M3 roles
- `scripts/build.mjs` — Style Dictionary build of `dist/` (CSS, SCSS, JS + d.ts, JSON, fonts, logos, icons)
- `.github/workflows/release.yml` — on tag `vX.Y.Z` (must equal package.json version), packs and creates the release

## Conventions

- CSS custom properties are prefixed `--kk-`; scheme roles drop the scheme (`--kk-color-primary`).
- JS token keys are camelCase; JSON/CSS/SCSS keep kebab-case.
- `dist/` is generated and gitignored. Exported names in `dist/logos` and token names are public API:
  renaming or removing one is a semver major.
- Fonts are self-hosted from `@fontsource-variable/figtree`; never reference Google Fonts.
- Scripts are bash with `set -euo pipefail` and must pass shellcheck.
