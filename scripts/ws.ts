#!/usr/bin/env bun
/**
 * Workspace task runner — shorthand for common bun --filter commands.
 *
 * Usage:
 *   bun ws test              # test all packages
 *   bun ws test dsa          # test @resq-sw/dsa
 *   bun ws test dsa ui       # test dsa and ui
 *   bun ws build             # build all packages
 *   bun ws build helpers     # build @resq-sw/helpers
 *   bun ws dev               # start storybook
 *   bun ws lint              # lint all
 *   bun ws typecheck         # type-check all packages
 *   bun ws typecheck dsa     # type-check @resq-sw/dsa
 *   bun ws list              # list all packages
 */

import { $ } from "bun";
import { readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = import.meta.dirname
  ? join(import.meta.dirname, "..")
  : process.cwd();

const PACKAGES_DIR = join(ROOT, "packages");

const allPackages = readdirSync(PACKAGES_DIR).filter((d) =>
  existsSync(join(PACKAGES_DIR, d, "package.json")),
);

const ALIASES: Record<string, string> = {
  tc: "typecheck",
  t: "test",
  b: "build",
  l: "lint",
  d: "dev",
};

const [command, ...targets] = process.argv.slice(2);
const resolved = ALIASES[command] ?? command;

if (!resolved || resolved === "help") {
  console.log(`
  bun ws <command> [packages...]

  Commands:
    test, t          Run tests
    build, b         Build packages
    typecheck, tc    Type-check with tsc --noEmit
    lint, l          Lint with Biome
    dev, d           Start Storybook (UI)
    list             Show all packages

  Packages:
    ${allPackages.join(", ")}
    (omit to run on all)

  Examples:
    bun ws test dsa helpers
    bun ws build
    bun ws tc security
    bun ws dev
`);
  process.exit(0);
}

if (resolved === "list") {
  for (const pkg of allPackages) {
    const json = await Bun.file(
      join(PACKAGES_DIR, pkg, "package.json"),
    ).json();
    console.log(`  ${json.name.padEnd(25)} v${json.version}`);
  }
  process.exit(0);
}

if (resolved === "dev") {
  await $`bun --filter @resq-sw/ui storybook`.cwd(ROOT);
  process.exit(0);
}

const pkgs = targets.length > 0 ? targets : allPackages;

const scriptMap: Record<string, string> = {
  test: "test",
  build: "build",
  lint: "lint",
  typecheck: "tsc --noEmit",
};

const script = scriptMap[resolved];
if (!script) {
  console.error(`Unknown command: ${resolved}`);
  process.exit(1);
}

// Run sequentially for clean output
let failed = 0;
for (const pkg of pkgs) {
  const dir = join(PACKAGES_DIR, pkg);
  if (!existsSync(join(dir, "package.json"))) {
    console.error(`Package not found: ${pkg}`);
    failed++;
    continue;
  }

  const json = await Bun.file(join(dir, "package.json")).json();
  const name = json.name ?? pkg;

  if (resolved === "typecheck") {
    console.log(`\n▸ ${name} — tsc --noEmit`);
    const result = await $`bunx tsc --noEmit`.cwd(dir).nothrow().quiet();
    if (result.exitCode !== 0) {
      console.log(result.stderr.toString());
      failed++;
    } else {
      console.log(`  ✓ clean`);
    }
  } else {
    // Check if the package has the script
    if (!json.scripts?.[script]) {
      continue;
    }
    console.log(`\n▸ ${name} — ${script}`);
    const result = await $`bun run ${script}`.cwd(dir).nothrow();
    if (result.exitCode !== 0) failed++;
  }
}

if (failed > 0) {
  console.log(`\n✘ ${failed} package(s) failed`);
  process.exit(1);
}
console.log("\n✓ all clean");
