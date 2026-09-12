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
 * @fileoverview Host-facing signatures: OS command injection, path traversal, file
 * inclusion, and server-side request forgery.
 *
 * Two of these categories are only weakly served by signatures, and the rules say so
 * in their `primaryControl`:
 *
 * - **Path traversal** is prevented by canonicalizing the candidate path and
 *   verifying it stays beneath the allowed base directory — see `resolveContainedPath`
 *   in `@resq-systems/security/paths`. Detection catches `../`; it does not catch a
 *   symlink, nor an absolute path that happens to resolve inside the base.
 * - **SSRF** is prevented by parsing the URL, resolving the host, rejecting private
 *   and link-local ranges, re-validating after every redirect, and constraining
 *   network egress. A regex over the URL string catches a literal `127.0.0.1` but
 *   never a hostname whose DNS record points there.
 *
 * @module @resq-systems/security/threats/rules/system
 */

import type { ThreatRule } from "../types.js";

//#region Command injection

/** Repeated across every command-injection rule. */
const CMD_CONTROL =
	"Spawn with an argv array and shell:false; never build a shell string from input";

/** OS command injection. Scoped to the `shell` context — never runs elsewhere. */
export const COMMAND_INJECTION_RULES: readonly ThreatRule[] = [
	{
		id: "CMD-SUBSTITUTION-001",
		type: "command_injection",
		contexts: ["shell"],
		severity: "critical",
		confidence: "high",
		description: "Shell command substitution $(...)",
		cwe: 78,
		primaryControl: CMD_CONTROL,
		// `(` excluded alongside `)` so a run of `$(` cannot make the engine consume
		// 200 characters and backtrack at every position. A nested `$(a $(b))` still
		// matches on the inner substitution.
		pattern: /\$\([^()]{1,200}\)/,
	},
	{
		id: "CMD-BACKTICK-001",
		type: "command_injection",
		contexts: ["shell"],
		severity: "high",
		confidence: "medium",
		description: "Backtick command substitution",
		cwe: 78,
		primaryControl: CMD_CONTROL,
		pattern: /`[^`]{1,200}`/,
	},
	{
		id: "CMD-CHAIN-001",
		type: "command_injection",
		contexts: ["shell"],
		severity: "critical",
		confidence: "high",
		description: "Command separator followed by a state-changing or network command",
		cwe: 78,
		primaryControl: CMD_CONTROL,
		pattern:
			/[;&|]{1,2}\s{0,8}(?:rm|del|cat|type|wget|curl|nc|ncat|bash|sh|zsh|powershell|pwsh|python[23]?|perl|ruby|chmod|chown|kill|shutdown|reboot|mkfifo|base64|openssl)\b/i,
	},
	{
		id: "CMD-PIPE-SHELL-001",
		type: "command_injection",
		contexts: ["shell"],
		severity: "critical",
		confidence: "high",
		description: "Output piped into a shell interpreter",
		cwe: 78,
		primaryControl: CMD_CONTROL,
		pattern: /\|\s{0,8}(?:sh|bash|zsh|dash|cmd|powershell|pwsh)\b/i,
	},
	{
		id: "CMD-REDIRECT-SYSTEM-001",
		type: "command_injection",
		contexts: ["shell"],
		severity: "high",
		confidence: "high",
		description: "Redirection into a system directory",
		cwe: 78,
		primaryControl: CMD_CONTROL,
		pattern: />\s{0,8}\/(?:etc|dev|proc|sys|boot)\//,
	},
	{
		// Commix documents both as filter bypasses against defences that block spaces:
		// each expands to a word separator, so a command survives a filter that only
		// looks for whitespace between tokens.
		id: "CMD-WORD-SPLIT-001",
		type: "command_injection",
		contexts: ["shell"],
		severity: "high",
		confidence: "medium",
		description: "Shell word-splitting construct standing in for a space",
		cwe: 78,
		primaryControl: CMD_CONTROL,
		pattern: /\$\{IFS\}|\{\s{0,4},\s{0,4}\}/,
	},
	{
		// The shell removes an empty quote pair before execution, so a command name split
		// by one still runs while defeating a literal match on that name.
		//
		// Deliberately narrower than Commix's full set: the equivalent backslash form is
		// NOT matched, because it is indistinguishable from an ordinary Windows-style
		// relative path, and a rule firing on those would be disabled by the first person
		// it inconvenienced.
		id: "CMD-QUOTE-SPLIT-001",
		type: "command_injection",
		contexts: ["shell"],
		severity: "medium",
		confidence: "medium",
		description: "Empty quote pair inside a word, removed by the shell before execution",
		cwe: 78,
		primaryControl: CMD_CONTROL,
		pattern: /[a-z](?:""|'')[a-z]/i,
	},
	{
		id: "CMD-ENV-EXPANSION-001",
		type: "command_injection",
		contexts: ["shell"],
		severity: "medium",
		confidence: "low",
		description: "Shell parameter expansion",
		cwe: 78,
		primaryControl: CMD_CONTROL,
		// `{` excluded alongside `}` for the same backtracking reason as above.
		pattern: /\$\{[^{}]{1,200}\}/,
	},
	{
		id: "CMD-ARG-NEWLINE-001",
		type: "command_injection",
		contexts: ["shell"],
		severity: "medium",
		confidence: "medium",
		description: "Line break in a value destined for a command line",
		cwe: 88,
		primaryControl: CMD_CONTROL,
		pattern: /[\r\n]/,
	},
];

//#endregion

//#region Path traversal

/** Repeated across every path-traversal rule. */
const PATH_CONTROL =
	"Resolve the candidate against the base directory and verify containment (resolveContainedPath); resolve symlinks before use";

/** Directory-traversal and sensitive-path signatures. Scoped to `filesystem`. */
export const PATH_TRAVERSAL_RULES: readonly ThreatRule[] = [
	{
		id: "PATH-TRAVERSAL-001",
		type: "path_traversal",
		contexts: ["filesystem"],
		severity: "high",
		confidence: "high",
		description: "Parent-directory segment",
		cwe: 22,
		primaryControl: PATH_CONTROL,
		// Anchored to segment boundaries so `my..file/` and `v1..v2` do not fire.
		pattern: /(?:^|[/\\])\.\.(?:[/\\]|$)/,
	},
	{
		id: "PATH-TRAVERSAL-ENCODED-001",
		type: "path_traversal",
		contexts: ["filesystem", "url"],
		severity: "high",
		confidence: "high",
		description: "Percent-encoded parent-directory traversal",
		cwe: 22,
		primaryControl: PATH_CONTROL,
		// The previous catalog wrote `/%2e%2e[%2f%5c]/`, whose character class matches
		// a single character from {%, 2, f, 5, c} — so it fired on `%2e%2e%` and on
		// `%2e%2e2`, and expressed nothing about the intended separator alternation.
		pattern: /%2e%2e(?:%2f|%5c|\/|\\)/i,
		variants: ["raw"],
	},
	{
		id: "PATH-TRAVERSAL-MIXED-ENCODED-001",
		type: "path_traversal",
		contexts: ["filesystem", "url"],
		severity: "high",
		confidence: "high",
		description: "Literal dots with a percent-encoded separator",
		cwe: 22,
		primaryControl: PATH_CONTROL,
		pattern: /\.\.(?:%2f|%5c)/i,
		variants: ["raw"],
	},
	{
		id: "PATH-TRAVERSAL-DOUBLE-ENCODED-001",
		type: "path_traversal",
		contexts: ["filesystem", "url"],
		severity: "high",
		confidence: "high",
		description: "Double percent-encoded parent-directory traversal",
		cwe: 22,
		primaryControl: PATH_CONTROL,
		pattern: /%252e%252e(?:%252f|%255c)/i,
		variants: ["raw"],
	},
	{
		id: "PATH-TRAVERSAL-OVERLONG-UTF8-001",
		type: "path_traversal",
		contexts: ["filesystem", "url"],
		severity: "high",
		confidence: "high",
		description: "Overlong UTF-8 encoding of a path separator",
		cwe: 22,
		primaryControl: PATH_CONTROL,
		pattern: /%c0%(?:af|2f)|%e0%80%af|%c1%9c/i,
		variants: ["raw"],
	},
	{
		id: "PATH-NULL-BYTE-001",
		type: "path_traversal",
		contexts: ["filesystem", "url"],
		severity: "high",
		confidence: "high",
		description: "NUL byte, used to truncate a path before its extension check",
		cwe: 158,
		primaryControl: PATH_CONTROL,
		// biome-ignore lint/suspicious/noControlCharactersInRegex: matching the NUL byte is this rule's entire purpose
		pattern: /%00|\u0000/,
	},
	{
		id: "PATH-TRAVERSAL-FILTER-STRIP-001",
		type: "path_traversal",
		contexts: ["filesystem", "url"],
		severity: "high",
		confidence: "medium",
		description: "Dot run that survives a naive ../ stripping filter",
		cwe: 22,
		primaryControl:
			"Resolve the candidate against the base directory and verify containment (resolveContainedPath). Never sanitize by stripping '../' — stripping is precisely what this payload targets: '....//' becomes '../' after one pass.",
		// PATH-TRAVERSAL-001 requires exactly two dots between boundaries, so `....//`
		// and `.../` walked past it. Bounded at 200 because a longer run is already
		// reported by the engine's repetition check.
		pattern: /(?:^|[/\\])\.{3,200}[/\\]/,
	},
	{
		id: "PATH-TRAVERSAL-PARAM-BYPASS-001",
		type: "path_traversal",
		contexts: ["filesystem", "url"],
		severity: "high",
		confidence: "high",
		description: "Path parameter segment used to bypass a gateway path ACL",
		cwe: 22,
		primaryControl:
			"Ensure the proxy and the origin agree on path normalization before authorization is applied; resolve and verify containment with resolveContainedPath",
		// `..;/` — Tomcat and Spring treat `;` as starting a path parameter, so the
		// segment normalizes to `..` at the origin while the gateway sees a literal name.
		pattern: /(?:^|[/\\])\.\.;[^/\\]{0,64}[/\\]/,
	},
	{
		id: "PATH-SENSITIVE-UNIX-001",
		type: "path_traversal",
		contexts: ["filesystem"],
		severity: "high",
		confidence: "medium",
		description: "Reference to a sensitive Unix path",
		cwe: 22,
		primaryControl: PATH_CONTROL,
		pattern: /\/(?:etc\/(?:passwd|shadow|sudoers|hosts)|proc\/self|root\/\.ssh)\b/i,
	},
	{
		id: "PATH-SENSITIVE-WINDOWS-001",
		type: "path_traversal",
		contexts: ["filesystem"],
		severity: "high",
		confidence: "medium",
		description: "Reference to a sensitive Windows path",
		cwe: 22,
		primaryControl: PATH_CONTROL,
		// Requires a system subdirectory. The old rule was a bare `/C:\\Windows/gi`,
		// which fired on any documentation that merely mentioned the folder.
		pattern: /[a-z]:[\\/]{1,2}(?:windows|winnt)[\\/]{1,2}(?:system32|win\.ini|repair)/i,
	},
	{
		id: "PATH-ABSOLUTE-001",
		type: "path_traversal",
		contexts: ["filesystem"],
		severity: "medium",
		confidence: "low",
		description: "Absolute path where a relative one is expected",
		cwe: 36,
		primaryControl: PATH_CONTROL,
		pattern: /^(?:\/|[a-z]:[\\/]|\\\\)/i,
	},
];

//#endregion

//#region File inclusion

/** Repeated across every file-inclusion rule. */
const LFI_CONTROL =
	"Map the request to a fixed allowlist of loadable resources; never derive a module or template path from input";

/** Adds the remote-fetch half of the control, for the RFI rules. */
const RFI_CONTROL =
	"Map the request to a fixed allowlist of loadable resources; never derive a module, template, or file path from input. Disable remote stream wrappers (PHP allow_url_fopen/allow_url_include) and reject any candidate not relative to the configured base directory";

/** Local/remote file inclusion via stream wrappers and alternate schemes. */
export const FILE_INCLUSION_RULES: readonly ThreatRule[] = [
	{
		id: "LFI-PHP-WRAPPER-001",
		type: "file_inclusion",
		contexts: ["filesystem", "url"],
		severity: "critical",
		confidence: "high",
		description: "PHP stream wrapper used to read or execute source",
		cwe: 98,
		primaryControl: LFI_CONTROL,
		pattern: /\bphp:\/\/(?:filter|input|memory|temp|stdin)/i,
	},
	{
		id: "LFI-WRAPPER-001",
		type: "file_inclusion",
		contexts: ["filesystem", "url"],
		severity: "high",
		confidence: "high",
		description: "Alternate stream wrapper capable of loading remote or archived content",
		cwe: 98,
		primaryControl: LFI_CONTROL,
		pattern: /\b(?:expect|zip|phar|glob|dict|gopher|netdoc|jar|ogg):\/\//i,
	},
	{
		id: "RFI-REMOTE-SCHEME-001",
		type: "file_inclusion",
		// `filesystem` only. The SSRF rules already own `url`; this is about a value
		// that was supposed to be a *path* and instead names a remote resource.
		contexts: ["filesystem"],
		severity: "high",
		confidence: "high",
		description: "Remote scheme where a local path was expected",
		cwe: 98,
		primaryControl: RFI_CONTROL,
		pattern:
			/(?:^\s{0,8}|[/\\=])(?:https?|ftps?|smb|cifs|nfs|webdav|ssh2|rar|zlib|compress\.(?:zlib|bzip2)):\/\//i,
	},
	{
		id: "RFI-DATA-URI-001",
		type: "file_inclusion",
		contexts: ["filesystem"],
		severity: "high",
		confidence: "high",
		description: "data: URI where a local path was expected",
		cwe: 98,
		primaryControl: RFI_CONTROL,
		// The class is ordered `[a-z0-9+.-]` deliberately: writing `[a-z0-9.+-]` embeds
		// the literal substring `.+`, which the ReDoS structural test rejects.
		pattern:
			/(?:^\s{0,8}|[/\\=])data:(?:\/\/)?(?:[a-z][a-z0-9+.-]{0,32}\/[a-z0-9+.-]{1,32}[a-z0-9;=+.-]{0,32}|;base64|),/i,
	},
	{
		id: "RFI-REMOTE-HOST-PATH-001",
		type: "file_inclusion",
		contexts: ["filesystem"],
		severity: "high",
		confidence: "medium",
		description: "Protocol-relative or UNC host path where a local path was expected",
		cwe: 98,
		primaryControl: RFI_CONTROL,
		// Re-grades rather than newly detects: PATH-ABSOLUTE-001 already matches these
		// at low confidence, contributing 1.0 — not enough to leave the allow band.
		pattern: /^\s{0,8}(?:\/\/|\\\\)[a-z0-9][a-z0-9-]{0,62}(?:\.[a-z0-9-]{1,63}){1,4}[/\\]/i,
	},
];

//#endregion

//#region SSRF

/** Repeated across every SSRF rule. */
const SSRF_CONTROL =
	"Gate the request with assertOutboundUrl, re-validate after every redirect, and constrain egress at the network layer";

/**
 * Server-side request forgery.
 *
 * These signatures cover literal addresses only. A hostname whose DNS record
 * resolves to `169.254.169.254` passes every rule here — which is exactly why
 * {@link SSRF_CONTROL} names resolution and egress control as the real defense.
 */
export const SSRF_RULES: readonly ThreatRule[] = [
	{
		id: "SSRF-LOOPBACK-001",
		type: "ssrf",
		contexts: ["url"],
		severity: "high",
		confidence: "high",
		description: "URL host is a loopback address",
		cwe: 918,
		primaryControl: SSRF_CONTROL,
		pattern: /\/\/(?:127(?:\.\d{1,3}){3}|localhost|0\.0\.0\.0|\[?::1\]?)(?::\d{1,5})?(?:[/?#]|$)/i,
	},
	{
		id: "SSRF-PRIVATE-RANGE-001",
		type: "ssrf",
		contexts: ["url"],
		severity: "high",
		confidence: "high",
		description: "URL host is in an RFC 1918 private range",
		cwe: 918,
		primaryControl: SSRF_CONTROL,
		pattern:
			/\/\/(?:10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2})/,
	},
	{
		id: "SSRF-METADATA-001",
		type: "ssrf",
		contexts: ["url"],
		severity: "critical",
		confidence: "high",
		description: "URL targets a cloud instance metadata endpoint",
		cwe: 918,
		primaryControl: SSRF_CONTROL,
		pattern: /\/\/(?:169\.254(?:\.\d{1,3}){2}|metadata\.google\.internal|metadata\.goog)\b/i,
	},
	{
		id: "SSRF-ALT-IP-ENCODING-001",
		type: "ssrf",
		contexts: ["url"],
		severity: "high",
		confidence: "high",
		description: "Host written as a decimal, octal, or hex integer to evade address filters",
		cwe: 918,
		primaryControl: SSRF_CONTROL,
		pattern: /\/\/(?:0x[0-9a-f]{6,8}|0\d{6,11}|\d{8,10})(?:[:/?#]|$)/i,
	},
	{
		id: "SSRF-USERINFO-001",
		type: "ssrf",
		contexts: ["url"],
		severity: "medium",
		confidence: "medium",
		description: "Userinfo segment, used to disguise the true host",
		cwe: 918,
		primaryControl: SSRF_CONTROL,
		pattern: /\/\/[^/@\s]{1,128}@/,
	},
	{
		id: "SSRF-NON-HTTP-SCHEME-001",
		type: "ssrf",
		contexts: ["url"],
		severity: "high",
		confidence: "high",
		description: "Non-HTTP scheme in a fetchable URL",
		cwe: 918,
		primaryControl: SSRF_CONTROL,
		pattern: /^\s{0,8}(?:file|gopher|dict|tftp|ldaps?|jar|netdoc|sftp):/i,
	},
	{
		id: "SSRF-USERINFO-INTERNAL-HOST-001",
		type: "ssrf",
		contexts: ["url"],
		severity: "high",
		confidence: "high",
		description: "Internal address in the host position behind a userinfo segment",
		cwe: 918,
		primaryControl: SSRF_CONTROL,
		// The textbook bypass. SSRF-LOOPBACK-001 and SSRF-METADATA-001 both anchor on
		// `//` immediately before the address, so `http://good.com@169.254.169.254/`
		// matched only the generic userinfo rule and scored 2.0 — an allow verdict on a
		// cloud-credential read.
		pattern:
			/@(?:127(?:\.\d{1,3}){3}|localhost|0\.0\.0\.0|169\.254(?:\.\d{1,3}){2}|10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2})(?=[:/?#]|$)/i,
	},
	{
		id: "SSRF-SUFFIXED-LOOPBACK-HOST-001",
		type: "ssrf",
		contexts: ["url"],
		severity: "high",
		confidence: "high",
		description: "Loopback literal used as a hostname prefix",
		cwe: 918,
		primaryControl: SSRF_CONTROL,
		pattern: /\/\/(?:127(?:\.\d{1,3}){3}|localhost|0\.0\.0\.0)\.[a-z]/i,
	},
	{
		id: "SSRF-METADATA-ALT-001",
		type: "ssrf",
		contexts: ["url"],
		severity: "critical",
		confidence: "high",
		description: "Alibaba Cloud or Oracle Cloud instance metadata endpoint",
		cwe: 918,
		primaryControl: SSRF_CONTROL,
		pattern: /\/\/(?:100\.100\.100\.200|192\.0\.0\.192)(?=[:/?#]|$)/,
	},
	{
		id: "SSRF-IPV6-INTERNAL-001",
		type: "ssrf",
		contexts: ["url"],
		severity: "high",
		confidence: "high",
		description: "IPv6 loopback, unique-local, or link-local literal",
		cwe: 918,
		primaryControl: SSRF_CONTROL,
		pattern:
			/(?:\/\/|@)\[(?:::|(?:0{1,4}:){2,7}0{0,3}[01]|f[cd][0-9a-f]{0,2}:[0-9a-f:]{0,32}|fe[89ab][0-9a-f]?:[0-9a-f:]{0,32})\]/i,
	},
	{
		id: "SSRF-IPV4-MAPPED-INTERNAL-001",
		type: "ssrf",
		contexts: ["url"],
		severity: "high",
		confidence: "high",
		description: "IPv4-mapped IPv6 literal carrying an internal address",
		cwe: 918,
		primaryControl: SSRF_CONTROL,
		pattern:
			/(?:\/\/|@)\[::ffff:(?:127\.|10\.|169\.254\.|192\.168\.|0\.0\.0\.0|172\.(?:1[6-9]|2\d|3[01])\.|7f[0-9a-f]{2}:|a9fe:|c0a8:)/i,
	},
	{
		id: "SSRF-SHORT-IP-FORM-001",
		type: "ssrf",
		contexts: ["url"],
		severity: "high",
		confidence: "medium",
		description: "Abbreviated or octal IPv4 form resolving to a loopback address",
		cwe: 918,
		primaryControl: SSRF_CONTROL,
		// `127.1`, `0`, and `0177.0.0.1` all resolve to loopback through inet_aton.
		pattern: /\/\/(?:127\.\d{1,3}(?:\.\d{1,3})?|0|0\d{2,3}(?:\.0*\d{1,3}){3})(?=[:/?#]|$)/,
	},
	{
		id: "SSRF-WILDCARD-DNS-HOST-001",
		type: "ssrf",
		contexts: ["url"],
		severity: "high",
		confidence: "high",
		description: "Wildcard-DNS service that resolves an arbitrary address from the hostname",
		cwe: 918,
		primaryControl: SSRF_CONTROL,
		// Coverage is incomplete by construction — a new wildcard-DNS service needs a
		// catalog edit. Host resolution plus egress control is what actually holds.
		pattern:
			/\/\/(?:[^/\s]{0,64}\.)?(?:nip\.io|sslip\.io|localtest\.me|lvh\.me|vcap\.me|xip\.io|localho\.st|traefik\.me)(?=[:/?#]|$)/i,
	},
];

//#endregion
