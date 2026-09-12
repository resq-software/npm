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
 * @fileoverview Preventive controls for weaknesses the threat catalog cannot detect.
 *
 * Everything here exists because a signature would be the wrong instrument. A forged
 * CSRF request is byte-identical to a genuine one; `Origin: https://evil.example` is
 * shaped exactly like a legitimate origin; an upload's danger lies in three values
 * *disagreeing*; query cost is counted, not matched. Each of these is a decision
 * function that fails closed, rather than a pattern that fails open.
 *
 * See `WSTG-COVERAGE.md` §2 for the weaknesses these address and §3 for what remains
 * unshipped.
 *
 * **Node only.** `csrf.ts` imports `node:crypto` statically, as `crypto.ts` already
 * does.
 *
 * @module @resq-systems/security/controls
 *
 * @example Wiring three of them on a state-changing endpoint
 * ```ts
 * import {
 *   assertUploadType,
 *   isAllowedOrigin,
 *   verifyCsrfToken,
 * } from "@resq-systems/security/controls";
 *
 * if (!isAllowedOrigin(req.headers.origin ?? "", ALLOWED_ORIGINS)) return forbid();
 *
 * const csrf = verifyCsrfToken(req.headers["x-csrf-token"], SECRET, {
 *   sessionId: session.id,
 * });
 * if (!csrf.valid) return forbid();
 *
 * const upload = assertUploadType({
 *   declaredType: file.type,
 *   filename: file.name,
 *   headBytes: new Uint8Array(await file.slice(0, 256).arrayBuffer()),
 *   allow: ["png", "jpeg"],
 * });
 * if (!upload.ok) return badRequest(upload.reason);
 * ```
 */

export { assertOutboundUrl, classifyAddress, isPubliclyRoutableAddress } from "./address.js";
export type {
	AddressClassification,
	OutboundRejectionReason,
	OutboundUrlPolicy,
	OutboundUrlVerdict,
} from "./address.js";
export { createCsrfToken, verifyCsrfToken } from "./csrf.js";
export type {
	CsrfFailureReason,
	CsrfTokenOptions,
	CsrfVerification,
	CsrfVerifyOptions,
} from "./csrf.js";
export { checkCorsResponsePolicy, isAllowedOrigin, normalizeOrigin } from "./origin.js";
export type { CorsResponsePolicy, OriginPolicyOptions } from "./origin.js";
export { resolveRedirectTarget } from "./redirect.js";
export type {
	RedirectPolicyOptions,
	RedirectRejectionReason,
	RedirectVerdict,
} from "./redirect.js";
export {
	analyzeGraphQLRequest,
	analyzeQueryComplexity,
	validateJsonpCallback,
} from "./query.js";
export type {
	GraphQLRequestAnalysis,
	GraphQLRequestLimits,
	QueryComplexity,
	QueryComplexityLimits,
} from "./query.js";
export { checkJsonPayloadLimits } from "./payload.js";
export type { JsonPayloadLimits, JsonPayloadReport } from "./payload.js";
export { assertUploadType, detectFileSignature } from "./upload.js";
export type {
	FileTypeName,
	UploadCandidate,
	UploadRejectionReason,
	UploadVerdict,
} from "./upload.js";
