/**
 *
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
 *
 */

/**
 * @fileoverview Type-level tests. Each `assertType` / `@ts-expect-error` line is
 * a compile-time assertion — this file failing to type-check IS the test
 * failure. Run via `vitest` typecheck mode (wired into this package's `test`
 * script through `vitest.config.ts`).
 */

import { unsafeBrand } from "@resq-systems/types";
import { assertType, test } from "vitest";
import type { CookieDomain, GtagCommand } from "../src/index";

/** A branded GA4 id, minted without going through the regex boundary. */
const gid = unsafeBrand<"Ga4MeasurementId", string>("G-TYPED12");

test("gtag command tuples are checked against the discriminated union", () => {
	// Positive: the exact shapes #initGa4 / identify / reset / pageview emit.
	assertType<GtagCommand>(["js", new Date()]);
	assertType<GtagCommand>(["config", gid, { linker: { domains: ["resq.software"] } }]);
	assertType<GtagCommand>(["config", gid, { user_id: null }]);
	assertType<GtagCommand>(["event", "cta_clicked", { id: "hero", count: 3 }]);
	assertType<GtagCommand>(["set", "user_properties", { plan: "civilian" }]);

	// Negative: a raw (unbranded) measurement id cannot stand in for Ga4MeasurementId,
	// so a config command built from `process.env.*` directly is a compile error.
	// @ts-expect-error unbranded string is not a Ga4MeasurementId
	assertType<GtagCommand>(["config", "G-RAWSTRING", {}]);

	// Negative: GA4 event params are flat — a nested object value is rejected.
	// @ts-expect-error nested object is not a flat GtagEventParams value
	assertType<GtagCommand>(["event", "nested_bad", { payload: { no: "go" } }]);

	// Negative: an unmodeled verb is not a member of the union.
	// @ts-expect-error "navigate" is not a modeled gtag command verb
	assertType<GtagCommand>(["navigate", "somewhere"]);
});

test("CookieDomain is nominal — a bare string is not assignable", () => {
	const domain = unsafeBrand<"CookieDomain", string>(".resq.software");
	assertType<CookieDomain>(domain);

	// @ts-expect-error a plain string is not a normalized CookieDomain
	assertType<CookieDomain>(".resq.software");
});
