import { defineConfig } from "tsdown";

export default defineConfig({
	dts: true,
	entry: ["src/**/*.ts", "src/**/*.tsx", "!src/**/*.test.*", "!src/**/*.stories.*"],
	external: ["react", "react-dom", "tailwindcss"],
	outDir: "lib",
	platform: "browser",
	unbundle: true,
});
