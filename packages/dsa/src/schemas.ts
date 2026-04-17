/**
 * Copyright 2026 ResQ Software
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

export const TrieOptionsSchema = S.Struct({
	caseInsensitive: S.optional(S.Boolean),
	maxResults: S.optional(S.Int.check(S.isGreaterThan(0))),
});
export type TrieOptions = S.Schema.Type<typeof TrieOptionsSchema>;

export const TrieInsertSchema = S.Struct({
	word: S.String.check(S.isMinLength(1)),
});
export type TrieInsert = S.Schema.Type<typeof TrieInsertSchema>;

export const TrieSearchSchema = S.Struct({
	prefix: S.String,
	limit: S.optional(S.Int.check(S.isGreaterThan(0))),
});
export type TrieSearch = S.Schema.Type<typeof TrieSearchSchema>;

// ============================================
// Priority Queue Schemas
// ============================================

export const PriorityQueueOptionsSchema = S.Struct({
	initialCapacity: S.optional(S.Int.check(S.isGreaterThan(0))),
});
export type PriorityQueueOptions = S.Schema.Type<
	typeof PriorityQueueOptionsSchema
>;

export const PriorityItemSchema = S.Struct({
	id: S.String.check(S.isMinLength(1)),
	priority: S.optional(S.Int.check(S.isGreaterThanOrEqualTo(0))).pipe(
		S.withDecodingDefault(Effect.succeed(3)),
	),
	dueDate: S.String,
});
export type PriorityItemInput = S.Schema.Type<typeof PriorityItemSchema>;

// ============================================
// Rabin-Karp Schemas
// ============================================

export const RabinKarpOptionsSchema = S.Struct({
	caseInsensitive: S.optional(S.Boolean),
	maxMatches: S.optional(S.Int.check(S.isGreaterThan(0))),
	includeLineInfo: S.optional(S.Boolean),
});
export type RabinKarpOptions = S.Schema.Type<typeof RabinKarpOptionsSchema>;

export const RabinKarpSearchSchema = S.Struct({
	text: S.String.check(S.isMinLength(1)),
	pattern: S.String.check(S.isMinLength(1)),
});
export type RabinKarpSearch = S.Schema.Type<typeof RabinKarpSearchSchema>;

export const RabinKarpMultiSearchSchema = S.Struct({
	text: S.String.check(S.isMinLength(1)),
	patterns: S.NonEmptyArray(S.String.check(S.isMinLength(1))),
});
export type RabinKarpMultiSearch = S.Schema.Type<
	typeof RabinKarpMultiSearchSchema
>;

// ============================================
// Graph Schemas
// ============================================

export const GraphOptionsSchema = S.Struct({
	directed: S.optional(S.Boolean),
});
export type GraphOptions = S.Schema.Type<typeof GraphOptionsSchema>;

export const GraphEdgeSchema = S.Struct({
	source: S.String.check(S.isMinLength(1)),
	target: S.String.check(S.isMinLength(1)),
	weight: S.optional(S.Finite),
});
export type GraphEdge = S.Schema.Type<typeof GraphEdgeSchema>;

export const VertexIdSchema = S.String.check(S.isMinLength(1));
export type VertexId = S.Schema.Type<typeof VertexIdSchema>;

// ============================================
// Validation Helpers
// ============================================

// biome-ignore lint: Effect Schema generics require flexible typing for cross-version compat
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySchema = S.Schema<any>;

export function validate<T extends AnySchema>(schema: T, input: unknown): S.Schema.Type<T> {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-return
	return (S.decodeUnknownSync as Function)(schema)(input);
}

type ValidationSuccess<A> = { readonly success: true; readonly data: A };
type ValidationFailure = { readonly success: false; readonly error: string };
type ValidationResult<A> = ValidationSuccess<A> | ValidationFailure;

export function validateSafe<T extends AnySchema>(
	schema: T,
	input: unknown,
): ValidationResult<S.Schema.Type<T>> {
	try {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-return
		const data: S.Schema.Type<T> = (S.decodeUnknownSync as Function)(schema)(input);
		return { success: true, data };
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Validation failed";
		return { success: false, error: message };
	}
}

export function createValidator<T extends AnySchema>(
	schema: T,
): (input: unknown) => S.Schema.Type<T> {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-return
	return (input: unknown) => (S.decodeUnknownSync as Function)(schema)(input);
}
