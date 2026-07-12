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

import { Schema as S } from "effect";
import { describe, expect, it } from "vitest";
import { Email } from "../src/emails/primitives";
import { createMailer, defineEmailTemplate } from "../src/mailer";
import { resqEmailTemplates } from "../src/templates";

const pingTemplate = defineEmailTemplate({
	name: "ping",
	data: S.Struct({ message: S.NonEmptyString }),
	subject: (data) => `Ping: ${data.message}`,
	Component: (data) => (
		<Email.Shell preview="ping">
			<Email.Title>Ping</Email.Title>
			<Email.Paragraph>{data.message}</Email.Paragraph>
		</Email.Shell>
	),
});

const mailer = createMailer([...resqEmailTemplates, pingTemplate]);

describe("createMailer", () => {
	it("renders a custom template composed with the ResQ Systems set", async () => {
		const { subject, html, text } = await mailer.renderEmail({
			name: "ping",
			to: "a@b.com",
			data: { message: "hello world" },
		});

		expect(subject).toBe("Ping: hello world");
		expect(html).toContain("hello world");
		expect(text).toContain("hello world");
	});

	it("still validates and renders the built-in templates", async () => {
		const { subject } = await mailer.renderEmail({
			name: "otp",
			to: "a@b.com",
			data: { code: "999999" },
		});

		expect(subject).toBe("Your ResQ Systems verification code: 999999");
	});

	it("rejects an unknown template name", async () => {
		await expect(mailer.renderEmail({ name: "nope", to: "a@b.com", data: {} })).rejects.toThrow();
	});

	it("exposes the composed template names", () => {
		expect(mailer.names).toContain("ping");
		expect(mailer.names).toContain("incident-alert");
	});
});
