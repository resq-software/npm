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
 * @fileoverview Built-in ResQ Systems template definitions — each pairs a `data`
 * schema with a subject builder and a React Email component, collected into
 * `resqEmailTemplates` for `createMailer`.
 *
 * @module @resq-systems/email-templates/templates
 */

import { IncidentAlertEmail } from "./emails/incident-alert.js";
import { MissionApprovalEmail } from "./emails/mission-approval.js";
import { NewDeviceLoginEmail } from "./emails/new-device-login.js";
import { NotificationEmail } from "./emails/notification.js";
import { OrgInvitationEmail } from "./emails/org-invitation.js";
import { OtpEmail } from "./emails/otp.js";
import { PasswordChangedEmail } from "./emails/password-changed.js";
import { PasswordResetEmail } from "./emails/password-reset.js";
import { WelcomeEmail } from "./emails/welcome.js";
import { defineEmailTemplate } from "./mailer.js";
import {
	incidentAlertData,
	missionApprovalData,
	newDeviceLoginData,
	notificationData,
	orgInvitationData,
	otpData,
	passwordChangedData,
	passwordResetData,
	welcomeData,
} from "./schemas.js";

/** One-time verification code (OTP) template. */
export const otpTemplate = defineEmailTemplate({
	name: "otp",
	data: otpData,
	subject: (data) => `Your ResQ Systems verification code: ${data.code}`,
	Component: (data) => <OtpEmail {...data} />,
});

/** Account welcome / onboarding template. */
export const welcomeTemplate = defineEmailTemplate({
	name: "welcome",
	data: welcomeData,
	subject: (data) => `Welcome to ResQ Systems, ${data.firstName}`,
	Component: (data) => <WelcomeEmail {...data} />,
});

/** Password-reset template. */
export const passwordResetTemplate = defineEmailTemplate({
	name: "password-reset",
	data: passwordResetData,
	subject: () => "Reset your ResQ Systems password",
	Component: (data) => <PasswordResetEmail {...data} />,
});

/** Generic notification / alert template. */
export const notificationTemplate = defineEmailTemplate({
	name: "notification",
	data: notificationData,
	subject: (data) => data.title,
	Component: (data) => <NotificationEmail {...data} />,
});

/** Incident / dispatch alert template. */
export const incidentAlertTemplate = defineEmailTemplate({
	name: "incident-alert",
	data: incidentAlertData,
	subject: (data) => `[${data.severity.toUpperCase()}] ${data.title}`,
	Component: (data) => <IncidentAlertEmail {...data} />,
});

/** Password-changed security-notice template. */
export const passwordChangedTemplate = defineEmailTemplate({
	name: "password-changed",
	data: passwordChangedData,
	subject: () => "Your ResQ Systems password was changed",
	Component: (data) => <PasswordChangedEmail {...data} />,
});

/** New-device sign-in security-alert template. */
export const newDeviceLoginTemplate = defineEmailTemplate({
	name: "new-device-login",
	data: newDeviceLoginData,
	subject: () => "New sign-in to your ResQ Systems account",
	Component: (data) => <NewDeviceLoginEmail {...data} />,
});

/** Mission-approval sign-off request template. */
export const missionApprovalTemplate = defineEmailTemplate({
	name: "mission-approval",
	data: missionApprovalData,
	subject: (data) => `Mission approval needed: ${data.title}`,
	Component: (data) => <MissionApprovalEmail {...data} />,
});

/** Organization / team invitation template. */
export const orgInvitationTemplate = defineEmailTemplate({
	name: "org-invitation",
	data: orgInvitationData,
	subject: (data) => `You're invited to join ${data.orgName} on ResQ Systems`,
	Component: (data) => <OrgInvitationEmail {...data} />,
});

/** The built-in ResQ Systems template set — spread into `createMailer` to extend it. */
export const resqEmailTemplates = [
	otpTemplate,
	welcomeTemplate,
	passwordResetTemplate,
	notificationTemplate,
	incidentAlertTemplate,
	passwordChangedTemplate,
	newDeviceLoginTemplate,
	missionApprovalTemplate,
	orgInvitationTemplate,
] as const;
