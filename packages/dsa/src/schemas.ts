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

import { Schema as S } from "effect";

// ============================================
// Trie Schemas
// ============================================

export const TrieOptionsSchema = S.Struct({
	caseInsensitive: S.optional(S.Boolean),
	maxResults: S.optional(S.Number.pipe(S.int(), S.greaterThan(0))),
});
export type TrieOptions = S.Schema.Type<typeof TrieOptionsSchema>;

export const TrieInsertSchema = S.Struct({
	word: S.String.pipe(S.minLength(1)),
});
export type TrieInsert = S.Schema.Type<typeof TrieInsertSchema>;

export const TrieSearchSchema = S.Struct({
	prefix: S.String,
	limit: S.optional(S.Number.pipe(S.int(), S.greaterThan(0))),
});
export type TrieSearch = S.Schema.Type<typeof TrieSearchSchema>;

// ============================================
// Priority Queue Schemas
// ============================================

export const PriorityQueueOptionsSchema = S.Struct({
	initialCapacity: S.optional(S.Number.pipe(S.int(), S.greaterThan(0))),
});
export type PriorityQueueOptions = S.Schema.Type<
	typeof PriorityQueueOptionsSchema
>;

export const PriorityItemSchema = S.Struct({
	id: S.String.pipe(S.minLength(1)),
	priority: S.optional(S.Number.pipe(S.int(), S.greaterThanOrEqualTo(0))).pipe(
		S.withDecodingDefault(() => 3),
	),
	dueDate: S.String,
});
export type PriorityItemInput = S.Schema.Type<typeof PriorityItemSchema>;

// ============================================
// Rabin-Karp Schemas
// ============================================

export const RabinKarpOptionsSchema = S.Struct({
	caseInsensitive: S.optional(S.Boolean),
	maxMatches: S.optional(S.Number.pipe(S.int(), S.greaterThan(0))),
	includeLineInfo: S.optional(S.Boolean),
});
export type RabinKarpOptions = S.Schema.Type<typeof RabinKarpOptionsSchema>;

export const RabinKarpSearchSchema = S.Struct({
	text: S.String.pipe(S.minLength(1)),
	pattern: S.String.pipe(S.minLength(1)),
});
export type RabinKarpSearch = S.Schema.Type<typeof RabinKarpSearchSchema>;

export const RabinKarpMultiSearchSchema = S.Struct({
	text: S.String.pipe(S.minLength(1)),
	patterns: S.NonEmptyArray(S.String.pipe(S.minLength(1))),
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
	source: S.String.pipe(S.minLength(1)),
	target: S.String.pipe(S.minLength(1)),
	weight: S.optional(S.Finite),
});
export type GraphEdge = S.Schema.Type<typeof GraphEdgeSchema>;

export const VertexIdSchema = S.String.pipe(S.minLength(1));
export type VertexId = S.Schema.Type<typeof VertexIdSchema>;

// ============================================
// Validation Helpers
// ============================================

export function validate<A, I>(schema: S.Schema<A, I>, input: unknown): A {
	return S.decodeUnknownSync(schema)(input);
}

export function validateSafe<A, I>(
	schema: S.Schema<A, I>,
	input: unknown,
): { success: true; data: A } | { success: false; error: string } {
	try {
		const data = S.decodeUnknownSync(schema)(input);
		return { success: true, data };
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Validation failed";
		return { success: false, error: message };
	}
}

export function createValidator<A, I>(
	schema: S.Schema<A, I>,
): (input: unknown) => A {
	return (input: unknown) => S.decodeUnknownSync(schema)(input);
}
