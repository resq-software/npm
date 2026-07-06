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

import type { OtpData } from "../schemas.js";
import { Email } from "./primitives.js";

export type OtpEmailProps = OtpData;

/**
 * One-time verification code email. Default prop values make it previewable via
 * `email dev`.
 */
export function OtpEmail({ code = "123456", firstName, expiresInMinutes = 10 }: OtpEmailProps) {
	return (
		<Email.Shell preview="Your ResQ verification code">
			<Email.Title>Verification code</Email.Title>
			{firstName ? <Email.Paragraph>Hi {firstName},</Email.Paragraph> : null}
			<Email.Paragraph>
				Use this one-time code to continue. It expires in {expiresInMinutes} minutes.
			</Email.Paragraph>
			<Email.Code>{code}</Email.Code>
			<Email.Footer>
				If you did not request this code, you can safely ignore this email. ResQ Software.
			</Email.Footer>
		</Email.Shell>
	);
}
