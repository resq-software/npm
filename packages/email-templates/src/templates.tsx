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

import { IncidentAlertEmail } from "./emails/incident-alert.js";
import { NotificationEmail } from "./emails/notification.js";
import { OtpEmail } from "./emails/otp.js";
import { PasswordResetEmail } from "./emails/password-reset.js";
import { WelcomeEmail } from "./emails/welcome.js";
import { defineEmailTemplate } from "./mailer.js";
import {
	incidentAlertData,
	notificationData,
	otpData,
	passwordResetData,
	welcomeData,
} from "./schemas.js";

export const otpTemplate = defineEmailTemplate({
	name: "otp",
	data: otpData,
	subject: (data) => `Your ResQ verification code: ${data.code}`,
	Component: (data) => <OtpEmail {...data} />,
});

export const welcomeTemplate = defineEmailTemplate({
	name: "welcome",
	data: welcomeData,
	subject: (data) => `Welcome to ResQ, ${data.firstName}`,
	Component: (data) => <WelcomeEmail {...data} />,
});

export const passwordResetTemplate = defineEmailTemplate({
	name: "password-reset",
	data: passwordResetData,
	subject: () => "Reset your ResQ password",
	Component: (data) => <PasswordResetEmail {...data} />,
});

export const notificationTemplate = defineEmailTemplate({
	name: "notification",
	data: notificationData,
	subject: (data) => data.title,
	Component: (data) => <NotificationEmail {...data} />,
});

export const incidentAlertTemplate = defineEmailTemplate({
	name: "incident-alert",
	data: incidentAlertData,
	subject: (data) => `[${data.severity.toUpperCase()}] ${data.title}`,
	Component: (data) => <IncidentAlertEmail {...data} />,
});

/** The built-in ResQ template set — spread into `createMailer` to extend it. */
export const resqEmailTemplates = [
	otpTemplate,
	welcomeTemplate,
	passwordResetTemplate,
	notificationTemplate,
	incidentAlertTemplate,
] as const;
