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

import { describe, expect, it } from "vitest";
import { brand } from "../src/brand";

describe("brand", () => {
	it("exposes identity, domains, and email addresses", () => {
		expect(brand.name).toBe("ResQ");
		expect(brand.domains.app).toMatch(/^https:\/\//);
		expect(brand.domains.marketing).toMatch(/^https:\/\//);
		expect(brand.domains.docs).toMatch(/^https:\/\//);
		expect(brand.domains.status).toMatch(/^https:\/\//);
		expect(brand.email.support).toContain("@");
		expect(brand.email.from).toContain("<");
	});

	it("exposes product identity, socials, and company details", () => {
		expect(brand.productName).toContain("ResQ");
		expect(brand.description.length).toBeGreaterThan(0);
		expect(brand.socials.github).toMatch(/^https:\/\/github\.com\//);
		expect(brand.socials.x).toMatch(/^https:\/\//);
		expect(brand.socials.xHandle).toMatch(/^@/);
		expect(brand.company.locations.length).toBeGreaterThan(0);
		expect(brand.logo).toMatch(/^https:\/\//);
	});
});
