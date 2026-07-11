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

export const passwordChangedTemplate = defineEmailTemplate({
	name: "password-changed",
	data: passwordChangedData,
	subject: () => "Your ResQ password was changed",
	Component: (data) => <PasswordChangedEmail {...data} />,
});

export const newDeviceLoginTemplate = defineEmailTemplate({
	name: "new-device-login",
	data: newDeviceLoginData,
	subject: () => "New sign-in to your ResQ account",
	Component: (data) => <NewDeviceLoginEmail {...data} />,
});

export const missionApprovalTemplate = defineEmailTemplate({
	name: "mission-approval",
	data: missionApprovalData,
	subject: (data) => `Mission approval needed: ${data.title}`,
	Component: (data) => <MissionApprovalEmail {...data} />,
});

export const orgInvitationTemplate = defineEmailTemplate({
	name: "org-invitation",
	data: orgInvitationData,
	subject: (data) => `You're invited to join ${data.orgName} on ResQ`,
	Component: (data) => <OrgInvitationEmail {...data} />,
});

/** The built-in ResQ template set — spread into `createMailer` to extend it. */
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
