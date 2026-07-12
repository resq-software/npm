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
 * Pipeline example: validate a `{ name, to, data }` payload and render it to
 * `{ subject, html, text }` — exactly what a queue worker or cron job would do.
 * Run with `bun run index.ts` (after `bun run build` for @resq-systems/email-templates).
 */

import { type EmailPayload, renderEmail } from "@resq-systems/email-templates";
// Sending is server-only and needs `resend` + RESEND_API_KEY:
// import { createResendSender, sendEmail } from "@resq-systems/email-templates/send";

const payload: EmailPayload = {
	name: "incident-alert",
	to: "oncall@resq.software",
	data: {
		incidentId: "INC-2048",
		title: "Wildfire perimeter breach detected",
		severity: "critical",
		summary: "Drone 07 detected fire crossing the northern containment line near Sector 4.",
		location: "Sector 4 — Northern ridge",
		detectedAt: "2026-07-05 18:42 PDT",
		dashboardUrl: "https://app.resq.software/incidents/INC-2048",
	},
};

const rendered = await renderEmail(payload);

console.log("to:      ", rendered.to);
console.log("subject: ", rendered.subject);
console.log("html:    ", `${rendered.html.length} bytes`);
console.log("text:\n");
console.log(rendered.text);

// To actually send (requires RESEND_API_KEY and a verified domain):
//
//   const sender = createResendSender(); // reads RESEND_API_KEY
//   const result = await sendEmail(sender, payload, {
//     from: "ResQ <updates@send.resq.software>",
//     idempotencyKey: `incident-${payload.data.incidentId}`,
//   });
//   if (!result.ok) console.error("send failed:", result.error);
//   else console.log("queued:", result.id);
