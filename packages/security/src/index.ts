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
 * @fileoverview Public API for `@resq-systems/security` — AES-256-GCM encryption,
 * Effect-Schema input validators, context-aware threat detection, UTS #39 identifier
 * analysis, and PII sanitization.
 *
 * Subpath exports:
 * - `@resq-systems/security` — crypto, validators, sanitizer, threats, unicode
 * - `@resq-systems/security/sanitize` — PII redaction without crypto deps
 * - `@resq-systems/security/threats` — the context-aware rule engine
 * - `@resq-systems/security/controls` — preventive controls for weaknesses no
 *   signature can detect: CORS origin validation, CSRF tokens, upload type agreement,
 *   JSONP callback validation, query-complexity bounds
 * - `@resq-systems/security/unicode` — UTS #39 skeletons, scripts, restriction levels
 * - `@resq-systems/security/paths` — CWE-22 path containment. **Node only**, and
 *   therefore not re-exported from this barrel: it imports `node:path` statically.
 *
 * `effect` is an optional peer dependency required only for the Schema-based
 * validators.
 *
 * The detection surface reports what an untrusted value *looks like*. It is not what
 * makes an application safe — parameterized queries, context-correct output encoding,
 * path containment, and argv-array process spawning are. Every rule names its own
 * control in `primaryControl`.
 *
 * @module @resq-systems/security
 *
 * @example PII redaction for log lines
 * ```ts
 * import { redactPII } from "@resq-systems/security/sanitize";
 *
 * redactPII("Contact john@example.com from 1.2.3.4");
 * // → "Contact [EMAIL] from [IP_ADDRESS]"
 * ```
 *
 * @example Scoping detection to the sink the value reaches
 * ```ts
 * import { scanForThreats } from "@resq-systems/security";
 *
 * scanForThreats(bio, { contexts: ["general_text"] }).verdict; // "allow"
 * scanForThreats(uploadName, { contexts: ["filesystem"] });    // traversal rules run
 * ```
 */

export {
	coerceCiphertext,
	coerceEncryptionKey,
	decryptData,
	encryptData,
	generateSecureToken,
	hashData,
	isCiphertext,
	isEncryptionKey,
	maskEmail,
	maskPII,
	sanitizeForLogging,
	toCiphertext,
	toEncryptionKey,
	unsafeCiphertext,
	unsafeEncryptionKey,
} from "./crypto.js";
export type { Ciphertext, EncryptionKey, Masked, SecureToken, Sha256Hex } from "./crypto.js";
export {
	containsCommandInjection,
	containsHomoglyphs,
	containsNoSQLInjection,
	containsPathTraversal,
	containsPrototypePollution,
	containsSQLInjection,
	containsXSSPatterns,
	detectThreatPatterns,
	encodeJsonForScript,
	encodeLogValue,
	escapeCsvField,
	escapeHtmlAttribute,
	escapeHtmlText,
	getThreatErrorMessage,
	isSafeInput,
	normalizeUnicode,
	sanitizeForDisplay,
	THREAT_DETECTED_MESSAGE,
	toCsvRow,
	validatePersonName,
	validateSafeEmail,
	validateSafeName,
	validateSafeText,
} from "./validators.js";
export type {
	ThreatDetectionConfig,
	ThreatDetectionResult,
	ThreatSummary,
} from "./validators.js";
export {
	ALL_THREAT_CONTEXTS,
	assertRuleCatalogIsValid,
	ATTACK_PATTERNS,
	attackPatternsForCwe,
	buildInputVariants,
	calculateThreatScore,
	CONFIDENCE_MULTIPLIERS,
	DEFAULT_THREAT_POLICY,
	decodeHtmlEntities,
	getRulesForContexts,
	MAX_SCAN_LENGTH,
	scanForThreats,
	scoreForFinding,
	SEVERITY_WEIGHTS,
	summarizeByType,
	THREAT_RULES,
	tryPercentDecode,
	verdictForScore,
} from "./threats/index.js";
export type {
	AttackPattern,
	EventContext,
	InputSource,
	InputVariant,
	InputVariantKind,
	ThreatConfidence,
	ThreatContext,
	ThreatFinding,
	ThreatPolicy,
	ThreatRule,
	ThreatScanOptions,
	ThreatScanResult,
	ThreatSeverity,
	ThreatType,
	ThreatTypeSummary,
	ThreatVerdict,
} from "./threats/index.js";
export {
	analyzeGraphQLRequest,
	analyzeQueryComplexity,
	assertOutboundUrl,
	assertUploadType,
	checkCorsResponsePolicy,
	checkJsonPayloadLimits,
	createCsrfToken,
	detectFileSignature,
	classifyAddress,
	isAllowedOrigin,
	isPubliclyRoutableAddress,
	normalizeOrigin,
	resolveRedirectTarget,
	validateJsonpCallback,
	verifyCsrfToken,
} from "./controls/index.js";
export type {
	AddressClassification,
	CorsResponsePolicy,
	CsrfFailureReason,
	CsrfTokenOptions,
	CsrfVerification,
	CsrfVerifyOptions,
	FileTypeName,
	GraphQLRequestAnalysis,
	GraphQLRequestLimits,
	JsonPayloadLimits,
	JsonPayloadReport,
	OriginPolicyOptions,
	OutboundRejectionReason,
	OutboundUrlPolicy,
	OutboundUrlVerdict,
	QueryComplexity,
	QueryComplexityLimits,
	RedirectPolicyOptions,
	RedirectRejectionReason,
	RedirectVerdict,
	UploadCandidate,
	UploadRejectionReason,
	UploadVerdict,
} from "./controls/index.js";
export {
	analyzeIdentifier,
	areConfusable,
	containsBidiControls,
	containsInvisibleCharacters,
	foldConfusables,
	getRestrictionLevel,
	getScripts,
	getSkeleton,
	isSafeIdentifier,
	stripInvisibleCharacters,
} from "./unicode/index.js";
export type {
	IdentifierRestrictionLevel,
	IdentifierSecurityResult,
	UnicodeScript,
} from "./unicode/index.js";
export {
	CreditCardSchema,
	EmailSchema,
	escapeHtml,
	IPv4Schema,
	isValidEmail,
	isValidPhone,
	isValidSSN,
	isValidUrl,
	parseJsonWithSchema,
	PhoneNumberSchema,
	PIIRedactionOptionsSchema,
	redactPII,
	redactPIIEffect,
	safeStringify,
	SafeUrlSchema,
	sanitizeHtml,
	sanitizeJson,
	SanitizedStringSchema,
	sanitizeUrl,
	sanitizeUrlEffect,
	SSNSchema,
	stripAnsi,
	UrlProtocolSchema,
	UserInputOptionsSchema,
	validateUserInput,
	validateUserInputEffect,
} from "./sanitize.js";
export type {
	CreditCard,
	Email,
	IPv4,
	PhoneNumber,
	PIIRedactionOptions,
	SafeUrl,
	SanitizedString,
	SSN,
	UrlProtocol,
	UserInputOptions,
} from "./sanitize.js";
export { getHashForBuffer, getHashForObject, getHashForString, lns } from "./hash.js";
