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
 * @fileoverview The complete threat-rule catalog, assembled from the per-domain
 * groups and validated at module load.
 *
 * Validation is deliberately eager and fatal. A duplicate rule ID would make findings
 * ambiguous and break per-rule tuning; a stateful (`/g` or `/y`) pattern would make
 * detection depend on how many times the module had been called before. Both are
 * programming errors in the catalog itself rather than runtime conditions, so they
 * throw at import instead of degrading silently in production.
 *
 * @module @resq-systems/security/threats/rules
 */

import type { ThreatContext, ThreatRule } from "../types.js";
import {
	LDAP_INJECTION_RULES,
	NOSQL_INJECTION_RULES,
	SQL_INJECTION_RULES,
	XPATH_INJECTION_RULES,
} from "./datastore.js";
import {
	PROMPT_INJECTION_RULES,
	TEMPLATE_INJECTION_RULES,
	UNIVERSAL_RULES,
	XML_INJECTION_RULES,
} from "./markup.js";
import {
	CREDENTIAL_EXPOSURE_RULES,
	DOUBLE_ENCODING_RULES,
	JWT_RULES,
	PARAMETER_POLLUTION_RULES,
} from "./protocol.js";
import {
	COMMAND_INJECTION_RULES,
	FILE_INCLUSION_RULES,
	PATH_TRAVERSAL_RULES,
	SSRF_RULES,
} from "./system.js";
import {
	FORMULA_INJECTION_RULES,
	HEADER_INJECTION_RULES,
	LOG_INJECTION_RULES,
	PROTOTYPE_POLLUTION_RULES,
	XSS_RULES,
} from "./web.js";

export * from "./datastore.js";
export * from "./markup.js";
export * from "./protocol.js";
export * from "./system.js";
export * from "./web.js";

//#region Catalog

/**
 * Every signature the engine knows about, in a stable order.
 *
 * Order affects only the sequence of findings in a result — scoring is
 * order-independent.
 */
export const THREAT_RULES: readonly ThreatRule[] = [
	...XSS_RULES,
	...PROTOTYPE_POLLUTION_RULES,
	...HEADER_INJECTION_RULES,
	...FORMULA_INJECTION_RULES,
	...LOG_INJECTION_RULES,
	...SQL_INJECTION_RULES,
	...NOSQL_INJECTION_RULES,
	...LDAP_INJECTION_RULES,
	...XPATH_INJECTION_RULES,
	...COMMAND_INJECTION_RULES,
	...PATH_TRAVERSAL_RULES,
	...FILE_INCLUSION_RULES,
	...SSRF_RULES,
	...XML_INJECTION_RULES,
	...TEMPLATE_INJECTION_RULES,
	...PROMPT_INJECTION_RULES,
	...PARAMETER_POLLUTION_RULES,
	...CREDENTIAL_EXPOSURE_RULES,
	...JWT_RULES,
	...DOUBLE_ENCODING_RULES,
	...UNIVERSAL_RULES,
];

//#endregion

//#region Validation

/**
 * Assert the catalog's structural invariants.
 *
 * Runs once at module load and throws on violation — see the file overview for why
 * these are fatal rather than warnings.
 *
 * @param rules - Catalog to validate. Defaults to {@link THREAT_RULES}.
 * @throws {Error} If any rule has a duplicate ID, an empty context list, or a
 *   stateful (`g`/`y`) pattern. The message lists every problem found, not just the
 *   first.
 */
export function assertRuleCatalogIsValid(rules: readonly ThreatRule[] = THREAT_RULES): void {
	const seen = new Set<string>();
	const problems: string[] = [];

	for (const rule of rules) {
		if (seen.has(rule.id)) {
			problems.push(`duplicate rule id: ${rule.id}`);
		}
		seen.add(rule.id);

		if (rule.contexts.length === 0) {
			problems.push(`${rule.id}: contexts must not be empty`);
		}

		if (rule.pattern.global || rule.pattern.sticky) {
			problems.push(
				`${rule.id}: pattern must not use the g or y flag (lastIndex makes matching stateful)`,
			);
		}
	}

	if (problems.length > 0) {
		throw new Error(`Invalid threat rule catalog:\n  ${problems.join("\n  ")}`);
	}
}

assertRuleCatalogIsValid();

//#endregion

//#region Lookup

/**
 * Index from context to the rules that declare it, built once at module load so
 * per-call scanning is a map lookup rather than a filter over the whole catalog.
 */
const RULES_BY_CONTEXT: ReadonlyMap<ThreatContext, readonly ThreatRule[]> = (() => {
	const index = new Map<ThreatContext, ThreatRule[]>();
	for (const rule of THREAT_RULES) {
		for (const context of rule.contexts) {
			const bucket = index.get(context);
			if (bucket) {
				bucket.push(rule);
			} else {
				index.set(context, [rule]);
			}
		}
	}
	return index;
})();

/**
 * Memoized results of {@link getRulesForContexts} for multi-context calls.
 *
 * Keyed by the sorted, deduplicated, known-only context list, so it holds at most one
 * entry per distinct subset of the context enum — a hard ceiling that does not depend on
 * caller behaviour. The single-context path never reaches here; it already returns a
 * prebuilt bucket from {@link RULES_BY_CONTEXT}.
 */
const COMBINATION_CACHE = new Map<string, readonly ThreatRule[]>();

/**
 * Rule IDs that once shipped and have since been withdrawn.
 *
 * A rule ID is public API: consumers pin them in `excludeRuleIds` to suppress a finding
 * they have accepted. Reusing a retired ID silently re-points that suppression at an
 * unrelated rule, which is worse than the original finding because nobody is looking.
 * Add the ID here when a rule is withdrawn; never remove an entry.
 *
 * Enforced from the test suite rather than from {@link assertRuleCatalogIsValid}: that
 * runs at module load in every consumer process, and its checks are fatal because they
 * are runtime-correctness failures. This one is release hygiene.
 */
export const RETIRED_RULE_IDS: readonly string[] = [];

/**
 * Collect the rules applicable to a set of sinks.
 *
 * A rule declaring several contexts is returned once even when the caller names more
 * than one of them, so a value bound for both `html` and `url` is not double-scored
 * by a scheme rule that covers both.
 *
 * @param contexts - Sinks the value is destined for.
 * @returns Deduplicated rules in {@link THREAT_RULES} order — stable regardless of
 *   the order the caller listed contexts in.
 */
export function getRulesForContexts(contexts: readonly ThreatContext[]): readonly ThreatRule[] {
	const first = contexts[0];
	if (contexts.length === 1 && first !== undefined) {
		return RULES_BY_CONTEXT.get(first) ?? [];
	}

	// The result is a pure function of the context set, so this re-derived the same
	// array on every call: ~214 Set insertions plus a 132-element filter allocation,
	// which on short inputs was a third of total scan time.
	//
	// The key is deduplicated, filtered to contexts the catalog knows, and sorted.
	// Sorting preserves the documented order-independence. The other two steps bound
	// the cache: this function is exported publicly, so a JavaScript caller can pass
	// arbitrary strings, and keying on those unfiltered would let any caller grow the
	// map without limit. An unknown context contributes no rules, so dropping it
	// cannot change the result -- it only collapses ["html", "nonsense"] onto
	// ["html"], which is the same answer. Keys are therefore subsets of a 19-member set.
	const known = [...new Set(contexts)].filter((context) => RULES_BY_CONTEXT.has(context)).sort();
	const key = known.join(" ");
	const cached = COMBINATION_CACHE.get(key);
	if (cached !== undefined) return cached;

	const selected = new Set<ThreatRule>();
	for (const context of known) {
		for (const rule of RULES_BY_CONTEXT.get(context) ?? []) {
			selected.add(rule);
		}
	}

	const computed = THREAT_RULES.filter((rule) => selected.has(rule));
	COMBINATION_CACHE.set(key, computed);
	return computed;
}

//#endregion
