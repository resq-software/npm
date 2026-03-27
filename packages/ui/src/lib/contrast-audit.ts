// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

/**
 * Multi-Format WCAG Contrast Ratio Checker
 *
 * Supports: hex, rgb(), hsl(), oklch(), oklab(), lab(), lch(), CSS named colors.
 * Used by contrast-audit.test.ts to ensure all token pairs stay compliant.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface LinearRGB {
	r: number; // 0–1, linear (not gamma-encoded)
	g: number;
	b: number;
}

export type ColorTokens = Record<string, string>;

export interface ContrastPair {
	fg: string;
	bg: string;
	minRatio: number;
	label: string;
}

export interface ContrastResult {
	fg: string;
	bg: string;
	fgRaw: string;
	bgRaw: string;
	ratio: number;
	required: number;
	label: string;
	pass: boolean;
}

export interface ThemeAudit {
	mode: string;
	results: ContrastResult[];
	allPass: boolean;
}

// ─── CSS Named Colors (full CSS Level 4 set) ───────────────────────────────

const NAMED_COLORS: Record<string, string> = {
	aliceblue: "#f0f8ff",
	antiquewhite: "#faebd7",
	aqua: "#00ffff",
	aquamarine: "#7fffd4",
	azure: "#f0ffff",
	beige: "#f5f5dc",
	bisque: "#ffe4c4",
	black: "#000000",
	blanchedalmond: "#ffebcd",
	blue: "#0000ff",
	blueviolet: "#8a2be2",
	brown: "#a52a2a",
	burlywood: "#deb887",
	cadetblue: "#5f9ea0",
	chartreuse: "#7fff00",
	chocolate: "#d2691e",
	coral: "#ff7f50",
	cornflowerblue: "#6495ed",
	cornsilk: "#fff8dc",
	crimson: "#dc143c",
	cyan: "#00ffff",
	darkblue: "#00008b",
	darkcyan: "#008b8b",
	darkgoldenrod: "#b8860b",
	darkgray: "#a9a9a9",
	darkgreen: "#006400",
	darkgrey: "#a9a9a9",
	darkkhaki: "#bdb76b",
	darkmagenta: "#8b008b",
	darkolivegreen: "#556b2f",
	darkorange: "#ff8c00",
	darkorchid: "#9932cc",
	darkred: "#8b0000",
	darksalmon: "#e9967a",
	darkseagreen: "#8fbc8f",
	darkslateblue: "#483d8b",
	darkslategray: "#2f4f4f",
	darkslategrey: "#2f4f4f",
	darkturquoise: "#00ced1",
	darkviolet: "#9400d3",
	deeppink: "#ff1493",
	deepskyblue: "#00bfff",
	dimgray: "#696969",
	dimgrey: "#696969",
	dodgerblue: "#1e90ff",
	firebrick: "#b22222",
	floralwhite: "#fffaf0",
	forestgreen: "#228b22",
	fuchsia: "#ff00ff",
	gainsboro: "#dcdcdc",
	ghostwhite: "#f8f8ff",
	gold: "#ffd700",
	goldenrod: "#daa520",
	gray: "#808080",
	green: "#008000",
	greenyellow: "#adff2f",
	grey: "#808080",
	honeydew: "#f0fff0",
	hotpink: "#ff69b4",
	indianred: "#cd5c5c",
	indigo: "#4b0082",
	ivory: "#fffff0",
	khaki: "#f0e68c",
	lavender: "#e6e6fa",
	lavenderblush: "#fff0f5",
	lawngreen: "#7cfc00",
	lemonchiffon: "#fffacd",
	lightblue: "#add8e6",
	lightcoral: "#f08080",
	lightcyan: "#e0ffff",
	lightgoldenrodyellow: "#fafad2",
	lightgray: "#d3d3d3",
	lightgreen: "#90ee90",
	lightgrey: "#d3d3d3",
	lightpink: "#ffb6c1",
	lightsalmon: "#ffa07a",
	lightseagreen: "#20b2aa",
	lightskyblue: "#87cefa",
	lightslategray: "#778899",
	lightslategrey: "#778899",
	lightsteelblue: "#b0c4de",
	lightyellow: "#ffffe0",
	lime: "#00ff00",
	limegreen: "#32cd32",
	linen: "#faf0e6",
	magenta: "#ff00ff",
	maroon: "#800000",
	mediumaquamarine: "#66cdaa",
	mediumblue: "#0000cd",
	mediumorchid: "#ba55d3",
	mediumpurple: "#9370db",
	mediumseagreen: "#3cb371",
	mediumslateblue: "#7b68ee",
	mediumspringgreen: "#00fa9a",
	mediumturquoise: "#48d1cc",
	mediumvioletred: "#c71585",
	midnightblue: "#191970",
	mintcream: "#f5fffa",
	mistyrose: "#ffe4e1",
	moccasin: "#ffe4b5",
	navajowhite: "#ffdead",
	navy: "#000080",
	oldlace: "#fdf5e6",
	olive: "#808000",
	olivedrab: "#6b8e23",
	orange: "#ffa500",
	orangered: "#ff4500",
	orchid: "#da70d6",
	palegoldenrod: "#eee8aa",
	palegreen: "#98fb98",
	paleturquoise: "#afeeee",
	palevioletred: "#db7093",
	papayawhip: "#ffefd5",
	peachpuff: "#ffdab9",
	peru: "#cd853f",
	pink: "#ffc0cb",
	plum: "#dda0dd",
	powderblue: "#b0e0e6",
	purple: "#800080",
	rebeccapurple: "#663399",
	red: "#ff0000",
	rosybrown: "#bc8f8f",
	royalblue: "#4169e1",
	saddlebrown: "#8b4513",
	salmon: "#fa8072",
	sandybrown: "#f4a460",
	seagreen: "#2e8b57",
	seashell: "#fff5ee",
	sienna: "#a0522d",
	silver: "#c0c0c0",
	skyblue: "#87ceeb",
	slateblue: "#6a5acd",
	slategray: "#708090",
	slategrey: "#708090",
	snow: "#fffafa",
	springgreen: "#00ff7f",
	steelblue: "#4682b4",
	tan: "#d2b48c",
	teal: "#008080",
	thistle: "#d8bfd8",
	tomato: "#ff6347",
	turquoise: "#40e0d0",
	violet: "#ee82ee",
	wheat: "#f5deb3",
	white: "#ffffff",
	whitesmoke: "#f5f5f5",
	yellow: "#ffff00",
	yellowgreen: "#9acd32",
};

// ─── Parsers ────────────────────────────────────────────────────────────────

/** sRGB gamma decode: normalized [0,1] channel -> linear [0,1]. */
function srgbChannelToLinear(s: number): number {
	return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function parseHex(raw: string): LinearRGB | null {
	const m = raw.match(/^#?([0-9a-f]{3,8})$/i);
	if (!m) return null;
	let hex = m[1];

	// Expand shorthand: #RGB -> #RRGGBB, #RGBA -> #RRGGBBAA
	if (hex.length === 3 || hex.length === 4) {
		hex = [...hex].map((c) => c + c).join("");
	}
	if (hex.length < 6) return null;

	return {
		r: srgbChannelToLinear(Number.parseInt(hex.slice(0, 2), 16) / 255),
		g: srgbChannelToLinear(Number.parseInt(hex.slice(2, 4), 16) / 255),
		b: srgbChannelToLinear(Number.parseInt(hex.slice(4, 6), 16) / 255),
	};
}

function parseRgb(raw: string): LinearRGB | null {
	const m = raw.match(
		/rgba?\(\s*([\d.]+%?)[,\s]+([\d.]+%?)[,\s]+([\d.]+%?)(?:[,/\s]+([\d.]+%?))?\s*\)/,
	);
	if (!m) return null;

	const toNorm = (v: string): number =>
		v.endsWith("%") ? Number.parseFloat(v) / 100 : Number.parseFloat(v) / 255;

	return {
		r: srgbChannelToLinear(Math.min(1, toNorm(m[1]))),
		g: srgbChannelToLinear(Math.min(1, toNorm(m[2]))),
		b: srgbChannelToLinear(Math.min(1, toNorm(m[3]))),
	};
}

function parseHsl(raw: string): LinearRGB | null {
	const m = raw.match(
		/hsla?\(\s*([\d.]+)\s*[,\s]\s*([\d.]+)%\s*[,\s]\s*([\d.]+)%(?:\s*[,/]\s*[\d.]+%?)?\s*\)/,
	);
	if (!m) return null;

	const h = (((Number.parseFloat(m[1]) % 360) + 360) % 360) / 360;
	const s = Number.parseFloat(m[2]) / 100;
	const l = Number.parseFloat(m[3]) / 100;

	const hue2rgb = (p: number, q: number, t: number) => {
		if (t < 0) t += 1;
		if (t > 1) t -= 1;
		if (t < 1 / 6) return p + (q - p) * 6 * t;
		if (t < 1 / 2) return q;
		if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
		return p;
	};

	let rs: number;
	let gs: number;
	let bs: number;
	if (s === 0) {
		rs = gs = bs = l;
	} else {
		const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
		const p = 2 * l - q;
		rs = hue2rgb(p, q, h + 1 / 3);
		gs = hue2rgb(p, q, h);
		bs = hue2rgb(p, q, h - 1 / 3);
	}

	return {
		r: srgbChannelToLinear(rs),
		g: srgbChannelToLinear(gs),
		b: srgbChannelToLinear(bs),
	};
}

// ─── OKLab family ───────────────────────────────────────────────────────────

function oklabToLinear(lNorm: number, a: number, b: number): LinearRGB {
	const l_ = lNorm + 0.3963377774 * a + 0.2158037573 * b;
	const m_ = lNorm - 0.1055613458 * a - 0.0638541728 * b;
	const s_ = lNorm - 0.0894841775 * a - 1.291485548 * b;

	const l = l_ ** 3;
	const m = m_ ** 3;
	const s = s_ ** 3;

	const clamp = (v: number) => Math.max(0, Math.min(1, v));
	return {
		r: clamp(+4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
		g: clamp(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
		b: clamp(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
	};
}

function parseOklch(raw: string): LinearRGB | null {
	const m = raw.match(/oklch\(([\d.]+)%\s+([\d.]+)\s+([\d.]+)\)/);
	if (!m) return null;
	const hRad = (Number.parseFloat(m[3]) * Math.PI) / 180;
	return oklabToLinear(
		Number.parseFloat(m[1]) / 100,
		Number.parseFloat(m[2]) * Math.cos(hRad),
		Number.parseFloat(m[2]) * Math.sin(hRad),
	);
}

function parseOklab(raw: string): LinearRGB | null {
	const m = raw.match(/oklab\(([\d.]+)%\s+(-?[\d.]+)\s+(-?[\d.]+)\)/);
	if (!m) return null;
	return oklabToLinear(
		Number.parseFloat(m[1]) / 100,
		Number.parseFloat(m[2]),
		Number.parseFloat(m[3]),
	);
}

// ─── CIE Lab family ─────────────────────────────────────────────────────────

function cieLabToLinear(L: number, a: number, bVal: number): LinearRGB {
	const fy = (L + 16) / 116;
	const fx = a / 500 + fy;
	const fz = fy - bVal / 200;

	const delta = 6 / 29;
	const inv = (t: number) => (t > delta ? t ** 3 : 3 * delta * delta * (t - 4 / 29));

	// D50 white point
	const xD50 = 0.9642 * inv(fx);
	const yD50 = 1 * inv(fy);
	const zD50 = 0.8249 * inv(fz);

	// Bradford D50 -> D65
	const x = 0.9555766 * xD50 - 0.0230393 * yD50 + 0.0631636 * zD50;
	const y = -0.0282895 * xD50 + 1.0099416 * yD50 + 0.0210077 * zD50;
	const z = 0.0122982 * xD50 - 0.020483 * yD50 + 1.3299098 * zD50;

	// XYZ D65 -> linear sRGB
	const clamp = (v: number) => Math.max(0, Math.min(1, v));
	return {
		r: clamp(3.2404542 * x - 1.5371385 * y - 0.4985314 * z),
		g: clamp(-0.969266 * x + 1.8760108 * y + 0.041556 * z),
		b: clamp(0.0556434 * x - 0.2040259 * y + 1.0572252 * z),
	};
}

function parseLab(raw: string): LinearRGB | null {
	const m = /lab\(([\d.]+)%\s+(-?[\d.]+)\s+(-?[\d.]+)\)/.exec(raw);
	if (!m) return null;
	return cieLabToLinear(Number.parseFloat(m[1]), Number.parseFloat(m[2]), Number.parseFloat(m[3]));
}

function parseLch(raw: string): LinearRGB | null {
	const m = /lch\(([\d.]+)%\s+([\d.]+)\s+([\d.]+)\)/.exec(raw);
	if (!m) return null;
	const hRad = (Number.parseFloat(m[3]) * Math.PI) / 180;
	return cieLabToLinear(
		Number.parseFloat(m[1]),
		Number.parseFloat(m[2]) * Math.cos(hRad),
		Number.parseFloat(m[2]) * Math.sin(hRad),
	);
}

// ─── Unified Parser ─────────────────────────────────────────────────────────

type ParserFn = (raw: string) => LinearRGB | null;

const PARSERS: { test: RegExp; parse: ParserFn }[] = [
	{ test: /^oklch\(/, parse: parseOklch },
	{ test: /^oklab\(/, parse: parseOklab },
	{ test: /^lab\(/, parse: parseLab },
	{ test: /^lch\(/, parse: parseLch },
	{ test: /^hsla?\(/, parse: parseHsl },
	{ test: /^rgba?\(/, parse: parseRgb },
	{ test: /^#/, parse: parseHex },
];

export function toLinearRGB(raw: string): LinearRGB {
	const trimmed = raw.trim().toLowerCase();

	// Named color -> hex -> linear
	if (NAMED_COLORS[trimmed]) {
		const result = parseHex(NAMED_COLORS[trimmed]);
		if (result) return result;
	}

	for (const { test, parse } of PARSERS) {
		if (test.test(trimmed)) {
			const result = parse(trimmed);
			if (result) return result;
		}
	}

	// Bare hex (no #)
	if (/^[0-9a-f]{3,8}$/i.test(trimmed)) {
		const result = parseHex(trimmed);
		if (result) return result;
	}

	throw new Error(`Unsupported color format: "${raw}"`);
}

// ─── Contrast Math ──────────────────────────────────────────────────────────

/** Relative luminance per WCAG 2.x (linear sRGB weights). */
export function relativeLuminance({ r, g, b }: LinearRGB): number {
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two luminance values. */
export function contrastRatio(lum1: number, lum2: number): number {
	const lighter = Math.max(lum1, lum2);
	const darker = Math.min(lum1, lum2);
	return (lighter + 0.05) / (darker + 0.05);
}

// ─── Audit Engine ───────────────────────────────────────────────────────────

export function auditTheme(mode: string, tokens: ColorTokens, pairs: ContrastPair[]): ThemeAudit {
	const lumCache = new Map<string, number>();

	const getLum = (key: string): number | null => {
		if (lumCache.has(key)) return lumCache.get(key)!;
		const raw = tokens[key];
		if (!raw) return null;
		const lum = relativeLuminance(toLinearRGB(raw));
		lumCache.set(key, lum);
		return lum;
	};

	let allPass = true;
	const results: ContrastResult[] = [];

	for (const { fg, bg, minRatio, label } of pairs) {
		const fgLum = getLum(fg);
		const bgLum = getLum(bg);
		if (fgLum === null || bgLum === null) continue;

		const ratio = contrastRatio(fgLum, bgLum);
		const pass = ratio >= minRatio;
		if (!pass) allPass = false;

		results.push({
			fg,
			bg,
			fgRaw: tokens[fg],
			bgRaw: tokens[bg],
			ratio,
			required: minRatio,
			label,
			pass,
		});
	}

	return { mode, results, allPass };
}

export function formatAudit(audit: ThemeAudit): string {
	const lines: string[] = [`${audit.mode} MODE:`];
	for (const r of audit.results) {
		const status = r.pass ? "PASS" : "FAIL";
		lines.push(`  ${status} ${r.ratio.toFixed(2)}:1 (min ${r.required}) | ${r.fg} on ${r.bg}`);
	}
	return lines.join("\n");
}

// ─── Default WCAG Pair Definitions ──────────────────────────────────────────
// Text pairs -> Number.parseFloat("4.5"):1, UI elements -> 3:1, large text -> 3:1

export const DEFAULT_PAIRS: ContrastPair[] = [
	// Foreground text on surfaces
	{ fg: "foreground", bg: "background", minRatio: Number.parseFloat("4.5"), label: "text" },
	{ fg: "foreground", bg: "surface", minRatio: Number.parseFloat("4.5"), label: "text" },
	{ fg: "foreground", bg: "card", minRatio: Number.parseFloat("4.5"), label: "text" },
	{ fg: "card-foreground", bg: "card", minRatio: Number.parseFloat("4.5"), label: "text" },
	// Muted / hint / mono
	{ fg: "muted-foreground", bg: "background", minRatio: Number.parseFloat("4.5"), label: "text" },
	{ fg: "muted-foreground", bg: "surface", minRatio: Number.parseFloat("4.5"), label: "text" },
	{ fg: "muted-foreground", bg: "card", minRatio: Number.parseFloat("4.5"), label: "text" },
	{ fg: "hint", bg: "background", minRatio: Number.parseFloat("4.5"), label: "text" },
	{ fg: "hint", bg: "surface", minRatio: Number.parseFloat("4.5"), label: "text" },
	{ fg: "hint", bg: "card", minRatio: Number.parseFloat("4.5"), label: "text" },
	{ fg: "mono", bg: "background", minRatio: Number.parseFloat("4.5"), label: "text" },
	{ fg: "mono", bg: "surface", minRatio: Number.parseFloat("4.5"), label: "text" },
	{ fg: "mono", bg: "card", minRatio: Number.parseFloat("4.5"), label: "text" },
	{ fg: "accent-foreground", bg: "accent", minRatio: Number.parseFloat("4.5"), label: "text" },
	// Accent / status colors as UI elements (3:1)
	{ fg: "primary", bg: "background", minRatio: Number.parseFloat("3.0"), label: "UI" },
	{ fg: "primary", bg: "surface", minRatio: Number.parseFloat("3.0"), label: "UI" },
	{ fg: "primary", bg: "card", minRatio: Number.parseFloat("3.0"), label: "UI" },
	{ fg: "info", bg: "background", minRatio: Number.parseFloat("3.0"), label: "UI" },
	{ fg: "info", bg: "surface", minRatio: Number.parseFloat("3.0"), label: "UI" },
	{ fg: "success", bg: "background", minRatio: Number.parseFloat("3.0"), label: "UI" },
	{ fg: "success", bg: "surface", minRatio: Number.parseFloat("3.0"), label: "UI" },
	{ fg: "warning", bg: "background", minRatio: Number.parseFloat("3.0"), label: "UI" },
	{ fg: "warning", bg: "surface", minRatio: Number.parseFloat("3.0"), label: "UI" },
	// Text on primary/destructive backgrounds (buttons use small text — 4.5:1)
	{
		fg: "primary-foreground",
		bg: "primary",
		minRatio: Number.parseFloat("4.5"),
		label: "text",
	},
	{
		fg: "destructive-foreground",
		bg: "destructive",
		minRatio: Number.parseFloat("4.5"),
		label: "text",
	},
	// Accent text tokens on dark surfaces (outline/destructive/link buttons — 4.5:1)
	{ fg: "primary-text", bg: "background", minRatio: Number.parseFloat("4.5"), label: "text" },
	{ fg: "primary-text", bg: "surface", minRatio: Number.parseFloat("4.5"), label: "text" },
	{ fg: "primary-text", bg: "card", minRatio: Number.parseFloat("4.5"), label: "text" },
	{ fg: "destructive-text", bg: "background", minRatio: Number.parseFloat("4.5"), label: "text" },
	{ fg: "destructive-text", bg: "surface", minRatio: Number.parseFloat("4.5"), label: "text" },
	{ fg: "destructive-text", bg: "card", minRatio: Number.parseFloat("4.5"), label: "text" },
	// Info/success/warning text tokens (badges, status text — 4.5:1)
	{ fg: "info-text", bg: "background", minRatio: Number.parseFloat("4.5"), label: "text" },
	{ fg: "info-text", bg: "surface", minRatio: Number.parseFloat("4.5"), label: "text" },
	{ fg: "info-text", bg: "card", minRatio: Number.parseFloat("4.5"), label: "text" },
	{ fg: "success-text", bg: "background", minRatio: Number.parseFloat("4.5"), label: "text" },
	{ fg: "success-text", bg: "surface", minRatio: Number.parseFloat("4.5"), label: "text" },
	{ fg: "success-text", bg: "card", minRatio: Number.parseFloat("4.5"), label: "text" },
	{ fg: "warning-text", bg: "background", minRatio: Number.parseFloat("4.5"), label: "text" },
	{ fg: "warning-text", bg: "surface", minRatio: Number.parseFloat("4.5"), label: "text" },
	{ fg: "warning-text", bg: "card", minRatio: Number.parseFloat("4.5"), label: "text" },
];

// ─── CSS Parser ─────────────────────────────────────────────────────────────

/**
 * Extracts color tokens from a CSS string containing :root and .light blocks.
 * Supports any color format (oklch, hex, rgb, hsl, named, etc.).
 * Returns { dark: {...}, light: {...} } with token names as keys.
 */
export function extractTokensFromCSS(css: string): Record<string, ColorTokens> {
	const themes: Record<string, ColorTokens> = {};

	// Match :root { ... } block (dark theme)
	const rootMatch = /:root\s*\{([^}]+)\}/.exec(css);
	if (rootMatch) {
		themes.dark = parseTokenBlock(rootMatch[1]);
	}

	// Match .light { ... } block
	const lightMatch = /\.light\s*\{([^}]+)\}/.exec(css);
	if (lightMatch) {
		themes.light = parseTokenBlock(lightMatch[1]);
	}

	return themes;
}

function parseTokenBlock(block: string): ColorTokens {
	const tokens: ColorTokens = {};
	// Match any CSS color value after a custom property
	const re =
		/--([\w-]+)\s*:\s*(oklch\([^)]+\)|oklab\([^)]+\)|lab\([^)]+\)|lch\([^)]+\)|hsla?\([^)]+\)|rgba?\([^)]+\)|#[0-9a-fA-F]{3,8}\b)/g;
	for (const m of block.matchAll(re)) {
		tokens[m[1]] = m[2];
	}
	return tokens;
}

// ─── Full Audit Runner ──────────────────────────────────────────────────────

export function runContrastAudit(
	themes: Record<string, ColorTokens>,
	pairs: ContrastPair[] = DEFAULT_PAIRS,
): { globalPass: boolean; audits: ThemeAudit[] } {
	const audits: ThemeAudit[] = [];
	let globalPass = true;

	for (const [mode, tokens] of Object.entries(themes)) {
		const audit = auditTheme(mode.toUpperCase(), tokens, pairs);
		audits.push(audit);
		if (!audit.allPass) globalPass = false;
	}

	return { globalPass, audits };
}
