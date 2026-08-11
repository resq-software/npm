/**
 * Copyright 2026 ResQ Systems, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @fileoverview Two query-surface controls that are decisions rather than signatures:
 * JSONP callback validation (WSTG-CLNT-13) and a computed query-complexity bound
 * (WSTG-APIT-01).
 *
 * Both are *computed*, not matched. Depth and alias count are structural properties and
 * a regex cannot count nesting — the same reason the engine's repeated-run check is a
 * linear scan rather than a backreference.
 *
 * @module @resq-systems/security/controls/query
 */

//#region JSONP

/**
 * A JavaScript identifier, optionally dotted into a namespace: `cb`, `app.render`,
 * `window.jsonp.handlers.onLoad`.
 *
 * Bounded at five segments of 64 characters. Nothing outside this shape can carry a
 * payload, because the response body is `<callback>(<json>)` and every metacharacter
 * needed to break out — quotes, parens, semicolons, angle brackets — is excluded.
 */
const JSONP_CALLBACK = /^[A-Za-z_$][\w$]{0,63}(?:\.[A-Za-z_$][\w$]{0,63}){0,4}$/;

/** Identifiers refused regardless of shape, because reflecting them assists an attacker. */
const JSONP_RESERVED = new Set([
	"eval",
	"Function",
	"constructor",
	"__proto__",
	"prototype",
	"alert",
	"setTimeout",
	"setInterval",
	"import",
	"require",
]);

/**
 * Validate a JSONP callback name.
 *
 * A JSONP response body is `<callback>(<json>)`, so the callback name is *concatenated
 * into executable JavaScript* — an allowlist is the only safe validation. Escaping is
 * not an option: there is no encoding of `alert(1);//` that is both harmless and still
 * callable.
 *
 * Prefer not shipping JSONP at all. It predates CORS, requires an endpoint that answers
 * `<script src>` with credentials attached, and is the mechanism behind cross-site
 * script inclusion.
 *
 * @param callback - The requested callback name.
 * @returns `true` when the name is a plain identifier or dotted namespace path and is
 *   not reserved.
 *
 * @example
 * ```ts
 * validateJsonpCallback("app.render");  // true
 * validateJsonpCallback("alert(1);//"); // false
 * validateJsonpCallback("window.eval"); // false — every segment is checked
 * ```
 */
export function validateJsonpCallback(callback: string): boolean {
	if (typeof callback !== "string" || callback.length === 0) return false;
	if (!JSONP_CALLBACK.test(callback)) return false;

	// Every segment is checked, so `window.eval` is refused as readily as `eval`.
	for (const segment of callback.split(".")) {
		if (JSONP_RESERVED.has(segment)) return false;
	}
	return true;
}

//#endregion

//#region Query complexity

/** Limits applied by {@link analyzeQueryComplexity}. */
export interface QueryComplexityLimits {
	/** Maximum nesting depth. Defaults to 10. */
	readonly maxDepth?: number;
	/** Maximum aliased fields. Defaults to 50. */
	readonly maxAliases?: number;
	/** Maximum selected fields overall. Defaults to 500. */
	readonly maxFields?: number;
	/** Maximum characters. Defaults to 20 000. */
	readonly maxLength?: number;
}

/** Measured shape of a query. */
export interface QueryComplexity {
	/** Deepest brace nesting reached. */
	readonly depth: number;
	/** Count of `alias: field` constructs. Approximate — see the function note. */
	readonly aliases: number;
	/** Approximate count of selected fields. */
	readonly fields: number;
	/** Character length. */
	readonly length: number;
	/** `true` when every limit is satisfied. */
	readonly withinLimits: boolean;
	/** Names of the limits exceeded; empty when `withinLimits`. */
	readonly exceeded: readonly string[];
}

/** Defaults chosen to sit well above ordinary application queries. */
const DEFAULT_LIMITS = {
	maxDepth: 10,
	maxAliases: 50,
	maxFields: 500,
	maxLength: 20_000,
} as const satisfies Required<QueryComplexityLimits>;

/** Word characters, for the field-token counter. */
const WORD_CHARACTER = /[A-Za-z0-9_]/;

/**
 * Measure a GraphQL-shaped query against structural limits.
 *
 * One linear pass counting brace depth, aliases, and field tokens. This is a *bound*,
 * not a parser: it does not validate the document, resolve fragments, or account for
 * list multipliers, so a production GraphQL server should still run a cost-analysis
 * plugin. What it catches is the cheap denial-of-service shape — deeply nested
 * recursive selections and mass aliasing — before the query reaches a resolver.
 *
 * String literals and `#` comments are skipped, so a brace inside `"{ }"` cannot
 * inflate the depth. The alias count is approximate: argument colons inside parens are
 * also preceded by a word and are counted too.
 *
 * @param query - The query document.
 * @param limits - See {@link QueryComplexityLimits}.
 * @returns The measured {@link QueryComplexity}. Never throws.
 *
 * @example
 * ```ts
 * const complexity = analyzeQueryComplexity(req.body.query, { maxDepth: 8 });
 * if (!complexity.withinLimits) {
 *   return new Response(`Query too complex: ${complexity.exceeded.join(", ")}`, {
 *     status: 400,
 *   });
 * }
 * ```
 */
export function analyzeQueryComplexity(
	query: string,
	limits: QueryComplexityLimits = {},
): QueryComplexity {
	const { maxDepth, maxAliases, maxFields, maxLength } = { ...DEFAULT_LIMITS, ...limits };

	if (typeof query !== "string") {
		return { depth: 0, aliases: 0, fields: 0, length: 0, withinLimits: true, exceeded: [] };
	}

	let depth = 0;
	let deepest = 0;
	let aliases = 0;
	let fields = 0;
	let inString = false;
	let inComment = false;
	let previousWasWord = false;

	for (let i = 0; i < query.length; i++) {
		const char = query[i] as string;

		if (inComment) {
			if (char === "\n") inComment = false;
			continue;
		}
		if (inString) {
			if (char === "\\") i++;
			else if (char === '"') inString = false;
			continue;
		}

		if (char === '"') {
			inString = true;
			previousWasWord = false;
			continue;
		}
		if (char === "#") {
			inComment = true;
			previousWasWord = false;
			continue;
		}
		if (char === "{") {
			depth++;
			if (depth > deepest) deepest = depth;
			previousWasWord = false;
			continue;
		}
		if (char === "}") {
			if (depth > 0) depth--;
			previousWasWord = false;
			continue;
		}
		if (char === ":") {
			if (previousWasWord) aliases++;
			previousWasWord = false;
			continue;
		}

		if (WORD_CHARACTER.test(char)) {
			if (!previousWasWord) fields++;
			previousWasWord = true;
			continue;
		}
		previousWasWord = false;
	}

	const exceeded: string[] = [];
	if (deepest > maxDepth) exceeded.push("depth");
	if (aliases > maxAliases) exceeded.push("aliases");
	if (fields > maxFields) exceeded.push("fields");
	if (query.length > maxLength) exceeded.push("length");

	return {
		depth: deepest,
		aliases,
		fields,
		length: query.length,
		withinLimits: exceeded.length === 0,
		exceeded,
	};
}

//#endregion

//#region GraphQL requests

/** Limits for {@link analyzeGraphQLRequest}. */
export interface GraphQLRequestLimits extends QueryComplexityLimits {
	/**
	 * Top-level operations permitted across the whole request. Defaults to 10.
	 *
	 * The bound {@link analyzeQueryComplexity} cannot express, because it measures one
	 * document and a batch is many.
	 */
	readonly maxOperations?: number;
	/** Documents permitted in one batch. Defaults to 10. */
	readonly maxDocuments?: number;
}

/** Result of {@link analyzeGraphQLRequest}. */
export interface GraphQLRequestAnalysis {
	/** Documents found in the request. `1` for an ordinary single query. */
	readonly documents: number;
	/** Top-level operations summed across every document. */
	readonly operations: number;
	/** The highest per-document complexity in the batch. */
	readonly worst: QueryComplexity;
	/** `true` when every limit is satisfied. */
	readonly withinLimits: boolean;
	/** Names of the limits exceeded; empty when `withinLimits`. */
	readonly exceeded: readonly string[];
}

/** Default batch bounds, generous compared with real client behaviour. */
const DEFAULT_REQUEST_LIMITS = {
	maxOperations: 10,
	maxDocuments: 10,
} as const satisfies Required<Pick<GraphQLRequestLimits, "maxOperations" | "maxDocuments">>;

/** An operation keyword at the start of a definition. */
const OPERATION_KEYWORD = /\b(?:query|mutation|subscription)\b/g;

/**
 * Reduce a document to the text outside braces, strings and comments.
 *
 * Operation keywords only mean anything at depth 0 — `query` inside a selection set is a
 * field name, not a second operation. Strings and `#` comments are dropped so neither can
 * contribute a brace or a keyword.
 *
 * Block strings are handled explicitly: treating `"""` as three single quotes flips the
 * in-string state an odd number of times and desynchronises the rest of the scan.
 *
 * @param document - A GraphQL document.
 * @returns The depth-0 text, and whether a selection set was opened at depth 0.
 */
function topLevelText(document: string): { text: string; hasSelection: boolean } {
	let text = "";
	let depth = 0;
	let hasSelection = false;
	let index = 0;

	while (index < document.length) {
		const char = document[index];

		if (char === "#") {
			while (index < document.length && document[index] !== "\n") index++;
			continue;
		}

		if (document.startsWith('"""', index)) {
			index += 3;
			while (index < document.length && !document.startsWith('"""', index)) index++;
			index += 3;
			continue;
		}

		if (char === '"') {
			index++;
			while (index < document.length && document[index] !== '"') {
				index += document[index] === "\\" ? 2 : 1;
			}
			index++;
			continue;
		}

		if (char === "{") {
			if (depth === 0) hasSelection = true;
			depth++;
			index++;
			continue;
		}

		if (char === "}") {
			depth = Math.max(0, depth - 1);
			index++;
			continue;
		}

		if (depth === 0 && char !== undefined) text += char;
		index++;
	}

	return { text, hasSelection };
}

/**
 * Count the top-level operations in one document.
 *
 * @param document - A GraphQL document.
 * @returns The operation count. A document with no keyword but a depth-0 selection set
 *   counts as one, because anonymous shorthand is an operation.
 */
function countOperations(document: string): number {
	const { text, hasSelection } = topLevelText(document);
	const matches = text.match(OPERATION_KEYWORD)?.length ?? 0;
	if (matches > 0) return matches;
	return hasSelection ? 1 : 0;
}

/**
 * Deepest body nesting traversed. A real batch is one array of operation objects, so
 * anything past this is a client sending nesting for its own sake.
 *
 * The bound is what keeps {@link analyzeGraphQLRequest}'s "never throws" contract honest:
 * a caller handing over `req.body` straight from a JSON body parser can pass `[[[[…]]]]`
 * nested tens of thousands deep, and an unbounded descent raises `RangeError: Maximum
 * call stack size exceeded` inside a function documented not to throw. The raw-text path
 * never had this exposure — its `JSON.parse` failure is caught below — so only the
 * already-parsed path was affected. Same unbounded-cost shape `payload.ts` caps with
 * `MAX_COUNTER_STACK`.
 */
const MAX_BODY_DEPTH = 8;

/**
 * Extract the GraphQL documents from a request body of any accepted shape.
 *
 * @param body - Parsed body, or the raw JSON text.
 * @param depth - Current nesting level; callers use the default.
 * @returns Every `query` string found, in order.
 */
function documentsFrom(body: unknown, depth = 0): string[] {
	if (depth > MAX_BODY_DEPTH) return [];

	if (typeof body === "string") {
		const trimmed = body.trim();
		if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
			try {
				return documentsFrom(JSON.parse(trimmed) as unknown, depth + 1);
			} catch {
				// Not JSON after all — fall through and treat it as a bare document.
			}
		}
		return [body];
	}

	if (Array.isArray(body)) return body.flatMap((entry) => documentsFrom(entry, depth + 1));

	if (typeof body === "object" && body !== null) {
		const query = (body as { query?: unknown }).query;
		return typeof query === "string" ? [query] : [];
	}

	return [];
}

/**
 * Measure a whole GraphQL *request*, including batches.
 *
 * {@link analyzeQueryComplexity} measures one document, which leaves two ways past it,
 * both measured against this package:
 *
 * - The documented call, `analyzeQueryComplexity(req.body.query, …)`, reads `undefined`
 *   when a client posts an **array** batch — so a 250-operation request measured
 *   `{ depth: 0, fields: 0, withinLimits: true }`. A total pass that does not even trip
 *   the length bound.
 * - Passing the raw body instead does not help: the scanner skips everything between
 *   JSON quotes, so the same batch measured `fields: 0`.
 *
 * Alias batching *inside* one document is already bounded and needs nothing here — 300
 * aliased selections report `exceeded: ["aliases", "fields"]`.
 *
 * Accepts a parsed body (`{ query }`, or an array of them) or the raw JSON text, and
 * delegates per-document measurement to {@link analyzeQueryComplexity}, so existing
 * callers and limits keep their meaning.
 *
 * Still a bound rather than a parser: run a cost-analysis plugin in the server too.
 *
 * @param body - The request body, parsed or raw.
 * @param limits - Per-document limits, plus `maxOperations` and `maxDocuments`.
 * @returns The measured {@link GraphQLRequestAnalysis}. Never throws.
 *
 * @example
 * ```ts
 * const analysis = analyzeGraphQLRequest(req.body);
 * if (!analysis.withinLimits) {
 *   return new Response("Request rejected: " + analysis.exceeded.join(", "), { status: 400 });
 * }
 * ```
 */
export function analyzeGraphQLRequest(
	body: unknown,
	limits: GraphQLRequestLimits = {},
): GraphQLRequestAnalysis {
	const { maxOperations, maxDocuments } = { ...DEFAULT_REQUEST_LIMITS, ...limits };

	const documents = documentsFrom(body);
	const measured = documents.map((document) => analyzeQueryComplexity(document, limits));
	const operations = documents.reduce((total, document) => total + countOperations(document), 0);

	const empty: QueryComplexity = {
		depth: 0,
		aliases: 0,
		fields: 0,
		length: 0,
		withinLimits: true,
		exceeded: [],
	};

	// The worst document decides, so one oversized member of a batch cannot hide behind
	// the rest.
	const worst = measured.reduce<QueryComplexity>(
		(currentWorst, complexity) =>
			complexity.exceeded.length > currentWorst.exceeded.length ||
			complexity.fields > currentWorst.fields
				? complexity
				: currentWorst,
		empty,
	);

	const exceeded = [...worst.exceeded];
	if (documents.length > maxDocuments) exceeded.push("documents");
	if (operations > maxOperations) exceeded.push("operations");

	return {
		documents: documents.length,
		operations,
		worst,
		withinLimits: exceeded.length === 0,
		exceeded,
	};
}

//#endregion
