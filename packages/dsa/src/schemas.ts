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
 * @file Effect Schema Definitions for DSA Module
 * @module dsa/schemas
 * @description Effect Schema validation schemas for data structure configurations
 *              and inputs. Provides type-safe validation at runtime.
 */

import { Effect } from "effect";
import { Schema as S } from "effect";

// ============================================
// Trie Schemas
// ============================================

/**
 * Construction options for {@link Trie}.
 *
 * - `caseInsensitive` — fold case during insert and lookup.
 * - `maxResults`      — cap returned matches (positive integer).
 */
export const TrieOptionsSchema = S.Struct({
	caseInsensitive: S.optional(S.Boolean),
	maxResults: S.optional(S.Int.check(S.isGreaterThan(0))),
});
/** Inferred TS type for {@link TrieOptionsSchema}. */
export type TrieOptions = S.Schema.Type<typeof TrieOptionsSchema>;

/** Validates input to a single Trie insertion (non-empty word). */
export const TrieInsertSchema = S.Struct({
	word: S.String.check(S.isMinLength(1)),
});
/** Inferred TS type for {@link TrieInsertSchema}. */
export type TrieInsert = S.Schema.Type<typeof TrieInsertSchema>;

/** Validates a Trie prefix-search query with optional result cap. */
export const TrieSearchSchema = S.Struct({
	prefix: S.String,
	limit: S.optional(S.Int.check(S.isGreaterThan(0))),
});
/** Inferred TS type for {@link TrieSearchSchema}. */
export type TrieSearch = S.Schema.Type<typeof TrieSearchSchema>;

// ============================================
// Priority Queue Schemas
// ============================================

/** Construction options for {@link PriorityQueue}. */
export const PriorityQueueOptionsSchema = S.Struct({
	initialCapacity: S.optional(S.Int.check(S.isGreaterThan(0))),
});
/** Inferred TS type for {@link PriorityQueueOptionsSchema}. */
export type PriorityQueueOptions = S.Schema.Type<typeof PriorityQueueOptionsSchema>;

/**
 * Schema for an item enqueued into the deadline-aware priority queue.
 *
 * `priority` defaults to `3` (mid-range) when omitted — encoded as a
 * decoding default rather than a TypeScript default so server-side
 * decoding produces the same shape regardless of how the JSON was
 * serialised.
 */
export const PriorityItemSchema = S.Struct({
	id: S.String.check(S.isMinLength(1)),
	priority: S.optional(S.Int.check(S.isGreaterThanOrEqualTo(0))).pipe(
		S.withDecodingDefault(Effect.succeed(3)),
	),
	dueDate: S.String,
});
/** Inferred TS type for {@link PriorityItemSchema}. */
export type PriorityItemInput = S.Schema.Type<typeof PriorityItemSchema>;

// ============================================
// Rabin-Karp Schemas
// ============================================

/** Construction options for {@link RabinKarp}. */
export const RabinKarpOptionsSchema = S.Struct({
	caseInsensitive: S.optional(S.Boolean),
	maxMatches: S.optional(S.Int.check(S.isGreaterThan(0))),
	includeLineInfo: S.optional(S.Boolean),
});
/** Inferred TS type for {@link RabinKarpOptionsSchema}. */
export type RabinKarpOptions = S.Schema.Type<typeof RabinKarpOptionsSchema>;

/** Validates input to a single-pattern Rabin-Karp search. */
export const RabinKarpSearchSchema = S.Struct({
	text: S.String.check(S.isMinLength(1)),
	pattern: S.String.check(S.isMinLength(1)),
});
/** Inferred TS type for {@link RabinKarpSearchSchema}. */
export type RabinKarpSearch = S.Schema.Type<typeof RabinKarpSearchSchema>;

/** Validates input to a multi-pattern Rabin-Karp search (≥1 pattern). */
export const RabinKarpMultiSearchSchema = S.Struct({
	text: S.String.check(S.isMinLength(1)),
	patterns: S.NonEmptyArray(S.String.check(S.isMinLength(1))),
});
/** Inferred TS type for {@link RabinKarpMultiSearchSchema}. */
export type RabinKarpMultiSearch = S.Schema.Type<typeof RabinKarpMultiSearchSchema>;

// ============================================
// Graph Schemas
// ============================================

/** Construction options for {@link Graph} — `directed` defaults to false. */
export const GraphOptionsSchema = S.Struct({
	directed: S.optional(S.Boolean),
});
/** Inferred TS type for {@link GraphOptionsSchema}. */
export type GraphOptions = S.Schema.Type<typeof GraphOptionsSchema>;

/**
 * Schema for an edge in a {@link Graph}: non-empty source and target,
 * optional finite numeric weight (NaN/Infinity rejected).
 */
export const GraphEdgeSchema = S.Struct({
	source: S.String.check(S.isMinLength(1)),
	target: S.String.check(S.isMinLength(1)),
	weight: S.optional(S.Finite),
});
/** Inferred TS type for {@link GraphEdgeSchema}. */
export type GraphEdge = S.Schema.Type<typeof GraphEdgeSchema>;

/**
 * Schema for a graph vertex identifier: a non-empty string carrying a
 * nominal `VertexId` brand. A `VertexId` is assignable to `string`, but a
 * plain `string` is not assignable to `VertexId` without going through
 * validation — see {@link isValidVertexId}.
 */
export const VertexIdSchema = S.String.check(S.isMinLength(1)).pipe(S.brand("VertexId"));
/** Inferred TS type for {@link VertexIdSchema} — `string & Brand<"VertexId">`. */
export type VertexId = S.Schema.Type<typeof VertexIdSchema>;

// ============================================
// Validation Helpers
// ============================================

/**
 * Marker constraint for "any schema decoding with no service context".
 *
 * `S.Codec<unknown>` fixes both decoding and encoding services to `never`, so
 * it satisfies the `decodeUnknownSync` bound while every concrete schema in
 * this module remains assignable to it — no `any` and no unsafe casts required.
 */
type AnySchema = S.Codec<unknown>;

/**
 * Decode `input` against `schema` synchronously, throwing on failure.
 *
 * Use when the input is already trusted and you'd rather propagate
 * the error than handle it locally — typically inside a wrapping
 * try/catch or further up the call stack. For caller-friendly
 * handling use {@link validateSafe} instead.
 *
 * @throws The Effect parse error from `decodeUnknownSync`.
 */
export function validate<T extends AnySchema>(schema: T, input: unknown): T["Type"] {
	return S.decodeUnknownSync(schema)(input);
}

type ValidationSuccess<A> = { readonly success: true; readonly data: A };
type ValidationFailure = { readonly success: false; readonly error: string };
type ValidationResult<A> = ValidationSuccess<A> | ValidationFailure;

/**
 * Decode `input` against `schema` and return a discriminated result
 * instead of throwing. Mirrors the `Result<T, E>` shape used
 * elsewhere in `@resq-systems/helpers`.
 *
 * @returns `{ success: true, data }` on success; `{ success: false,
 *   error }` (with the parse-error message) on failure.
 *
 * @example
 * ```ts
 * const r = validateSafe(GraphEdgeSchema, body);
 * if (!r.success) return new Response(r.error, { status: 400 });
 * graph.addEdge(r.data.source, r.data.target, r.data.weight);
 * ```
 */
export function validateSafe<T extends AnySchema>(
	schema: T,
	input: unknown,
): ValidationResult<T["Type"]> {
	try {
		const data: T["Type"] = S.decodeUnknownSync(schema)(input);
		return { success: true, data };
	} catch (error) {
		const message = error instanceof Error ? error.message : "Validation failed";
		return { success: false, error: message };
	}
}

/**
 * Build a reusable, throwing decoder bound to one schema. Equivalent
 * to currying {@link validate}.
 *
 * @example
 * ```ts
 * const parseEdge = createValidator(GraphEdgeSchema);
 * const edge = parseEdge(rawJson);
 * ```
 */
export function createValidator<T extends AnySchema>(schema: T): (input: unknown) => T["Type"] {
	return (input: unknown) => S.decodeUnknownSync(schema)(input);
}
