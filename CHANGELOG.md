# Changelog

## [0.9.0](https://github.com/resq-software/ui/compare/0.8.3...0.9.0) (2026-03-25)

### Features

* **icons:** add icon gallery stories, MDX conventions page, and docs dark mode ([59cffcb](https://github.com/resq-software/ui/commit/59cffcb04d35eeea875bd739293d7d4defe72d53))

## [0.8.3](https://github.com/resq-software/ui/compare/0.8.2...0.8.3) (2026-03-22)

### Bug Fixes

* **css:** remove Google Fonts [@import](https://github.com/import) from globals.css ([dc3c047](https://github.com/resq-software/ui/commit/dc3c047b08b84904106d92c2856b432eb6b0001e))

## [0.8.2](https://github.com/resq-software/ui/compare/0.8.1...0.8.2) (2026-03-21)

### Bug Fixes

* **release:** resolve TOCTOU race condition in prepare-github-package ([6967fc2](https://github.com/resq-software/ui/commit/6967fc2ea8e57055e0dd2ef59f149fc764745245))

## [0.8.1](https://github.com/resq-software/ui/compare/0.8.0...0.8.1) (2026-03-21)

### Bug Fixes

* **ci:** pin actions to SHA hashes and add permissions ([f99ae32](https://github.com/resq-software/ui/commit/f99ae32891bbf0ba0bd4eb0f1a2b66d52894eb91))

## [0.8.0](https://github.com/resq-software/ui/compare/0.6.2...0.8.0) (2026-03-17)

### Features

* WCAG AA contrast compliance, performance guards, and design token overhaul ([33468a2](https://github.com/resq-software/ui/commit/33468a27507edb70f8a8b750f5a94f0f771fc3f7))

## [0.6.2](https://github.com/resq-software/ui/compare/0.6.1...0.6.2) (2026-03-15)

### Bug Fixes

* **ci:** harden UI release pipeline ([2b586b7](https://github.com/resq-software/ui/commit/2b586b74287a30357e95b29bd7a0c590eedb0b84))

## [0.6.1](https://github.com/resq-software/ui/compare/0.6.0...0.6.1) (2026-03-15)

### Bug Fixes

* **ci:** align release and chromatic config ([e8aeffb](https://github.com/resq-software/ui/commit/e8aeffbfe87ed4cf1bdfa15f420cfbc66cac212f))

## [0.6.0](https://github.com/resq-software/ui/compare/0.2.3...0.6.0) (2026-03-15)

### Features

* **theme:** apply ResQ brand guide across UI library ([9211fbe](https://github.com/resq-software/ui/commit/9211fbef945a249bd2ae789c2aad5b4f341b64fa))

### Bug Fixes

* **ci:** publish release artifact to GitHub Packages ([11bab47](https://github.com/resq-software/ui/commit/11bab47b6a460a75223d55fa28be373877797a26))
* **ci:** resolve lint failures ([1786c4e](https://github.com/resq-software/ui/commit/1786c4ec373d3f3705c39506cece72499387d64a))
* **ci:** stabilize release and chromatic workflows ([465fe94](https://github.com/resq-software/ui/commit/465fe9482c07779849757245a72b3816e8072187))
* **docs:** restore readme lint checks ([9e00736](https://github.com/resq-software/ui/commit/9e00736ad3ffae3825744c36eef6213f52ba05b6))

## [0.2.3](https://github.com/resq-software/ui/compare/0.2.1...0.2.3) (2026-03-15)

### Bug Fixes

* **ci:** align Dependabot and release-it ([a9ec193](https://github.com/resq-software/ui/commit/a9ec1937cd464c860be8a2e29556dc25259e9dc6))
* **ci:** grant contents:write to contributors workflow so it can commit ([5965b64](https://github.com/resq-software/ui/commit/5965b642fad149582e718f825857171b68d80407))
* **ci:** refresh bun lockfile ([3238a95](https://github.com/resq-software/ui/commit/3238a95bb5253007fa8e2c27da60419a60e6b8e5))
* **ci:** restore bun.lock, remove package-lock.json — bun install was failing to resolve storybook versions ([b548302](https://github.com/resq-software/ui/commit/b54830296e6be44d43bb558316f5ca9de81fe504))
* **ci:** restore docs addon and harden release ([a06e971](https://github.com/resq-software/ui/commit/a06e97158ec0f79ca4538411f324d05817048343))
* **ci:** skip copyright gen in CI, fix trailing comma in .all-contributorsrc ([e513065](https://github.com/resq-software/ui/commit/e513065e88d08732a4532f099251939bd80c9a0d))
* **ci:** sync release metadata and storybook pin ([2baac5d](https://github.com/resq-software/ui/commit/2baac5d339c6bfcc73d477fddcbf65955d704950))
* **storybook:** remove addon-essentials and addon-interactions ([4bf1c00](https://github.com/resq-software/ui/commit/4bf1c00f2c7fa1a8d275f457094558be74c1df0e))

## [0.2.1](https://github.com/resq-software/ui/compare/0.2.0...0.2.1) (2026-03-13)

### Bug Fixes

* **ci:** use chromaui/action@v15 — chromatic-com/action does not exist ([0d8a6be](https://github.com/resq-software/ui/commit/0d8a6be0accb21e1d7d4b581669d82f7466db69f))

## 0.2.0 (2026-03-13)

### Features

* add rich Storybook stories for all 55 components + tooling fixes ([f89b7ad](https://github.com/resq-software/ui/commit/f89b7ad5a2947008973ea1f61933f280b9325937))
* enhance Storybook setup with a11y, interactions, and story categories ([49901e9](https://github.com/resq-software/ui/commit/49901e9ca023723f0ab90cc3d88afbf3c1fda611))
* initialize @resq/ui — 55 shadcn components + Storybook ([5365c0a](https://github.com/resq-software/ui/commit/5365c0a4dd873158568158a9279263f476a7fa86))
* migrate to Biome, fix Storybook build, fix CI failures ([ef969eb](https://github.com/resq-software/ui/commit/ef969eb63f2e75cdb6ea58b7605253260eefd971))

### Bug Fixes

* **ci:** update chromatic action to v11 ([caa4504](https://github.com/resq-software/ui/commit/caa450472a565839155576e72ad05b1b0d687943))
* install @storybook/blocks as direct dep for MDX imports ([11d22cc](https://github.com/resq-software/ui/commit/11d22cca8c3160fa2093cc64ee3834256d8c8967))
* **release:** pass npm-token as explicit action input ([42fa366](https://github.com/resq-software/ui/commit/42fa366463a48fad10db19acc43f466d822937b8))
* rename package to @resq-sw/ui to match npm org scope ([15ef7b2](https://github.com/resq-software/ui/commit/15ef7b2463222ca078589cf8f3d09e233ee2e4ff))
* resolve failing CI — bun run build and cspell words ([afb17db](https://github.com/resq-software/ui/commit/afb17db022d83c5a69880c1c3baf5551c9eaf537))
* resolve Storybook 10 addon compatibility issues ([ac8f3c2](https://github.com/resq-software/ui/commit/ac8f3c2fdf8d42937fb55438f70f78119f291a3e))
* use correct @storybook/addon-docs/blocks import in MDX ([9fe4b34](https://github.com/resq-software/ui/commit/9fe4b347a18faa7663b52f0e2757db03141c2fb6))
