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

import { describe, expect, it } from "vitest";
import type { EmailName } from "../src/contract";
import { registry } from "../src/registry";

const names: EmailName[] = [
	"otp",
	"welcome",
	"password-reset",
	"notification",
	"incident-alert",
	"password-changed",
	"new-device-login",
	"mission-approval",
	"org-invitation",
];

describe("registry", () => {
	it("has a subject and component for every template name", () => {
		for (const name of names) {
			expect(registry[name]).toBeDefined();
			expect(typeof registry[name].subject).toBe("function");
			expect(typeof registry[name].render).toBe("function");
		}
	});

	it("exposes exactly the contract's template names", () => {
		expect(Object.keys(registry).sort()).toEqual([...names].sort());
	});
});
