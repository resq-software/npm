// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

import comments from "@eslint-community/eslint-plugin-eslint-comments/configs";
import eslint from "@eslint/js";
import vitest from "@vitest/eslint-plugin";
import jsdoc from "eslint-plugin-jsdoc";
import jsonc from "eslint-plugin-jsonc";
import markdown from "eslint-plugin-markdown";
import n from "eslint-plugin-n";
import packageJson from "eslint-plugin-package-json";
import perfectionist from "eslint-plugin-perfectionist";
import * as regexp from "eslint-plugin-regexp";
import yml from "eslint-plugin-yml";
import tseslint from "typescript-eslint";

export default tseslint.config(
	{
		ignores: ["**/*.snap", "coverage", "lib", "node_modules", "pnpm-lock.yaml"],
	},
	{ linterOptions: { reportUnusedDisableDirectives: "error" } },
	eslint.configs.recommended,
	comments.recommended,
	jsdoc.configs["flat/contents-typescript-error"],
	jsdoc.configs["flat/logical-typescript-error"],
	jsdoc.configs["flat/stylistic-typescript-error"],
	jsonc.configs["flat/recommended-with-json"],
	markdown.configs.recommended,
	n.configs["flat/recommended"],
	packageJson.configs.recommended,
	perfectionist.configs["recommended-natural"],
	regexp.configs["flat/recommended"],
	{
		extends: [
			tseslint.configs.strictTypeChecked,
			tseslint.configs.stylisticTypeChecked,
		],
		files: ["**/*.{js,jsx,ts,tsx}"],
		languageOptions: {
			parserOptions: {
				projectService: {
					allowDefaultProject: ["*.config.*s", ".storybook/*.ts"],
				},
			},
		},
		rules: {
			// Stylistic concerns that don't interfere with Prettier
			"logical-assignment-operators": [
				"error",
				"always",
				{ enforceForIfStatements: true },
			],
			// eslint-plugin-n uses Node module resolution which can't resolve
			// TypeScript source files (.tsx/.ts) or Storybook package aliases.
			// TypeScript's own compiler handles module resolution for these files.
			"n/no-missing-import": "off",
			"no-useless-rename": "error",
			"object-shorthand": "error",
			"operator-assignment": "error",
		},
		settings: {
			// Allow eslint-plugin-n to resolve TypeScript source files by extension.
			n: { tryExtensions: [".js", ".jsx", ".ts", ".tsx", ".json", ".node"] },
			perfectionist: { partitionByComment: true, type: "natural" },
			vitest: { typecheck: true },
		},
	},
	{
		extends: [tseslint.configs.disableTypeChecked],
		files: ["**/*.md/*.ts"],
		rules: { "n/no-missing-import": "off" },
	},
	{
		// Storybook config files run through allowDefaultProject — disable type-checked rules
		// that produce false positives without full project context.
		extends: [tseslint.configs.disableTypeChecked],
		files: [".storybook/*.ts"],
		rules: { "n/no-missing-import": "off" },
	},
	{
		// Stories files use Storybook/Vite bundler resolution, not Node resolution.
		// Type-safe rules produce false positives against Storybook's loosely-typed APIs.
		files: ["**/*.stories.*"],
		rules: {
			"@typescript-eslint/no-confusing-void-expression": "off",
			"@typescript-eslint/no-unsafe-argument": "off",
			"@typescript-eslint/no-unsafe-assignment": "off",
			"@typescript-eslint/no-unsafe-call": "off",
			"n/no-missing-import": "off",
		},
	},
	{
		// Shadcn-generated components wrap third-party libs (recharts, embla-carousel, cmdk)
		// that expose loosely-typed APIs. Disable unsafe-* rules rather than casting everything.
		files: [
			"src/components/carousel/carousel.tsx",
			"src/components/chart/chart.tsx",
			"src/components/combobox/combobox.tsx",
			"src/components/sidebar/sidebar.tsx",
		],
		rules: {
			"@typescript-eslint/consistent-indexed-object-style": "off",
			"@typescript-eslint/consistent-type-definitions": "off",
			"@typescript-eslint/no-non-null-assertion": "off",
			"@typescript-eslint/no-unnecessary-condition": "off",
			"@typescript-eslint/no-unnecessary-type-assertion": "off",
			"@typescript-eslint/no-unsafe-argument": "off",
			"@typescript-eslint/no-unsafe-assignment": "off",
			"@typescript-eslint/no-unsafe-call": "off",
			"@typescript-eslint/no-unsafe-member-access": "off",
			"@typescript-eslint/no-unused-expressions": "off",
			"@typescript-eslint/prefer-nullish-coalescing": "off",
			"@typescript-eslint/restrict-template-expressions": "off",
			"regexp/no-unused-capturing-group": "off",
			"regexp/prefer-w": "off",
			"regexp/use-ignore-case": "off",
		},
	},
	{
		extends: [vitest.configs.recommended],
		files: ["**/*.test.*"],
		rules: { "@typescript-eslint/no-unsafe-assignment": "off" },
	},
	{
		extends: [yml.configs["flat/standard"], yml.configs["flat/prettier"]],
		files: ["**/*.{yml,yaml}"],
		rules: {
			"yml/file-extension": ["error", { extension: "yml" }],
			"yml/sort-keys": [
				"error",
				{ order: { type: "asc" }, pathPattern: "^.*$" },
			],
			"yml/sort-sequence-values": [
				"error",
				{ order: { type: "asc" }, pathPattern: "^.*$" },
			],
		},
	},
	storybook.configs["flat/recommended"],
);
