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
 * @fileoverview Component entry barrel — re-exports the theme, the compound
 * primitives, and every built-in email React component.
 *
 * @module @resq-systems/email-templates/emails
 */

export { emailColors, emailFonts, emailOrg } from "./tokens.js";
export type { EmailColorToken } from "./tokens.js";
export { Email } from "./primitives.js";
export { OtpEmail } from "./otp.js";
export type { OtpEmailProps } from "./otp.js";
export { WelcomeEmail } from "./welcome.js";
export type { WelcomeEmailProps } from "./welcome.js";
export { PasswordResetEmail } from "./password-reset.js";
export type { PasswordResetEmailProps } from "./password-reset.js";
export { NotificationEmail } from "./notification.js";
export type { NotificationEmailProps } from "./notification.js";
export { IncidentAlertEmail } from "./incident-alert.js";
export type { IncidentAlertEmailProps } from "./incident-alert.js";
export { PasswordChangedEmail } from "./password-changed.js";
export type { PasswordChangedEmailProps } from "./password-changed.js";
export { NewDeviceLoginEmail } from "./new-device-login.js";
export type { NewDeviceLoginEmailProps } from "./new-device-login.js";
export { MissionApprovalEmail } from "./mission-approval.js";
export type { MissionApprovalEmailProps } from "./mission-approval.js";
export { OrgInvitationEmail } from "./org-invitation.js";
export type { OrgInvitationEmailProps } from "./org-invitation.js";
export {
	buildTailwindConfig,
	defaultEmailTheme,
	EmailMessageContext,
	EmailThemeContext,
	mergeEmailTheme,
	resolveEmailTheme,
	withEmailMessage,
	withEmailTheme,
} from "./theme.js";
export type {
	EmailMessage,
	EmailOrgIdentity,
	EmailTheme,
	EmailThemeFonts,
	EmailThemeOverride,
} from "./theme.js";
