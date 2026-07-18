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
 * @fileoverview ResQ Systems brand identity constants — names, domains, contact
 * addresses, and legal details shared across apps (marketing site, dashboard,
 * transactional email).
 *
 * @module @resq-systems/constants/brand
 */

/**
 * ResQ Systems brand identity — names, domains, contact addresses, and legal
 * details shared across apps (marketing site, dashboard, transactional email).
 *
 * The postal address is ResQ Systems, Inc.'s public Delaware registered-agent
 * address (already public on the DE filing), included so commercial email stays
 * CAN-SPAM compliant by default.
 */
export const brand = {
	/** Short brand name. */
	name: "ResQ Systems",
	/** Product name (marketing / app title). */
	productName: "ResQ Tactical OS",
	/** Registered legal entity. */
	legalName: "ResQ Systems, Inc.",
	/** One-line positioning tagline. */
	tagline: "autonomous drone disaster response",
	/** Long-form product description (metadata, manifest, store listings). */
	description:
		"The decentralized kinetic operating system for autonomous disaster response. Mesh-networked coordination when infrastructure fails.",
	/**
	 * Absolute `https://` origins with no trailing slash, so a caller can append
	 * a path directly (`` `${brand.domains.marketing}/pricing` ``). `marketing`
	 * is the apex domain; the others are subdomains of it.
	 */
	domains: {
		app: "https://app.resq.software",
		marketing: "https://resq.software",
		docs: "https://docs.resq.software",
		status: "https://status.resq.software",
	},
	email: {
		/**
		 * RFC 5322 display-name form (`Name <addr>`) for use as a message `From`
		 * header verbatim. Sends from the `send.resq.software` subdomain — the
		 * DKIM/SPF-authenticated envelope domain — which differs from the apex
		 * reply mailboxes such as {@link contact} and {@link security}.
		 */
		from: "ResQ Systems <updates@send.resq.software>",
		/**
		 * General support address. Currently an alias of {@link contact} — there
		 * is no dedicated `support@` mailbox — so replies land in the same inbox.
		 */
		support: "contact@resq.software",
		/** General contact / inbound inquiries. */
		contact: "contact@resq.software",
		/** Security & vulnerability reports; the address to publish in `security.txt`. */
		security: "security@resq.software",
		/** Research, press, and partnership inquiries. */
		research: "research@resq.software",
		/** Engineering / automation address — matches the CI commit author. */
		engineer: "engineer@resq.software",
	},
	legal: {
		termsUrl: "https://resq.software/legal/terms",
		privacyUrl: "https://resq.software/legal/privacy",
	},
	socials: {
		x: "https://x.com/resqsystems_inc",
		/** The `@handle` form for `twitter:creator`/`site` meta (matches the `x` profile). */
		xHandle: "@resqsystems_inc",
		linkedin: "https://www.linkedin.com/company/resq-systems-inc",
		github: "https://github.com/resq-software",
	},
	company: {
		stage: "Pre-Seed",
		locations: ["Long Island, New York"],
	},
	logo: "https://resq.software/logo.png",
	postalAddress: "ResQ Systems, Inc., 131 Continental Dr, Suite 305, Newark, DE 19713, USA",
} as const;
