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
 * @fileoverview IP address classification and outbound-URL policy — the SSRF control
 * the detection rules name but cannot themselves provide.
 *
 * The signatures in `threats/rules/system.ts` match literal addresses. A hostname whose
 * DNS record resolves to `169.254.169.254` passes every one of them, which is why those
 * rules point here instead.
 *
 * @module @resq-systems/security/controls/address
 */

//#region Types

/**
 * What an address is reserved for, per the IANA special-purpose registries.
 *
 * `public` means "in no special-purpose range" — routable on the internet. Every other
 * value is a reason not to fetch it from a server.
 */
export type AddressClassification =
	| "unspecified"
	| "loopback"
	| "private"
	| "link_local"
	| "carrier_nat"
	| "multicast"
	| "broadcast"
	| "documentation"
	| "benchmarking"
	| "unique_local"
	| "teredo"
	| "six_to_four"
	| "nat64"
	| "reserved"
	| "public";

/** Why an outbound URL was refused. */
export type OutboundRejectionReason =
	/** Not parseable as a URL. */
	| "malformed"
	/** Scheme outside the permitted set. */
	| "protocol_not_allowed"
	/** Port outside the permitted set. */
	| "port_not_allowed"
	/** An IP literal in a range that is not publicly routable. */
	| "address_not_routable"
	/** A routable address, or a name, that policy does not permit. */
	| "host_not_allowed";

/** Outcome of {@link assertOutboundUrl}. */
export type OutboundUrlVerdict =
	| {
			readonly allowed: true;
			readonly url: URL;
			/** `null` when the host is a name rather than an IP literal. */
			readonly classification: AddressClassification | null;
	  }
	| { readonly allowed: false; readonly reason: OutboundRejectionReason };

/** Policy for {@link assertOutboundUrl}. */
export interface OutboundUrlPolicy {
	/**
	 * Hosts permitted regardless of classification, compared case-insensitively against
	 * the parsed host. The allowlist the OWASP cheat sheet asks for.
	 */
	readonly allowedHosts?: readonly string[];
	/** Schemes permitted. Defaults to `["https:"]`. */
	readonly allowedProtocols?: readonly string[];
	/** Ports permitted in addition to the scheme's default. Defaults to none. */
	readonly allowedPorts?: readonly number[];
	/**
	 * Permit any host not in a reserved range — every public address, and every name.
	 *
	 * Defaults to `false`, and that default is the point. A name is not an address: this
	 * function cannot know whether `metadata.example.com` resolves to a public address or
	 * to `169.254.169.254`. With no allowlist and this flag off, a name is refused.
	 * Turning it on converts the control from an allowlist into a denylist over literals
	 * only, which does not stop DNS from pointing inward.
	 */
	readonly allowPublicHosts?: boolean;
}

//#endregion

//#region Parsing

/** Four octets, or `null` when the text is not a dotted-quad IPv4 address. */
function parseIpv4(host: string): readonly number[] | null {
	const parts = host.split(".");
	if (parts.length !== 4) return null;

	const octets: number[] = [];
	for (const part of parts) {
		// Rejects empty, signed, hex, octal and over-long forms. `new URL` already
		// canonicalises those for a parsed hostname; this matters for a caller handing a
		// raw string straight to `classifyAddress`.
		if (part.length === 0 || part.length > 3 || !/^\d+$/.test(part)) return null;
		const value = Number(part);
		if (value > 255) return null;
		octets.push(value);
	}
	return octets;
}

/**
 * Eight 16-bit groups, or `null` when the text is not an IPv6 address.
 *
 * Accepts the bracketed, zero-compressed form `URL.hostname` produces, and the
 * dotted-quad tail of an IPv4-mapped address.
 */
function parseIpv6(host: string): readonly number[] | null {
	let text = host;
	if (text.startsWith("[") && text.endsWith("]")) text = text.slice(1, -1);

	// A zone identifier is not part of the address.
	const zone = text.indexOf("%");
	if (zone !== -1) text = text.slice(0, zone);

	if (!text.includes(":")) return null;

	// A trailing dotted quad contributes the final two groups.
	let tail: number[] = [];
	const lastColon = text.lastIndexOf(":");
	const suffix = text.slice(lastColon + 1);
	if (suffix.includes(".")) {
		const octets = parseIpv4(suffix);
		if (octets === null) return null;
		tail = [
			((octets[0] as number) << 8) | (octets[1] as number),
			((octets[2] as number) << 8) | (octets[3] as number),
		];
		text = text.slice(0, lastColon);
		if (!text.endsWith(":")) text += ":";
		text = text.slice(0, -1);
		if (text.length === 0) text = "::";
	}

	const halves = text.split("::");
	if (halves.length > 2) return null;

	const toGroups = (part: string): number[] | null => {
		if (part.length === 0) return [];
		const groups: number[] = [];
		for (const piece of part.split(":")) {
			if (piece.length === 0 || piece.length > 4 || !/^[0-9a-f]+$/i.test(piece)) return null;
			groups.push(Number.parseInt(piece, 16));
		}
		return groups;
	};

	const head = toGroups(halves[0] ?? "");
	if (head === null) return null;

	if (halves.length === 1) {
		const all = [...head, ...tail];
		return all.length === 8 ? all : null;
	}

	const rest = toGroups(halves[1] ?? "");
	if (rest === null) return null;

	const known = head.length + rest.length + tail.length;
	if (known > 8) return null;
	return [...head, ...(new Array(8 - known).fill(0) as number[]), ...rest, ...tail];
}

//#endregion

//#region Classification

/** IPv4 special-purpose ranges, as `[network, prefixLength, classification]`. */
const IPV4_RANGES: readonly (readonly [readonly number[], number, AddressClassification])[] = [
	[[0, 0, 0, 0], 8, "unspecified"],
	[[10, 0, 0, 0], 8, "private"],
	[[100, 64, 0, 0], 10, "carrier_nat"],
	[[127, 0, 0, 0], 8, "loopback"],
	[[169, 254, 0, 0], 16, "link_local"],
	[[172, 16, 0, 0], 12, "private"],
	[[192, 0, 2, 0], 24, "documentation"],
	[[192, 88, 99, 0], 24, "reserved"],
	[[192, 0, 0, 0], 24, "reserved"],
	[[192, 168, 0, 0], 16, "private"],
	[[198, 18, 0, 0], 15, "benchmarking"],
	[[198, 51, 100, 0], 24, "documentation"],
	[[203, 0, 113, 0], 24, "documentation"],
	[[224, 0, 0, 0], 4, "multicast"],
	[[255, 255, 255, 255], 32, "broadcast"],
	[[240, 0, 0, 0], 4, "reserved"],
];

/** IPv6 special-purpose ranges, as `[groups, prefixLength, classification]`. */
const IPV6_RANGES: readonly (readonly [readonly number[], number, AddressClassification])[] = [
	[[0, 0, 0, 0, 0, 0, 0, 1], 128, "loopback"],
	[[0, 0, 0, 0, 0, 0, 0, 0], 128, "unspecified"],
	[[0x64, 0xff9b, 0, 0, 0, 0, 0, 0], 96, "nat64"],
	[[0x100, 0, 0, 0, 0, 0, 0, 0], 64, "reserved"],
	[[0x2001, 0x0db8, 0, 0, 0, 0, 0, 0], 32, "documentation"],
	// Teredo. Absent from the first draft of this table, which classified it public.
	[[0x2001, 0, 0, 0, 0, 0, 0, 0], 32, "teredo"],
	[[0x2002, 0, 0, 0, 0, 0, 0, 0], 16, "six_to_four"],
	[[0xfc00, 0, 0, 0, 0, 0, 0, 0], 7, "unique_local"],
	[[0xfe80, 0, 0, 0, 0, 0, 0, 0], 10, "link_local"],
	[[0xff00, 0, 0, 0, 0, 0, 0, 0], 8, "multicast"],
];

/** Whether `parts` sits inside `network/prefix`, given `bits` per part. */
function withinPrefix(
	parts: readonly number[],
	network: readonly number[],
	prefix: number,
	bits: number,
): boolean {
	let remaining = prefix;
	for (let index = 0; index < parts.length && remaining > 0; index++) {
		const width = Math.min(bits, remaining);
		const shift = bits - width;
		if ((parts[index] as number) >>> shift !== (network[index] as number) >>> shift) return false;
		remaining -= width;
	}
	return true;
}

/** IPv4-mapped IPv6 prefix, `::ffff:0:0/96`. */
const IPV4_MAPPED: readonly number[] = [0, 0, 0, 0, 0, 0xffff, 0, 0];

/** Classify four octets against the IPv4 table. */
function classifyIpv4(octets: readonly number[]): AddressClassification {
	for (const [network, prefix, classification] of IPV4_RANGES) {
		if (withinPrefix(octets, network, prefix, 8)) return classification;
	}
	return "public";
}

/**
 * Classify a host as an IP address range, or `null` when it is not an IP literal.
 *
 * `null` is the answer for every domain name, and a caller must treat it as *unknown*
 * rather than safe — conflating the two is the classic fail-open in this kind of check.
 * {@link assertOutboundUrl} handles it explicitly.
 *
 * IPv4-mapped IPv6 addresses are unwrapped and classified by the address they carry, so
 * `::ffff:169.254.169.254` is `link_local` rather than merely "some IPv6 address". That
 * form matters in practice: `new URL("http://[::ffff:169.254.169.254]/").hostname`
 * returns the bracketed, hex-compressed `[::ffff:a9fe:a9fe]`, which a string check misses.
 *
 * @param host - Hostname or IP literal, with or without IPv6 brackets.
 * @returns The classification, or `null` when `host` is not an IP literal.
 *
 * @example
 * ```ts
 * classifyAddress("169.254.169.254");      // "link_local"
 * classifyAddress("172.32.0.1");           // "public" — just outside 172.16/12
 * classifyAddress("[::ffff:a9fe:a9fe]");   // "link_local"
 * classifyAddress("metadata.example.com"); // null — a name, not an address
 * ```
 */
export function classifyAddress(host: string): AddressClassification | null {
	if (typeof host !== "string" || host.length === 0) return null;

	const octets = parseIpv4(host);
	if (octets !== null) return classifyIpv4(octets);

	const groups = parseIpv6(host);
	if (groups === null) return null;

	if (withinPrefix(groups, IPV4_MAPPED, 96, 16)) {
		const high = groups[6] as number;
		const low = groups[7] as number;
		return classifyIpv4([high >>> 8, high & 0xff, low >>> 8, low & 0xff]);
	}

	for (const [network, prefix, classification] of IPV6_RANGES) {
		if (withinPrefix(groups, network, prefix, 16)) return classification;
	}
	return "public";
}

/**
 * Whether a host is an IP literal in a publicly routable range.
 *
 * @param host - Hostname or IP literal.
 * @returns `true` only for a routable IP literal. A domain name returns `false`, because
 *   this function cannot know what it resolves to.
 */
export function isPubliclyRoutableAddress(host: string): boolean {
	return classifyAddress(host) === "public";
}

//#endregion

//#region Outbound policy

/** Default schemes. `https:` only — a server fetching over `http:` is its own problem. */
const DEFAULT_PROTOCOLS: readonly string[] = ["https:"];

/**
 * Decide whether a server may fetch a caller-supplied URL.
 *
 * The control the SSRF rules name. Those rules match literal addresses inside a string;
 * this decides whether the request should be made at all.
 *
 * **Default deny, exhaustively.** Every path ends in an explicit allow or an explicit
 * refusal. That is deliberate: `classifyAddress` returns `null` for every domain name, so
 * a policy shaped "reject non-public *literals*" silently permits every name — the exact
 * fail-open this control exists to prevent. With no `allowedHosts` and `allowPublicHosts`
 * off, a name is refused.
 *
 * **A pre-connection check, and it cannot be more.** The name is resolved by the network
 * stack after this returns, so DNS may answer differently then (rebinding); redirects
 * need the same check applied per hop; neither is closable by a synchronous function.
 * Network-layer egress control remains the durable fix — this narrows the window rather
 * than shutting it.
 *
 * @param candidate - The URL to fetch, as text or a parsed `URL`.
 * @param policy - See {@link OutboundUrlPolicy}. Defaults refuse everything not named.
 * @returns A discriminated verdict. Never throws.
 *
 * @example
 * ```ts
 * const verdict = assertOutboundUrl(webhookUrl, { allowedHosts: ["hooks.partner.example"] });
 * if (!verdict.allowed) return reject(verdict.reason);
 * await fetch(verdict.url);
 * ```
 */
export function assertOutboundUrl(
	candidate: string | URL,
	policy: OutboundUrlPolicy = {},
): OutboundUrlVerdict {
	let url: URL;
	try {
		url = candidate instanceof URL ? candidate : new URL(String(candidate));
	} catch {
		return { allowed: false, reason: "malformed" };
	}

	const protocols = policy.allowedProtocols ?? DEFAULT_PROTOCOLS;
	if (!protocols.includes(url.protocol)) {
		return { allowed: false, reason: "protocol_not_allowed" };
	}

	// An empty `port` means the scheme default, which is always acceptable.
	if (url.port !== "") {
		const port = Number(url.port);
		if (!(policy.allowedPorts ?? []).includes(port)) {
			return { allowed: false, reason: "port_not_allowed" };
		}
	}

	const host = url.hostname.toLowerCase();
	const named = (policy.allowedHosts ?? []).some(
		(allowed) => allowed.trim().toLowerCase() === host,
	);
	const classification = classifyAddress(host);

	// An IP literal is judged on its range first: naming a loopback address in an
	// allowlist should not turn it into a route back into the host.
	if (classification !== null) {
		if (classification !== "public") return { allowed: false, reason: "address_not_routable" };
		return named || policy.allowPublicHosts === true
			? { allowed: true, url, classification }
			: { allowed: false, reason: "host_not_allowed" };
	}

	// A name. Nothing available here can tell what it resolves to.
	return named || policy.allowPublicHosts === true
		? { allowed: true, url, classification: null }
		: { allowed: false, reason: "host_not_allowed" };
}

//#endregion
