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
 * Effect-Schema input validators, threat detection, and PII sanitization.
 *
 * Subpath exports:
 * - `@resq-systems/security` — crypto, validators, sanitizer
 * - `@resq-systems/security/sanitize` — PII redaction without crypto deps
 *
 * `effect` is an optional peer dependency required only for the
 * Schema-based validators.
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
 */

export * from "./crypto.js";
export * from "./validators.js";
export * from "./sanitize.js";
export * from "./hash.js";
