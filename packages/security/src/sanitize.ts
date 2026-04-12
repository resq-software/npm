/**
 * Copyright 2026 ResQ
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
 * @file Input sanitization utilities for XSS prevention and data validation
 * @module utils/sanitize
 * @author ResQ
 * @description Provides type-safe input sanitization using Effect Schema for validation.
 *              Includes utilities for HTML escaping, URL validation, PII redaction, and more.
 * @compliance NIST 800-53 SI-10 (Information Input Validation)
 */

import { Exit, Option, Schema as S } from 'effect';

/**
 * A Schema with DecodingServices constrained to `never`, allowing synchronous decoding.
 */
type SyncSchema<T> = S.Schema<T> & { readonly DecodingServices: never };

// ============================================
// Effect Schema Definitions
// ============================================

/**
 * Schema for URL protocol validation
 * @compliance NIST 800-53 SI-10 (Information Input Validation)
 */
export const UrlProtocolSchema = S.Literals(['http:', 'https:', 'mailto:', 'tel:', 'ftp:']);
export type UrlProtocol = typeof UrlProtocolSchema.Type;

/**
 * Schema for PII redaction options
 * @compliance NIST 800-53 AU-3 (Content of Audit Records)
 */
export const PIIRedactionOptionsSchema = S.Struct({
  redactEmails: S.optional(S.Boolean),
  redactPhones: S.optional(S.Boolean),
  redactSSN: S.optional(S.Boolean),
  redactCreditCards: S.optional(S.Boolean),
  redactIPs: S.optional(S.Boolean),
  redactDates: S.optional(S.Boolean),
});
export type PIIRedactionOptions = typeof PIIRedactionOptionsSchema.Type;

/**
 * Schema for user input validation options
 * @compliance NIST 800-53 SI-10 (Information Input Validation)
 */
export const UserInputOptionsSchema = S.Struct({
  maxLength: S.optional(S.Int.check(S.isGreaterThan(0))),
  allowHtml: S.optional(S.Boolean),
  allowNewlines: S.optional(S.Boolean),
  trimWhitespace: S.optional(S.Boolean),
});
export type UserInputOptions = typeof UserInputOptionsSchema.Type;

/**
 * Schema for safe URL - validates URL format and protocol
 * @compliance NIST 800-53 SI-10 (Information Input Validation)
 */
export const SafeUrlSchema = S.String.check(
  S.makeFilter(
    (url: string) => {
      if (!url || url.trim() === '') return false;
      if (url.startsWith('/') && !url.startsWith('//')) return true;
      try {
        const parsed = new URL(url);
        const safeProtocols = ['http:', 'https:', 'mailto:'];
        return safeProtocols.includes(parsed.protocol);
      } catch {
        return /^[a-zA-Z0-9/_.-]+$/.test(url);
      }
    },
    { message: 'Invalid or unsafe URL' },
  ),
);
export type SafeUrl = typeof SafeUrlSchema.Type;

/**
 * Schema for sanitized HTML-safe string (validates as string; escaping done at runtime)
 * @compliance NIST 800-53 SI-10 (Information Input Validation)
 */
export const SanitizedStringSchema = S.String;
export type SanitizedString = typeof SanitizedStringSchema.Type;

/**
 * Schema for email address validation
 * @compliance NIST 800-53 SI-10 (Information Input Validation)
 */
export const EmailSchema = S.String.check(
  S.isPattern(/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/),
);
export type Email = typeof EmailSchema.Type;

/**
 * Schema for phone number validation (US format)
 * @compliance NIST 800-53 SI-10 (Information Input Validation)
 */
export const PhoneNumberSchema = S.String.check(
  S.isPattern(/^(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/),
);
export type PhoneNumber = typeof PhoneNumberSchema.Type;

/**
 * Schema for SSN validation (US format)
 * @compliance NIST 800-53 SI-10 (Information Input Validation)
 */
export const SSNSchema = S.String.check(S.isPattern(/^\d{3}[-\s]?\d{2}[-\s]?\d{4}$/));
export type SSN = typeof SSNSchema.Type;

/**
 * Schema for credit card number validation
 * @compliance NIST 800-53 SI-10 (Information Input Validation)
 */
export const CreditCardSchema = S.String.check(
  S.isPattern(/^(?:\d{4}[-\s]?){3}\d{4}$|^\d{15,16}$/),
);
export type CreditCard = typeof CreditCardSchema.Type;

/**
 * Schema for IPv4 address validation
 */
export const IPv4Schema = S.String.check(S.isPattern(/^(?:\d{1,3}\.){3}\d{1,3}$/));
export type IPv4 = typeof IPv4Schema.Type;

// ============================================
// Sanitization Functions
// ============================================

/**
 * Escapes special HTML characters in a string to their corresponding HTML entities,
 * preventing direct injection of HTML and JavaScript when rendering untrusted content.
 *
 * @param text - The plain text to escape.
 * @returns The escaped string safe for HTML rendering.
 * @compliance NIST 800-53 SI-10 (Information Input Validation)
 *
 * @example
 * ```typescript
 * escapeHtml('<script>alert("xss")</script>');
 * // "&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;"
 * ```
 */
export const escapeHtml = (text: string): string => {
  if (!text || typeof text !== 'string') {
    return '';
  }

  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
};

/**
 * Validates and sanitizes a user-supplied URL using Effect Schema.
 * Returns an Exit with the sanitized URL or an error.
 *
 * @param url - The URL to be validated and sanitized.
 * @param allowedProtocols - Array of allowed URL protocols.
 * @returns Exit containing the sanitized URL or an error.
 * @compliance NIST 800-53 SI-10 (Information Input Validation)
 *
 * @example
 * ```typescript
 * const result = sanitizeUrlEffect('https://example.com');
 * // Exit.succeed('https://example.com')
 *
 * const invalid = sanitizeUrlEffect('javascript:alert(1)');
 * // Exit.fail(...)
 * ```
 */
export const sanitizeUrlEffect = (
  url: string,
  allowedProtocols: readonly string[] = ['http:', 'https:', 'mailto:'],
): Exit.Exit<string, unknown> => {
  const CustomSafeUrlSchema = S.String.check(
    S.makeFilter(
      (u: string) => {
        if (!u || u.trim() === '') return false;
        const trimmed = u.trim();
        if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return true;
        try {
          const parsed = new URL(trimmed);
          if (!allowedProtocols.includes(parsed.protocol)) return false;
          if (parsed.hostname.includes('javascript:') || parsed.hostname.includes('data:')) {
            return false;
          }
          return true;
        } catch {
          return (
            /^[a-zA-Z0-9/_.-]+$/.test(trimmed) &&
            !trimmed.includes('javascript:') &&
            !trimmed.includes('data:')
          );
        }
      },
      { message: 'Invalid or unsafe URL' },
    ),
  );

  return S.decodeUnknownExit(CustomSafeUrlSchema)(url);
};

/**
 * Validates and sanitizes a user-supplied URL, ensuring it conforms to allowed protocols
 * and is not a vector for injection attacks like `javascript:` or `data:`.
 *
 * @param url - The URL to be validated and sanitized.
 * @param allowedProtocols - Array of allowed URL protocols.
 * @returns The sanitized URL if valid, or an empty string if unsafe.
 * @compliance NIST 800-53 SI-10 (Information Input Validation)
 *
 * @example
 * ```typescript
 * sanitizeUrl('https://example.com'); // 'https://example.com'
 * sanitizeUrl('javascript:alert(1)'); // ''
 * ```
 */
export const sanitizeUrl = (
  url: string,
  allowedProtocols: readonly string[] = ['http:', 'https:', 'mailto:'],
): string => {
  const result = sanitizeUrlEffect(url, allowedProtocols);
  return Exit.isSuccess(result) ? result.value : '';
};

/**
 * Validates user input using Effect Schema and returns an Exit.
 *
 * @param input - User input to validate and sanitize.
 * @param options - Validation options.
 * @returns Exit containing sanitized input or error.
 * @compliance NIST 800-53 SI-10 (Information Input Validation)
 */
export const validateUserInputEffect = (
  input: string,
  options: UserInputOptions = {},
): Exit.Exit<string, unknown> => {
  const {
    maxLength = 500,
    allowHtml = false,
    allowNewlines = false,
    trimWhitespace = true,
  } = options;

  const parsed = S.decodeUnknownExit(S.String)(input);
  if (Exit.isFailure(parsed)) return parsed;

  let result = parsed.value;

  if (trimWhitespace) {
    result = result.trim();
  }

  if (!allowHtml) {
    let prev: string;
    do {
      prev = result;
      result = result.replaceAll(/<[^>]*>/g, '');
    } while (result !== prev);
  }

  if (!allowNewlines) {
    result = result.replaceAll(/[\r\n]+/g, ' ');
  }

  result = result.replaceAll(/\s+/g, ' ');

  result = result
    .replaceAll(/javascript:/gi, '')
    .replaceAll(/data:/gi, '')
    .replaceAll(/vbscript:/gi, '')
    .replaceAll(/on\w+=/gi, '');

  return Exit.succeed(result.slice(0, maxLength));
};

/**
 * Validates and sanitizes generic user input by trimming, removing HTML tags (unless allowed),
 * normalizing whitespace, and removing dangerous patterns to prevent XSS and basic injection flaws.
 *
 * @param input - User input to validate and sanitize.
 * @param maxLength - Maximum allowed input length. Excess will be truncated.
 * @param allowHtml - If true, HTML tags are preserved; otherwise, all tags are stripped.
 * @returns Sanitized input string with length at most `maxLength`.
 * @compliance NIST 800-53 SI-10 (Information Input Validation)
 *
 * @example
 * ```typescript
 * validateUserInput('<p>Hello!</p>', 50); // "Hello!"
 * validateUserInput('<script>alert(1)</script>test', 100); // "test"
 * ```
 */
export const validateUserInput = (input: string, maxLength = 500, allowHtml = false): string => {
  if (!input || typeof input !== 'string') {
    return '';
  }

  const result = validateUserInputEffect(input, { maxLength, allowHtml });
  return Exit.isSuccess(result) ? result.value : '';
};

/**
 * Safely parses JSON with Effect Schema validation and prototype pollution protection.
 *
 * @template A - The expected schema type
 * @param jsonString - The JSON string to parse.
 * @param schema - Effect Schema to validate against.
 * @returns Option containing the parsed and validated object.
 * @compliance NIST 800-53 SI-10 (Information Input Validation)
 *
 * @example
 * ```typescript
 * const UserSchema = S.Struct({ name: S.String, age: S.Number });
 * const result = parseJsonWithSchema('{"name":"John","age":30}', UserSchema);
 * // Option.some({ name: 'John', age: 30 })
 * ```
 */
export const parseJsonWithSchema = <A>(
  jsonString: string,
  schema: SyncSchema<A>,
): Option.Option<A> => {
  if (!jsonString || typeof jsonString !== 'string') {
    return Option.none();
  }

  try {
    const sanitized = jsonString
      .replaceAll(/\)\s*\{/g, ') {}')
      .replaceAll(/\]\s*\{/g, '] {}')
      .replaceAll(/\}\s*\{/g, '} {}');

    const parsed = JSON.parse(sanitized);

    if (typeof parsed === 'object' && parsed !== null) {
      const dangerous = ['__proto__', 'constructor', 'prototype'];
      for (const key of dangerous) {
        if (key in parsed) {
          delete parsed[key];
        }
      }
    }

    const result = S.decodeUnknownExit(schema as any)(parsed);
    return Exit.isSuccess(result) ? Option.some(result.value as A) : Option.none();
  } catch {
    return Option.none();
  }
};

/**
 * Sanitizes and safely parses a JSON string, removing suspicious syntax elements that could
 * potentially result in JSON polyglot exploits or prototype pollution.
 *
 * @template T - The expected type of the parsed object
 * @param jsonString - The JSON string to sanitize and parse.
 * @returns The parsed JavaScript object if valid, or `null` if invalid.
 * @compliance NIST 800-53 SI-10 (Information Input Validation)
 *
 * @example
 * ```typescript
 * const obj = sanitizeJson<{ foo: string }>('{"foo":"bar"}');
 * // obj = { foo: 'bar' }
 * ```
 */
export const sanitizeJson = <T>(jsonString: string): T | null => {
  if (!jsonString || typeof jsonString !== 'string') {
    return null;
  }

  try {
    const sanitized = jsonString
      .replaceAll(/\)\s*\{/g, ') {}')
      .replaceAll(/\]\s*\{/g, '] {}')
      .replaceAll(/\}\s*\{/g, '} {}');

    const parsed = JSON.parse(sanitized) as T;

    if (typeof parsed === 'object' && parsed !== null) {
      const dangerous = ['__proto__', 'constructor', 'prototype'];
      for (const key of dangerous) {
        if (key in parsed) {
          delete (parsed as Record<string, unknown>)[key];
        }
      }
    }

    return parsed;
  } catch {
    return null;
  }
};

/**
 * Strips ANSI escape codes from a string.
 * Useful for cleaning terminal output before logging to files.
 *
 * @param text - The text potentially containing ANSI codes.
 * @returns The text with ANSI codes removed.
 *
 * @example
 * ```typescript
 * stripAnsi('\x1b[31mRed text\x1b[0m'); // 'Red text'
 * ```
 */
export const stripAnsi = (text: string): string => {
  if (!text || typeof text !== 'string') {
    return '';
  }
  // biome-ignore lint/suspicious/noControlCharactersInRegex: ANSI codes require control characters
  return text.replaceAll(/\x1b\[[0-9;]*m/g, '');
};

// ============================================
// PII Redaction Functions
// ============================================

/**
 * PII pattern definitions with Effect Schema validation
 * @compliance NIST 800-53 AU-3 (Content of Audit Records)
 */
const PII_PATTERNS = {
  ssn: { pattern: /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g, marker: '[SSN]' },
  creditCard: { pattern: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g, marker: '[CREDIT_CARD]' },
  creditCardAlt: { pattern: /\b\d{15,16}\b/g, marker: '[CREDIT_CARD]' },
  email: { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, marker: '[EMAIL]' },
  phone: { pattern: /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, marker: '[PHONE]' },
  ipv4: { pattern: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g, marker: '[IP_ADDRESS]' },
  ipv6: { pattern: /\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b/g, marker: '[IP_ADDRESS]' },
  date: {
    pattern: /\b(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2})\b/g,
    marker: '[DATE]',
  },
} as const;

/**
 * Redacts PII from text using Effect Schema validated options.
 *
 * @param text - The text to redact PII from.
 * @param options - Configuration options for redaction.
 * @returns Exit containing redacted text or error.
 * @compliance NIST 800-53 AU-3 (Content of Audit Records)
 */
export const redactPIIEffect = (
  text: string,
  options: PIIRedactionOptions = {},
): Exit.Exit<string, unknown> => {
  const parsed = S.decodeUnknownExit(PIIRedactionOptionsSchema)(options);
  if (Exit.isFailure(parsed)) return parsed as unknown as Exit.Exit<string, unknown>;

  const {
    redactEmails = true,
    redactPhones = true,
    redactSSN = true,
    redactCreditCards = true,
    redactIPs = true,
    redactDates = false,
  } = parsed.value;

  let result = text;

  if (redactSSN) {
    result = result.replaceAll(PII_PATTERNS.ssn.pattern, PII_PATTERNS.ssn.marker);
  }

  if (redactCreditCards) {
    result = result.replaceAll(PII_PATTERNS.creditCard.pattern, PII_PATTERNS.creditCard.marker);
    result = result.replaceAll(PII_PATTERNS.creditCardAlt.pattern, PII_PATTERNS.creditCardAlt.marker);
  }

  if (redactEmails) {
    result = result.replaceAll(PII_PATTERNS.email.pattern, PII_PATTERNS.email.marker);
  }

  if (redactPhones) {
    result = result.replaceAll(PII_PATTERNS.phone.pattern, PII_PATTERNS.phone.marker);
  }

  if (redactIPs) {
    result = result.replaceAll(PII_PATTERNS.ipv4.pattern, PII_PATTERNS.ipv4.marker);
    result = result.replaceAll(PII_PATTERNS.ipv6.pattern, PII_PATTERNS.ipv6.marker);
  }

  if (redactDates) {
    result = result.replaceAll(PII_PATTERNS.date.pattern, PII_PATTERNS.date.marker);
  }

  return Exit.succeed(result);
};

/**
 * Redacts common PII patterns in a string for safe logging.
 * Detects and masks SSNs, credit cards, emails, phone numbers, etc.
 *
 * @param text - The text to redact PII from.
 * @param options - Configuration options for redaction.
 * @returns The text with PII patterns replaced with redaction markers.
 * @compliance NIST 800-53 AU-3 (Content of Audit Records)
 *
 * @example
 * ```typescript
 * redactPII('Contact john@example.com or call 555-123-4567');
 * // 'Contact [EMAIL] or call [PHONE]'
 *
 * redactPII('SSN: 123-45-6789');
 * // 'SSN: [SSN]'
 * ```
 */
export const redactPII = (
  text: string,
  options: {
    redactEmails?: boolean;
    redactPhones?: boolean;
    redactSSN?: boolean;
    redactCreditCards?: boolean;
    redactIPs?: boolean;
    customPatterns?: Array<{ pattern: RegExp; replacement: string }>;
  } = {},
): string => {
  if (!text || typeof text !== 'string') {
    return '';
  }

  const {
    redactEmails = true,
    redactPhones = true,
    redactSSN = true,
    redactCreditCards = true,
    redactIPs = true,
    customPatterns = [],
  } = options;

  const result = redactPIIEffect(text, {
    redactEmails,
    redactPhones,
    redactSSN,
    redactCreditCards,
    redactIPs,
  });

  let output = Exit.isSuccess(result) ? result.value : text;

  for (const { pattern, replacement } of customPatterns) {
    output = output.replaceAll(pattern, replacement);
  }

  return output;
};

/**
 * Creates a safe string representation of an object for logging,
 * automatically redacting sensitive fields.
 *
 * @param obj - The object to stringify.
 * @param sensitiveKeys - Array of key names to redact.
 * @param indent - JSON indentation (default: 2).
 * @returns A JSON string with sensitive values redacted.
 * @compliance NIST 800-53 AU-3 (Content of Audit Records)
 *
 * @example
 * ```typescript
 * safeStringify({ user: 'john', password: 'secret123' }, ['password']);
 * // '{\n  "user": "john",\n  "password": "[REDACTED]"\n}'
 * ```
 */
export const safeStringify = (
  obj: unknown,
  sensitiveKeys: string[] = [
    'password',
    'token',
    'apiKey',
    'secret',
    'authorization',
    'cookie',
    'ssn',
    'creditCard',
  ],
  indent = 2,
): string => {
  const sensitiveKeysLower = new Set(sensitiveKeys.map((k) => k.toLowerCase()));

  const replacer = (_key: string, value: unknown): unknown => {
    if (_key && sensitiveKeysLower.has(_key.toLowerCase())) {
      return '[REDACTED]';
    }
    return value;
  };

  try {
    return JSON.stringify(obj, replacer, indent);
  } catch {
    return '[Unable to stringify object]';
  }
};

// ============================================
// Validation Helpers
// ============================================

/**
 * Validates if a string is a valid email address using Effect Schema.
 *
 * @param email - The string to validate.
 * @returns true if valid email, false otherwise.
 */
export const isValidEmail = (email: string): boolean => {
  return Exit.isSuccess(S.decodeUnknownExit(EmailSchema)(email));
};

/**
 * Validates if a string is a valid phone number using Effect Schema.
 *
 * @param phone - The string to validate.
 * @returns true if valid phone number, false otherwise.
 */
export const isValidPhone = (phone: string): boolean => {
  return Exit.isSuccess(S.decodeUnknownExit(PhoneNumberSchema)(phone));
};

/**
 * Validates if a string is a valid SSN using Effect Schema.
 *
 * @param ssn - The string to validate.
 * @returns true if valid SSN, false otherwise.
 */
export const isValidSSN = (ssn: string): boolean => {
  return Exit.isSuccess(S.decodeUnknownExit(SSNSchema)(ssn));
};

/**
 * Validates if a string is a safe URL using Effect Schema.
 *
 * @param url - The string to validate.
 * @returns true if valid and safe URL, false otherwise.
 */
export const isValidUrl = (url: string): boolean => {
  return Exit.isSuccess(S.decodeUnknownExit(SafeUrlSchema)(url));
};
