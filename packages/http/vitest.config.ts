import { defineConfig } from "vitest/config";

let hasEffectHttp = false;
try {
  await import("effect/unstable/http");
  hasEffectHttp = true;
} catch {}

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    exclude: hasEffectHttp ? [] : ["tests/fetcher.test.ts"],
  },
});
