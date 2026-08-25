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
 * @fileoverview Public entry barrel for the transactional email package — re-exports
 * the schema contract, theme, mailer factory, registry, headless renderer, and the
 * built-in templates.
 *
 * @module @resq-systems/email-templates
 */

export { EmailPayload, EmailValidationError, decodeEmailPayload } from "./contract.js";
export type { EmailName, EmailTemplateData } from "./contract.js";
export {
	canonicalizeEmailContract,
	emailDesignContract,
	emailDesignContractIntegrity,
} from "./email-design-contract.js";
export type {
	EmailDesignContract,
	EmailDesignContractCore,
	EmailModeColors,
} from "./email-design-contract.js";
export {
	buildTailwindConfig,
	defaultEmailTheme,
	EmailMessageContext,
	EmailThemeContext,
	mergeEmailTheme,
	resolveEmailTheme,
	withEmailMessage,
	withEmailTheme,
} from "./emails/theme.js";
export type {
	EmailMessage,
	EmailOrgIdentity,
	EmailTheme,
	EmailThemeFonts,
	EmailThemeOverride,
} from "./emails/theme.js";
export {
	createMailer,
	defineEmailTemplate,
	type EmailRegistryEntry,
	type EmailTemplateDef,
	type Mailer,
	type MailerPayload,
	type MailerTemplateData,
} from "./mailer.js";
export { registry } from "./registry.js";
export { renderEmail } from "./render.js";
export type { RenderEmailOptions, RenderedEmail } from "./render.js";
export {
	EmailAddress,
	emailCategory,
	HttpUrl,
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
export type {
	EmailCategory,
	IncidentAlertData,
	MissionApprovalData,
	NewDeviceLoginData,
	NotificationData,
	OrgInvitationData,
	OtpData,
	PasswordChangedData,
	PasswordResetData,
	WelcomeData,
} from "./schemas.js";
export {
	incidentAlertTemplate,
	missionApprovalTemplate,
	newDeviceLoginTemplate,
	notificationTemplate,
	orgInvitationTemplate,
	otpTemplate,
	passwordChangedTemplate,
	passwordResetTemplate,
	resqEmailTemplates,
	welcomeTemplate,
} from "./templates.js";
