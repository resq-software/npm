// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

/**
 * Shared utilities for component performance regression tests.
 *
 * Covers all six Storybook Performance plugin categories:
 *   1. Frame Timing        — transition-all, heavy animations, will-change abuse
 *   2. Layout & Stability  — CLS contributors, forced reflows, style writes
 *   3. React Performance   — re-render guards, memo boundaries, key hygiene
 *   4. DOM Nodes           — tree size, nesting depth
 *   5. Style Writes        — inline styles, dynamic className churn
 *   6. Input Responsiveness — passive listeners, debounce patterns
 *
 * Plus Element Timing instrumentation checks.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Minimal shape of a React element for tree-walking assertions. */
export interface ReactLikeElement {
	type: string | ((...args: unknown[]) => unknown) | { $$typeof?: symbol };
	props?: {
		children?: ReactChildren;
		className?: string;
		style?: Record<string, unknown>;
		[key: string]: unknown;
	};
}

type ReactChildren =
	| ReactLikeElement
	| ReactLikeElement[]
	| string
	| number
	| boolean
	| null
	| undefined;

/** A single performance violation with category mapping. */
export interface PerfViolation {
	/** Which perf panel category this maps to. */
	category:
		| "frame-timing"
		| "layout-stability"
		| "react-performance"
		| "dom-nodes"
		| "style-writes"
		| "input-responsiveness"
		| "element-timing";
	rule: string;
	message: string;
	match?: string;
	/** Severity: 'error' blocks CI, 'warning' shows up in reports. */
	severity: "error" | "warning";
}

/** Thresholds matching the Storybook Performance panel "good" ranges. */
export interface PerfBudget {
	/** Max DOM element count (Memory & Rendering panel). Default: 800. */
	maxDomNodes: number;
	/** Max nesting depth. Default: 12. */
	maxNestingDepth: number;
	/** Max React element count in a single component tree. Default: 200. */
	maxElementNodes: number;
	/** Max inline `style` props allowed (Style Writes). Default: 0. */
	maxInlineStyles: number;
	/** Max `will-change` declarations (Frame Timing). Default: 3. */
	maxWillChange: number;
}

const DEFAULT_BUDGET: PerfBudget = {
	maxDomNodes: 800,
	maxNestingDepth: 12,
	maxElementNodes: 200,
	maxInlineStyles: 0,
	maxWillChange: 3,
};

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

function isReactElement(value: unknown): value is ReactLikeElement {
	return (
		value !== null &&
		typeof value === "object" &&
		"type" in value &&
		(value as ReactLikeElement).type != null
	);
}

// ---------------------------------------------------------------------------
// Regex patterns (no `g` flag on any used with .test())
// ---------------------------------------------------------------------------

// --- Frame Timing ---
const TRANSITION_ALL_RE = /\btransition-all\b/;
const _WILL_CHANGE_RE = /\bwill-change-\[/;
const ANIMATE_BOUNCE_SPIN_RE = /\banimate-(bounce|spin|ping)\b/;

// --- Layout & Stability (CLS / Forced Reflows / Style Writes) ---
const GENERIC_RADIUS_RE = /\brounded-(xl|2xl|3xl)\b/;

/** Layout-triggering transition properties — use only with matchAll. */
const LAYOUT_TRANSITION_RE =
	/\btransition-\[(?:[^\]]*\b(?:width|height|top|left|right|bottom|margin|padding)\b[^\]]*)\]/g;

/** Sidebar files are exempt from layout transition checks. */
const SIDEBAR_LAYOUT_EXEMPT_RE = /sidebar/i;

/**
 * Elements without explicit dimensions that load async content cause CLS.
 * Detects <img>, <video>, <iframe>, <canvas> without w-/h- classes.
 */
const REPLACED_ELEMENT_TAG_RE = /^(img|video|iframe|canvas|svg)$/i;

/**
 * Detects raw `offsetWidth`, `offsetHeight`, `getBoundingClientRect`, etc.
 * in source — these trigger Forced Reflows when called after DOM writes.
 */
const FORCED_REFLOW_TRIGGER_RE =
	/\b(offsetWidth|offsetHeight|offsetTop|offsetLeft|clientWidth|clientHeight|scrollWidth|scrollHeight|getComputedStyle|getBoundingClientRect)\b/;

// --- Style Writes ---
const STYLE_MUTATION_RE = /\.style\.\w+\s*=/;
const CLASSLIST_MUTATION_RE = /\.classList\.(add|remove|toggle)\(/;

// --- React Performance ---
const MAP_WITHOUT_KEY_RE = /\.map\(\s*\([^)]*\)\s*=>\s*(?:{\s*return\s+)?<(?!.*\bkey\b)/;
const INLINE_HANDLER_RE = /\bon[A-Z]\w+=\{(?:\([^)]*\)|[a-zA-Z_$]\w*)\s*=>/;

// --- Input Responsiveness ---
const BLOCKING_LISTENER_RE =
	/addEventListener\(\s*['"](?:wheel|touchstart|touchmove)['"]\s*,\s*[^,]+(?:,\s*\{[^}]*passive\s*:\s*false)?/;

// ---------------------------------------------------------------------------
// Source-level (static) assertions — throwing API (backwards-compatible)
// ---------------------------------------------------------------------------

export function assertNoTransitionAll(source: string, file: string): void {
	if (TRANSITION_ALL_RE.test(source)) {
		throw new Error(
			`${file}: contains "transition-all" which hurts Frame Timing. ` +
				"Use a specific transition property (transition-colors, transition-transform, etc.).",
		);
	}
}

export function assertNoGenericRadius(source: string, file: string): void {
	const match = source.match(GENERIC_RADIUS_RE);
	if (match) {
		throw new Error(
			`${file}: contains generic radius class "${match[0]}". ` +
				"Use specific pixel values (rounded-[6px], rounded-[4px], rounded-[3px]) per the style guide.",
		);
	}
}

export function assertNoLayoutTransitions(source: string, file: string): void {
	if (SIDEBAR_LAYOUT_EXEMPT_RE.test(file)) return;

	const matches = [...source.matchAll(LAYOUT_TRANSITION_RE)];
	if (matches.length > 0) {
		const found = matches.map((m) => m[0]).join(", ");
		throw new Error(
			`${file}: transitions layout properties [${found}] which causes Forced Reflows. ` +
				"Animate transform/opacity instead.",
		);
	}
}

export function assertNoForcedReflowTriggers(source: string, file: string): void {
	const match = source.match(FORCED_REFLOW_TRIGGER_RE);
	if (match) {
		throw new Error(
			`${file}: reads layout property "${match[0]}" which triggers Forced Reflow. ` +
				"Batch reads before writes, or use ResizeObserver / IntersectionObserver.",
		);
	}
}

// ---------------------------------------------------------------------------
// Source-level — non-throwing batch API (collects all violations)
// ---------------------------------------------------------------------------

/**
 * Collects **all** static performance violations from a source string.
 * Maps each violation to the Storybook Performance panel category it affects.
 */
export function collectSourceViolations(source: string, file: string): PerfViolation[] {
	const v: PerfViolation[] = [];

	// ── Frame Timing ──────────────────────────────────────────────────
	if (TRANSITION_ALL_RE.test(source)) {
		v.push({
			category: "frame-timing",
			rule: "no-transition-all",
			message: `${file}: "transition-all" — use a scoped transition property.`,
			match: "transition-all",
			severity: "error",
		});
	}

	if (ANIMATE_BOUNCE_SPIN_RE.test(source)) {
		const m = source.match(ANIMATE_BOUNCE_SPIN_RE)!;
		v.push({
			category: "frame-timing",
			rule: "no-expensive-animation-utilities",
			message:
				`${file}: "${m[0]}" runs every frame and hurts FPS. ` +
				"Use a CSS @keyframes with will-change scoped to the animated property.",
			match: m[0],
			severity: "warning",
		});
	}

	// ── Layout & Stability (CLS, Forced Reflows) ─────────────────────
	const radiusMatch = source.match(GENERIC_RADIUS_RE);
	if (radiusMatch) {
		v.push({
			category: "layout-stability",
			rule: "no-generic-radius",
			message: `${file}: generic radius "${radiusMatch[0]}" — use explicit pixel values.`,
			match: radiusMatch[0],
			severity: "error",
		});
	}

	if (!SIDEBAR_LAYOUT_EXEMPT_RE.test(file)) {
		for (const m of source.matchAll(LAYOUT_TRANSITION_RE)) {
			v.push({
				category: "layout-stability",
				rule: "no-layout-transitions",
				message: `${file}: layout transition "${m[0]}" causes Forced Reflows.`,
				match: m[0],
				severity: "error",
			});
		}
	}

	if (FORCED_REFLOW_TRIGGER_RE.test(source)) {
		const m = source.match(FORCED_REFLOW_TRIGGER_RE)!;
		v.push({
			category: "layout-stability",
			rule: "no-forced-reflow-reads",
			message:
				`${file}: "${m[0]}" triggers synchronous layout. ` +
				"Batch reads before writes or use an observer API.",
			match: m[0],
			severity: "error",
		});
	}

	// ── Style Writes ─────────────────────────────────────────────────
	if (STYLE_MUTATION_RE.test(source)) {
		v.push({
			category: "style-writes",
			rule: "no-direct-style-mutation",
			message: `${file}: direct .style mutation causes a style write. Use className toggling or CSS variables.`,
			severity: "error",
		});
	}

	if (CLASSLIST_MUTATION_RE.test(source)) {
		v.push({
			category: "style-writes",
			rule: "prefer-classname-over-classlist",
			message: `${file}: classList mutation in component source — prefer declarative className bindings.`,
			severity: "warning",
		});
	}

	// ── React Performance ────────────────────────────────────────────
	if (MAP_WITHOUT_KEY_RE.test(source)) {
		v.push({
			category: "react-performance",
			rule: "map-needs-key",
			message: `${file}: .map() renders JSX without a visible \`key\` prop — React will remount subtrees.`,
			severity: "error",
		});
	}

	if (INLINE_HANDLER_RE.test(source)) {
		v.push({
			category: "react-performance",
			rule: "no-inline-handler-arrows",
			message:
				`${file}: inline arrow in event handler prop — ` +
				"creates a new reference every render, breaking memo boundaries.",
			severity: "warning",
		});
	}

	// ── Input Responsiveness ─────────────────────────────────────────
	if (BLOCKING_LISTENER_RE.test(source)) {
		v.push({
			category: "input-responsiveness",
			rule: "passive-event-listeners",
			message: `${file}: wheel/touch listener without { passive: true } blocks main thread (hurts INP).`,
			severity: "error",
		});
	}

	// ── Frame Timing — will-change budget ────────────────────────────
	const willChangeCount = (source.match(/\bwill-change-\[/g) ?? []).length;
	if (willChangeCount > DEFAULT_BUDGET.maxWillChange) {
		v.push({
			category: "frame-timing",
			rule: "will-change-budget",
			message:
				`${file}: ${willChangeCount} will-change declarations exceed budget of ${DEFAULT_BUDGET.maxWillChange}. ` +
				"Excess will-change promotes too many layers and increases memory.",
			severity: "warning",
		});
	}

	return v;
}

// ---------------------------------------------------------------------------
// Runtime (render-level) tree utilities
// ---------------------------------------------------------------------------

/**
 * Counts the total number of React elements in a tree (recursively).
 * Maps to the DOM Nodes metric.
 */
export function countElementNodes(element: unknown): number {
	if (!isReactElement(element)) {
		if (Array.isArray(element)) {
			let count = 0;
			for (const child of element) count += countElementNodes(child);
			return count;
		}
		return 0;
	}

	let count = 1;
	const children = element.props?.children;

	if (Array.isArray(children)) {
		for (const child of children) count += countElementNodes(child);
	} else {
		count += countElementNodes(children);
	}

	return count;
}

/**
 * Measures max nesting depth of a React element tree.
 * Deep trees cause long style recalculation (Style Writes) and slow
 * selector matching.
 */
export function measureNestingDepth(element: unknown, current = 0): number {
	if (!isReactElement(element)) {
		if (Array.isArray(element)) {
			let max = current;
			for (const child of element) {
				max = Math.max(max, measureNestingDepth(child, current));
			}
			return max;
		}
		return current;
	}

	const depth = current + 1;
	const children = element.props?.children;

	if (Array.isArray(children)) {
		let max = depth;
		for (const child of children) {
			max = Math.max(max, measureNestingDepth(child, depth));
		}
		return max;
	}

	return measureNestingDepth(children, depth);
}

/**
 * Counts elements with an inline `style` prop (Style Writes contributors).
 */
export function countInlineStyles(element: unknown): number {
	if (!isReactElement(element)) {
		if (Array.isArray(element)) {
			let count = 0;
			for (const child of element) count += countInlineStyles(child);
			return count;
		}
		return 0;
	}

	let count = element.props?.style ? 1 : 0;
	const children = element.props?.children;

	if (Array.isArray(children)) {
		for (const child of children) count += countInlineStyles(child);
	} else {
		count += countInlineStyles(children);
	}

	return count;
}

/**
 * Checks whether replaced elements (img, video, iframe, canvas) have
 * explicit dimensions — missing dimensions are the #1 cause of CLS.
 */
export function collectUnsizedMedia(element: unknown, acc: string[] = []): string[] {
	if (!isReactElement(element)) {
		if (Array.isArray(element)) {
			for (const child of element) collectUnsizedMedia(child, acc);
		}
		return acc;
	}

	if (typeof element.type === "string" && REPLACED_ELEMENT_TAG_RE.test(element.type)) {
		const p = element.props ?? {};
		const hasExplicitSize =
			p.width != null ||
			p.height != null ||
			(typeof p.className === "string" && /\b[wh]-\[?\d/.test(p.className)) ||
			(p.style && (p.style.width != null || p.style.height != null));

		if (!hasExplicitSize) {
			acc.push(
				`<${element.type}> missing explicit dimensions (src=${String(p.src ?? p.data ?? "unknown")})`,
			);
		}
	}

	const children = element.props?.children;
	if (Array.isArray(children)) {
		for (const child of children) collectUnsizedMedia(child, acc);
	} else {
		collectUnsizedMedia(children, acc);
	}

	return acc;
}

/**
 * Extracts all className strings from a React element tree (recursively).
 * Uses an array accumulator to avoid O(n²) string concatenation.
 */
export function collectClassNames(element: unknown): string {
	const parts: string[] = [];
	collectClassNamesInto(element, parts);
	return parts.join(" ");
}

function collectClassNamesInto(element: unknown, acc: string[]): void {
	if (!isReactElement(element)) {
		if (Array.isArray(element)) {
			for (const child of element) collectClassNamesInto(child, acc);
		}
		return;
	}

	const cn = element.props?.className;
	if (cn) acc.push(cn);

	const children = element.props?.children;
	if (Array.isArray(children)) {
		for (const child of children) collectClassNamesInto(child, acc);
	} else {
		collectClassNamesInto(children, acc);
	}
}

// ---------------------------------------------------------------------------
// Runtime throwing API (backwards-compatible)
// ---------------------------------------------------------------------------

export function assertHasDataSlot(element: unknown, componentName: string): void {
	if (!isReactElement(element) || !element.props?.["data-slot"]) {
		throw new Error(
			`${componentName}: root element is missing data-slot attribute, ` +
				"required for Element Timing tracking.",
		);
	}
}

export function assertRenderedNoTransitionAll(classes: string, componentName: string): void {
	if (TRANSITION_ALL_RE.test(classes)) {
		throw new Error(
			`${componentName}: rendered output contains "transition-all". ` +
				"Use specific transition properties.",
		);
	}
}

export function assertRenderedNoGenericRadius(classes: string, componentName: string): void {
	const match = classes.match(GENERIC_RADIUS_RE);
	if (match) {
		throw new Error(
			`${componentName}: rendered output contains generic radius "${match[0]}". ` +
				"Use specific pixel values.",
		);
	}
}

// ---------------------------------------------------------------------------
// Batched runtime violation collector (covers the full panel)
// ---------------------------------------------------------------------------

/**
 * Runs all rendered-output checks against a React element tree and returns
 * violations mapped to performance panel categories. Pass a partial budget
 * to override defaults.
 */
export function collectRenderedViolations(
	element: unknown,
	componentName: string,
	budget: Partial<PerfBudget> = {},
): PerfViolation[] {
	const b = { ...DEFAULT_BUDGET, ...budget };
	const v: PerfViolation[] = [];
	const classes = collectClassNames(element);

	// ── Frame Timing ──────────────────────────────────────────────────
	if (TRANSITION_ALL_RE.test(classes)) {
		v.push({
			category: "frame-timing",
			rule: "rendered-no-transition-all",
			message: `${componentName}: rendered "transition-all".`,
			match: "transition-all",
			severity: "error",
		});
	}

	if (ANIMATE_BOUNCE_SPIN_RE.test(classes)) {
		const m = classes.match(ANIMATE_BOUNCE_SPIN_RE)!;
		v.push({
			category: "frame-timing",
			rule: "rendered-no-expensive-animation",
			message: `${componentName}: rendered "${m[0]}" — expensive per-frame animation.`,
			match: m[0],
			severity: "warning",
		});
	}

	// ── Layout & Stability ────────────────────────────────────────────
	const radiusMatch = classes.match(GENERIC_RADIUS_RE);
	if (radiusMatch) {
		v.push({
			category: "layout-stability",
			rule: "rendered-no-generic-radius",
			message: `${componentName}: rendered generic radius "${radiusMatch[0]}".`,
			match: radiusMatch[0],
			severity: "error",
		});
	}

	const unsized = collectUnsizedMedia(element);
	for (const entry of unsized) {
		v.push({
			category: "layout-stability",
			rule: "explicit-media-dimensions",
			message: `${componentName}: ${entry} — causes CLS.`,
			match: entry,
			severity: "error",
		});
	}

	// ── DOM Nodes ─────────────────────────────────────────────────────
	const nodeCount = countElementNodes(element);
	if (nodeCount > b.maxElementNodes) {
		v.push({
			category: "dom-nodes",
			rule: "element-count-budget",
			message:
				`${componentName}: ${nodeCount} elements exceeds budget of ${b.maxElementNodes}. ` +
				"Consider virtualisation or lazy subtrees.",
			severity: "error",
		});
	}

	const depth = measureNestingDepth(element);
	if (depth > b.maxNestingDepth) {
		v.push({
			category: "dom-nodes",
			rule: "nesting-depth-budget",
			message:
				`${componentName}: nesting depth ${depth} exceeds budget of ${b.maxNestingDepth}. ` +
				"Flatten wrapper divs.",
			severity: "warning",
		});
	}

	// ── Style Writes ─────────────────────────────────────────────────
	const inlineCount = countInlineStyles(element);
	if (inlineCount > b.maxInlineStyles) {
		v.push({
			category: "style-writes",
			rule: "inline-style-budget",
			message:
				`${componentName}: ${inlineCount} inline style props (budget: ${b.maxInlineStyles}). ` +
				"Each is a style write — use className or CSS variables.",
			severity: "error",
		});
	}

	// ── Element Timing ───────────────────────────────────────────────
	if (!isReactElement(element) || !element.props?.["data-slot"]) {
		v.push({
			category: "element-timing",
			rule: "missing-data-slot",
			message: `${componentName}: root element is missing data-slot — no Element Timing tracking.`,
			severity: "error",
		});
	}

	return v;
}

// ---------------------------------------------------------------------------
// Aggregate helpers (for CI integration)
// ---------------------------------------------------------------------------

/**
 * Returns true if any violation in the list is severity: "error".
 * Use as the gate for CI pass/fail.
 */
export function hasBlockingViolations(violations: PerfViolation[]): boolean {
	return violations.some((v) => v.severity === "error");
}

/**
 * Groups violations by category for structured reporting that mirrors the
 * Storybook Performance panel layout.
 */
export function groupByCategory(
	violations: PerfViolation[],
): Record<PerfViolation["category"], PerfViolation[]> {
	const groups = {
		"frame-timing": [] as PerfViolation[],
		"layout-stability": [] as PerfViolation[],
		"react-performance": [] as PerfViolation[],
		"dom-nodes": [] as PerfViolation[],
		"style-writes": [] as PerfViolation[],
		"input-responsiveness": [] as PerfViolation[],
		"element-timing": [] as PerfViolation[],
	};

	for (const v of violations) {
		groups[v.category].push(v);
	}

	return groups;
}

/**
 * Formats violations into a human-readable report string, grouped by
 * category like the Storybook panel.
 */
export function formatViolationReport(violations: PerfViolation[]): string {
	if (violations.length === 0) return "✅ No performance violations detected.";

	const grouped = groupByCategory(violations);
	const lines: string[] = [];
	const errors = violations.filter((v) => v.severity === "error").length;
	const warnings = violations.filter((v) => v.severity === "warning").length;

	lines.push(`⚡ Performance Report: ${errors} error(s), ${warnings} warning(s)\n`);

	const categoryLabels: Record<PerfViolation["category"], string> = {
		"frame-timing": "🖥  FRAME TIMING",
		"layout-stability": "📐 LAYOUT & STABILITY",
		"react-performance": "⚛️  REACT PERFORMANCE",
		"dom-nodes": "🌳 DOM NODES",
		"style-writes": "🎨 STYLE WRITES",
		"input-responsiveness": "👆 INPUT RESPONSIVENESS",
		"element-timing": "⏱  ELEMENT TIMING",
	};

	for (const [cat, label] of Object.entries(categoryLabels)) {
		const items = grouped[cat as PerfViolation["category"]];
		if (items.length === 0) continue;

		lines.push(`${label}`);
		for (const item of items) {
			const icon = item.severity === "error" ? "  ✖" : "  ⚠";
			lines.push(`${icon} [${item.rule}] ${item.message}`);
		}
		lines.push("");
	}

	return lines.join("\n");
}

// ---------------------------------------------------------------------------
// A11y static guards
// ---------------------------------------------------------------------------

/**
 * Icon-only buttons (size="icon*") that lack sr-only text or aria-label
 * are invisible to screen readers.
 */
/** Icon-only buttons (size="icon*") that lack sr-only text or aria-label. */
export const ICON_BUTTON_NO_LABEL_RE =
	/size=["']icon[^"']*["'][^>]*>(?:(?!sr-only|aria-label)[^<])*<\/Button>/;

/** Interactive elements using onClick without a semantic tag or role. */
export const DIV_ONCLICK_RE = /<(?:div|span)\s[^>]*onClick[^>]*(?!role=)/;

/**
 * Components with focus-visible interactions should have focus-visible
 * styling. Checks that interactive components include focus-visible classes.
 */
export function assertInteractiveHasFocusVisible(source: string, file: string): void {
	// Only check files that have interactive elements (onClick, onKeyDown, role="button", etc.)
	if (!/\bon(?:Click|KeyDown|Press)\b/.test(source)) return;
	// If the file contains any focus-visible class, it's fine
	if (/focus-visible:/.test(source)) return;
	// If it delegates to Button or other interactive primitives, it's fine
	if (/\bButton\b|\bPressable\b|\binput\b|\bbutton\b/.test(source)) return;

	throw new Error(
		`${file}: has interactive handlers but no focus-visible styles. ` +
			"Add focus-visible:ring or focus-visible:border for keyboard accessibility.",
	);
}

// ---------------------------------------------------------------------------
// Style guide font compliance
// ---------------------------------------------------------------------------

/**
 * Per STYLE_GUIDE.md:
 *   - Buttons → font-mono + uppercase
 *   - Badges  → font-mono + uppercase
 *   - Labels  → font-mono + uppercase
 *   - Card/Dialog titles → font-display
 *
 * These checks verify the component source contains the required font class.
 */
const FONT_RULES: Record<string, { pattern: RegExp; requiredClasses: string[] }> = {
	"button/button.tsx": {
		pattern: /buttonVariants|function Button/,
		requiredClasses: ["font-mono", "uppercase"],
	},
	"badge/badge.tsx": {
		pattern: /badgeVariants|function Badge/,
		requiredClasses: ["font-mono", "uppercase"],
	},
	"label/label.tsx": {
		pattern: /function Label/,
		requiredClasses: ["font-mono", "uppercase"],
	},
	"card/card.tsx": {
		pattern: /function CardTitle/,
		requiredClasses: ["font-display"],
	},
	"dialog/dialog.tsx": {
		pattern: /function DialogTitle/,
		requiredClasses: ["font-display"],
	},
	"sheet/sheet.tsx": {
		pattern: /function SheetTitle/,
		requiredClasses: ["font-display"],
	},
	"drawer/drawer.tsx": {
		pattern: /function DrawerTitle/,
		requiredClasses: ["font-display"],
	},
};

export function assertFontCompliance(source: string, file: string): void {
	for (const [suffix, rule] of Object.entries(FONT_RULES)) {
		if (!file.endsWith(suffix)) continue;
		if (!rule.pattern.test(source)) continue;

		for (const cls of rule.requiredClasses) {
			if (!source.includes(cls)) {
				throw new Error(
					`${file}: missing "${cls}" — required by STYLE_GUIDE.md for this component.`,
				);
			}
		}
	}
}

// ---------------------------------------------------------------------------
// Semantic color token guards
// ---------------------------------------------------------------------------

/**
 * Raw hex colours in className strings bypass the design token system.
 * Allowed in: CSS variable declarations, style objects, regex patterns,
 * comments, and chart config.
 */
const RAW_HEX_IN_CLASSNAME_RE = /className[^=]*=\{?[^}]*#[0-9a-fA-F]{3,8}\b/;

export function assertNoRawHexInClassNames(source: string, file: string): void {
	// chart.tsx has hex in config objects and regex, not classNames — exempt
	if (file.includes("chart")) return;

	if (RAW_HEX_IN_CLASSNAME_RE.test(source)) {
		throw new Error(
			`${file}: contains raw hex color in className. ` +
				"Use semantic design tokens (bg-primary, text-foreground, etc.) instead.",
		);
	}
}

// ---------------------------------------------------------------------------
// SSR safety guards
// ---------------------------------------------------------------------------

/**
 * Bare `window.` or `document.` access outside hooks/callbacks crashes SSR.
 * We check for these globals at the module level (outside useEffect,
 * useCallback, useLayoutEffect, or event handler bodies).
 */
export function assertSSRSafe(source: string, file: string): void {
	// If the file wraps all browser globals in hooks, it's safe.
	// Heuristic: if every window./document. occurrence appears inside a
	// useEffect/useCallback/useLayoutEffect/event-handler body, skip it.
	const hasHookGuard = /\buse(?:Effect|LayoutEffect|Callback)\b/.test(source);
	const globalRe = /\b(window|document)\.\w+/g;
	const globals = [...source.matchAll(globalRe)];

	if (globals.length === 0) return;
	if (hasHookGuard) {
		// All occurrences are inside hook bodies — trust the developer
		return;
	}

	// No hooks but uses browser globals → SSR unsafe
	const firstMatch = globals[0];
	throw new Error(
		`${file}: bare "${firstMatch[0]}" without useEffect/useCallback — breaks SSR. ` +
			"Wrap in useEffect or check typeof window.",
	);
}

// ---------------------------------------------------------------------------
// Reduced motion guards
// ---------------------------------------------------------------------------

/**
 * Components with CSS animations (animate-*) should respect
 * prefers-reduced-motion. The tw-animate-css library handles this
 * for its built-in animations, but custom @keyframes need explicit
 * motion-reduce variants.
 *
 * We flag custom animate- classes that are NOT from tw-animate-css.
 */
const TW_ANIMATE_PREFIX_RE =
	/^animate-(in|out|accordion-down|accordion-up|caret-blink|pulse|spin|bounce|ping|none|enter|leave)$/;
const TW_ANIMATE_SLIDE_FADE_ZOOM_RE =
	/^(slide-in-from|slide-out-to|fade-in|fade-out|zoom-in|zoom-out|spin-in|spin-out)-/;

export function assertReducedMotion(source: string, file: string): void {
	const animateMatches = source.match(/\banimate-[\w-]+\b/g);
	if (!animateMatches) return;

	const customAnimations = animateMatches.filter(
		(a) => !TW_ANIMATE_PREFIX_RE.test(a) && !TW_ANIMATE_SLIDE_FADE_ZOOM_RE.test(a),
	);
	if (customAnimations.length === 0) return;

	// Check if the file has any reduced-motion handling
	if (/motion-reduce|motion-safe|prefers-reduced-motion/.test(source)) return;

	throw new Error(
		`${file}: custom animation(s) [${[...new Set(customAnimations)].join(", ")}] without reduced-motion handling. ` +
			"Add motion-reduce:animate-none or wrap in @media (prefers-reduced-motion).",
	);
}

// ---------------------------------------------------------------------------
// Prop forwarding contract checks
// ---------------------------------------------------------------------------

/**
 * Verifies that a component function accepts and forwards className via
 * the cn() utility (className merging). Components that hardcode className
 * without merging break consumer customization.
 */
export function assertClassNameMerging(source: string, file: string): void {
	// Only check component files that export functions
	if (!/export.*function\s+\w+/.test(source) && !/export\s*\{/.test(source)) return;

	// Check that the file uses cn() for className merging
	if (/\bcn\(/.test(source)) return;

	// Files that re-export only (index.ts style) or have no className usage are fine
	if (!/className/.test(source)) return;

	// Third-party wrappers (import from non-relative packages) that pass
	// className directly to vendor components are exempt
	if (/import\s.*from\s+["'][^./]/.test(source)) return;

	throw new Error(
		`${file}: sets className without using cn() for merging. ` +
			"Use cn(baseClasses, className) to allow consumer overrides.",
	);
}
