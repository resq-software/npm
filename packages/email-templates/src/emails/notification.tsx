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

import type { NotificationData } from "../schemas.js";
import { Email } from "./primitives.js";

export type NotificationEmailProps = NotificationData;

const severityClass: Record<"info" | "success" | "warning" | "error", string> = {
	info: "text-info",
	success: "text-success",
	warning: "text-warning",
	error: "text-danger",
};

/** Generic notification / alert email with an optional call-to-action. */
export function NotificationEmail({
	title,
	body,
	severity = "info",
	actionUrl,
	actionLabel,
}: NotificationEmailProps) {
	return (
		<Email.Shell preview={title}>
			<Email.Text
				className={`mb-2 text-xs font-bold uppercase tracking-wide ${severityClass[severity]}`}
			>
				{severity}
			</Email.Text>
			<Email.Title>{title}</Email.Title>
			<Email.Paragraph>{body}</Email.Paragraph>
			{actionUrl ? <Email.CTA href={actionUrl}>{actionLabel ?? "View details"}</Email.CTA> : null}
			<Email.Footer>You are receiving this notification from ResQ. ResQ Software.</Email.Footer>
		</Email.Shell>
	);
}
