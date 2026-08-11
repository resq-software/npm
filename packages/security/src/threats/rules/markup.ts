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
 * @fileoverview Document- and prompt-level signatures: XML/XXE, server-side template
 * and SSI injection, LLM prompt injection, plus the small set of universal rules that
 * apply in every context because no legitimate input needs them.
 *
 * XXE and SSTI are configuration weaknesses, not filtering ones. XXE is prevented by
 * disabling DTD processing and external entity resolution in the parser; SSTI is
 * prevented by passing untrusted values as template *data* rather than splicing them
 * into template *source*. Both rule groups exist to catch a payload that a
 * misconfigured parser or a `renderString(userInput)` call would otherwise execute.
 *
 * @module @resq-systems/security/threats/rules/markup
 */

import { ALL_THREAT_CONTEXTS, type ThreatRule } from "../types.js";

//#region XML / XXE

/** Repeated across every XML rule. */
const XML_CONTROL =
	"Disable DTD processing and external entity resolution in the XML parser (noent:false, resolveExternals:false)";

/** XML external entity and entity-expansion signatures. */
export const XML_INJECTION_RULES: readonly ThreatRule[] = [
	{
		id: "XML-ENTITY-DECL-001",
		type: "xml_injection",
		contexts: ["xml"],
		severity: "critical",
		confidence: "high",
		description: "Inline ENTITY declaration",
		cwe: 611,
		primaryControl: XML_CONTROL,
		pattern: /<!ENTITY\b/i,
	},
	{
		id: "XML-EXTERNAL-ID-001",
		type: "xml_injection",
		contexts: ["xml"],
		severity: "critical",
		confidence: "high",
		description: "SYSTEM or PUBLIC external identifier",
		cwe: 611,
		primaryControl: XML_CONTROL,
		pattern: /\b(?:SYSTEM|PUBLIC)\s+["']/,
	},
	{
		id: "XML-DOCTYPE-001",
		type: "xml_injection",
		contexts: ["xml"],
		severity: "high",
		confidence: "high",
		description: "DOCTYPE declaration in untrusted XML",
		cwe: 611,
		primaryControl: XML_CONTROL,
		pattern: /<!DOCTYPE\b/i,
	},
	{
		id: "XML-XINCLUDE-001",
		type: "xml_injection",
		contexts: ["xml"],
		severity: "high",
		confidence: "high",
		description: "XInclude directive — an entity-free route to the same file read",
		cwe: 611,
		primaryControl: XML_CONTROL,
		pattern: /<\s{0,8}xi:include\b|www\.w3\.org\/2001\/XInclude/i,
	},
	{
		id: "XML-CDATA-001",
		type: "xml_injection",
		contexts: ["xml"],
		severity: "low",
		confidence: "low",
		description: "CDATA section, used to smuggle markup past naive filters",
		cwe: 91,
		primaryControl: XML_CONTROL,
		pattern: /<!\[CDATA\[/,
	},
];

//#endregion

//#region Template injection

/** Repeated across most template-injection rules. */
const SSTI_CONTROL =
	"Pass untrusted values as template data (context variables), never as template source; render with autoescaping on";

/** Server-side template injection and SSI directives. */
export const TEMPLATE_INJECTION_RULES: readonly ThreatRule[] = [
	{
		id: "SSTI-SANDBOX-ESCAPE-001",
		type: "template_injection",
		contexts: ["template"],
		severity: "critical",
		confidence: "high",
		description: "Python object-graph traversal used to escape a template sandbox",
		cwe: 1336,
		primaryControl: SSTI_CONTROL,
		pattern: /\b__(?:class|globals|subclasses|mro|builtins|import|base|init|reduce)__\b/,
	},
	{
		id: "SSTI-OGNL-001",
		type: "template_injection",
		contexts: ["template"],
		severity: "critical",
		confidence: "high",
		description: "OGNL/EL expression reaching a runtime execution class",
		cwe: 917,
		primaryControl: SSTI_CONTROL,
		pattern: /_memberAccess|\bRuntime\s{0,8}\.\s{0,8}getRuntime|\bProcessBuilder\b|@java\.lang\b/i,
	},
	{
		id: "SSTI-MUSTACHE-DELIMITER-001",
		type: "template_injection",
		contexts: ["template"],
		severity: "high",
		confidence: "medium",
		description: "Handlebars/Jinja/Twig expression delimiters",
		cwe: 1336,
		primaryControl: SSTI_CONTROL,
		// The inner class excludes `{` as well as `}`. With only `}` excluded, an
		// input of 100 000 `{` characters makes the engine consume 200 of them at
		// every start position and then backtrack — ~40ms per scan, measured by
		// tests/regex-safety.test.ts. Excluding `{` makes the failure immediate, and
		// costs nothing: a template expression does not contain a bare `{`.
		pattern: /\{\{[^{}]{0,200}\}\}/,
	},
	{
		id: "SSTI-STATEMENT-DELIMITER-001",
		type: "template_injection",
		contexts: ["template"],
		severity: "high",
		confidence: "medium",
		description: "Jinja/Twig statement delimiters",
		cwe: 1336,
		primaryControl: SSTI_CONTROL,
		pattern: /\{%[^%]{0,200}%\}/,
	},
	{
		id: "SSTI-EL-DELIMITER-001",
		type: "template_injection",
		contexts: ["template"],
		severity: "high",
		confidence: "medium",
		description: "JSP EL, Freemarker, or JS template-literal interpolation",
		cwe: 1336,
		primaryControl: SSTI_CONTROL,
		// `{` excluded from the inner class for the same reason as the rule above.
		pattern: /[$#]\{[^{}]{0,200}\}/,
	},
	{
		id: "SSI-DIRECTIVE-001",
		type: "template_injection",
		contexts: ["template", "html"],
		severity: "critical",
		confidence: "high",
		description: "Server-side include directive",
		cwe: 97,
		primaryControl:
			"Disable server-side includes, or serve untrusted content from a path with SSI turned off",
		pattern: /<!--#\s{0,8}(?:exec|include|echo|config|fsize|flastmod|printenv|set)\b/i,
	},
	{
		id: "SSTI-SCRIPTLET-DELIMITER-001",
		type: "template_injection",
		// `template` only. A scriptlet spliced into an already-rendered response does
		// not execute — only template *source* is an execution path. SSI-DIRECTIVE-001
		// is in both because Apache and nginx post-process served HTML; no equivalent
		// stage exists for ERB, JSP, ASP, or EJS.
		contexts: ["template"],
		severity: "high",
		confidence: "medium",
		description: "ERB / JSP / ASP / EJS scriptlet delimiters",
		cwe: 1336,
		primaryControl: SSTI_CONTROL,
		pattern: /<%[=\-@#!]|<%[^%]{0,200}%>/,
	},
	{
		id: "SSTI-FREEMARKER-DIRECTIVE-001",
		type: "template_injection",
		contexts: ["template"],
		severity: "high",
		confidence: "high",
		description: "FreeMarker directive or user-defined directive call",
		cwe: 1336,
		primaryControl: SSTI_CONTROL,
		pattern:
			/<#\s{0,8}(?:assign|list|if|else|import|include|macro|function|setting|attempt|global|local|nested|recurse|switch|visit|compress|noparse|outputformat)\b|<@[\w.$]{1,64}\s{0,8}\(/i,
	},
	{
		id: "SSTI-VELOCITY-DIRECTIVE-001",
		type: "template_injection",
		contexts: ["template"],
		severity: "high",
		confidence: "medium",
		description: "Velocity directive",
		cwe: 1336,
		primaryControl: SSTI_CONTROL,
		pattern: /#(?:set|parse|evaluate|macro|foreach|include)\s{0,8}\(/i,
	},
	{
		id: "SSTI-DOTNET-REFLECTION-001",
		type: "template_injection",
		contexts: ["template"],
		severity: "critical",
		confidence: "high",
		description: "Razor/.NET expression reaching a process or assembly-loading class",
		cwe: 1336,
		primaryControl: SSTI_CONTROL,
		// A bare Razor `@(` / `@{` delimiter rule was rejected: two characters of common
		// punctuation that matched Objective-C literals and `@media` queries. This
		// targets capability reach instead, mirroring how SSTI-OGNL-001 handles Java.
		// `Process\.Start` is required literally — the spaced form matched the sentence
		// "Our deployment process. Start(ing) Monday".
		pattern:
			/\bSystem\.Diagnostics\.Process|\bProcess\.Start\s{0,8}\(|\bActivator\.CreateInstance\s{0,8}\(|\bAssembly\.Load\s{0,8}\(/i,
	},
	{
		id: "SSTI-NODE-REQUIRE-001",
		type: "template_injection",
		contexts: ["template"],
		severity: "critical",
		confidence: "high",
		description: "Node module-graph traversal reaching a process or filesystem module",
		cwe: 1336,
		primaryControl: SSTI_CONTROL,
		pattern:
			/\bprocess\s{0,8}\.\s{0,8}(?:mainModule|binding|constructor)\b|\brequire\s{0,8}\(\s{0,8}["'](?:node:)?(?:child_process|fs|vm|os)["']/i,
	},
	{
		id: "SSTI-SMARTY-PHP-001",
		type: "template_injection",
		contexts: ["template"],
		severity: "critical",
		confidence: "high",
		description: "Smarty {php} tag",
		cwe: 94,
		primaryControl: "Disable the {php} tag; it was removed entirely in Smarty 4",
		pattern: /\{\s{0,8}\/?\s{0,8}php\s{0,8}\}/i,
	},
];

//#endregion

//#region Prompt injection

/** Repeated across every prompt-injection rule. */
const PROMPT_CONTROL =
	"Keep untrusted content in a clearly delimited data channel, constrain tool scopes, and require confirmation for consequential tool calls";

/**
 * LLM prompt injection.
 *
 * These are the weakest signatures in the catalog by construction — prompt injection
 * is expressed in natural language, so no finite pattern set bounds it. They are
 * graded accordingly (mostly `medium` confidence) and are useful as telemetry and as
 * a tripwire for human review, never as an authorization decision.
 */
export const PROMPT_INJECTION_RULES: readonly ThreatRule[] = [
	{
		id: "PROMPT-OVERRIDE-001",
		type: "prompt_injection",
		contexts: ["llm_prompt"],
		severity: "high",
		confidence: "medium",
		description: "Instruction to disregard prior directives",
		cwe: 1427,
		primaryControl: PROMPT_CONTROL,
		pattern:
			/\b(?:ignore|disregard|forget|override|bypass)\s+(?:all\s+|any\s+|the\s+|your\s+|previous\s+|prior\s+|earlier\s+|above\s+){0,3}(?:instructions?|prompts?|rules?|directions?|guidelines?|constraints?)\b/i,
	},
	{
		id: "PROMPT-DELIMITER-SPOOF-001",
		type: "prompt_injection",
		contexts: ["llm_prompt"],
		severity: "high",
		confidence: "high",
		description: "Chat-template control token forged in user content",
		cwe: 1427,
		primaryControl: PROMPT_CONTROL,
		pattern: /<\|(?:im_start|im_end|endoftext|system|user|assistant|channel)\|>/i,
	},
	{
		id: "PROMPT-ROLE-SPOOF-001",
		type: "prompt_injection",
		contexts: ["llm_prompt"],
		severity: "medium",
		confidence: "medium",
		description: "Line beginning with a conversational role label",
		cwe: 1427,
		primaryControl: PROMPT_CONTROL,
		pattern: /^\s{0,8}(?:system|assistant|developer|tool)\s{0,8}:/im,
	},
	{
		id: "PROMPT-EXFIL-001",
		type: "prompt_injection",
		contexts: ["llm_prompt"],
		severity: "high",
		confidence: "medium",
		description: "Request to disclose the system prompt or hidden instructions",
		cwe: 1427,
		primaryControl: PROMPT_CONTROL,
		pattern:
			/\b(?:reveal|repeat|print|output|show|display|summarize)\s+(?:me\s+)?(?:your|the)\s+(?:system\s+|initial\s+|original\s+|hidden\s+){0,2}(?:prompt|instructions?|rules?|directives?)\b/i,
	},
	{
		id: "PROMPT-TOOL-COERCION-001",
		type: "prompt_injection",
		contexts: ["llm_prompt"],
		severity: "high",
		confidence: "medium",
		description: "Directive coercing a specific tool or function invocation",
		cwe: 1427,
		primaryControl: PROMPT_CONTROL,
		pattern:
			/\b(?:you\s+must|always|immediately|be\s+sure\s+to)\s+(?:call|invoke|run|use|execute)\s+(?:the\s+)?[\w.-]{1,64}\s+(?:tool|function|command|api)\b/i,
	},
];

//#endregion

//#region Universal

/**
 * Every sink. An invisible formatting character has no legitimate place in a value
 * bound to any of them.
 *
 * This list previously excluded `sql`, `shell`, `ldap` and the other machine-syntax
 * sinks, on the stated grounds that those "get the stricter {@link UNIVERSAL_RULES}
 * bidi and control-character rules instead". Mutation testing showed that reasoning was
 * wrong: the bidi rule matches only U+202A-202E and U+2066-2069, and the control-character
 * rule only C0/C1 — neither matches U+200B. A zero-width space inside a SQL keyword
 * therefore raised **no finding at all**, and `1 U<ZWSP>NION SELECT` scored zero.
 *
 * The severity stays `medium`/`medium` rather than rising, because at the human-text
 * sinks the same code points are orthographic in Persian and Hindi and structural in
 * every ZWJ emoji sequence. The finding is raised everywhere; the verdict is left to
 * scoring.
 */
const INVISIBLE_CONTEXTS = [
	"general_text",
	"html",
	"identifier",
	"object_merge",
	"url",
	"url_parameter",
	"sql",
	"nosql",
	"shell",
	"filesystem",
	"ldap",
	"xpath",
	"xml",
	"template",
	"spreadsheet",
	"jwt",
	"http_header",
	"log",
	"llm_prompt",
] as const;

/**
 * Rules that apply in every context, including `general_text`.
 *
 * The bar for membership is high: a rule belongs here only if there is no legitimate
 * reason for the character to appear in *any* user-supplied value. Bidirectional
 * overrides (the "Trojan Source" class, CVE-2021-42574), zero-width characters used
 * to spoof identity, and C0 control characters all clear it. SQL keywords and `../`
 * emphatically do not, which is why they are context-scoped instead.
 */
export const UNIVERSAL_RULES: readonly ThreatRule[] = [
	{
		id: "UNICODE-BIDI-OVERRIDE-001",
		type: "homoglyph",
		contexts: ALL_THREAT_CONTEXTS,
		severity: "critical",
		confidence: "high",
		description:
			"Bidirectional override character — reorders rendered text away from its logical order",
		cwe: 451,
		primaryControl: "Reject bidi controls outright, or render with them stripped",
		pattern: /[\u202a-\u202e\u2066-\u2069]/,
	},
	{
		id: "UNICODE-INVISIBLE-001",
		type: "homoglyph",
		contexts: INVISIBLE_CONTEXTS,
		severity: "medium",
		confidence: "medium",
		description: "Zero-width or invisible formatting character",
		cwe: 1007,
		primaryControl: "Strip default-ignorable code points before comparison or storage",
		pattern: /[\u00ad\u200b-\u200f\u2060-\u2064\ufeff]/,
	},
	{
		id: "UNICODE-INVISIBLE-IDENTIFIER-001",
		type: "homoglyph",
		// Scoped to identifiers alone, and graded harder than UNICODE-INVISIBLE-001.
		// ZWNJ and ZWJ are required for correct Persian and Hindi rendering and appear
		// in ordinary emoji sequences, so the general rule stays at medium/medium. In a
		// username, domain, or package name there is no such defence: an invisible
		// character exists only to make two different identifiers render alike.
		contexts: ["identifier"],
		severity: "high",
		confidence: "medium",
		description: "Invisible formatting character in a protected identifier",
		cwe: 1007,
		primaryControl:
			"Strip default-ignorable code points, then compare UTS #39 skeletons at registration time",
		pattern: /[\u00ad\u200b-\u200f\u2060-\u2064\ufeff]/,
	},
	{
		id: "CONTROL-CHAR-001",
		type: "resource_abuse",
		contexts: ALL_THREAT_CONTEXTS,
		severity: "medium",
		confidence: "medium",
		description: "C0/C1 control character other than tab, CR, or LF",
		cwe: 74,
		primaryControl: "Reject or strip control characters at the trust boundary",
		// biome-ignore lint/suspicious/noControlCharactersInRegex: detecting control characters is this rule's entire purpose
		pattern: /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/,
	},
];

//#endregion
