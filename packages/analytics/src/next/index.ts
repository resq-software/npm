/**
 *
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
 *
 */

/**
 * @fileoverview Next.js helpers for `@resq-systems/analytics`.
 *
 * Provides `next.config.{js,ts}` integration for the cross-subdomain
 * reverse-proxy pattern (so PostHog ingestion appears to come from
 * the app's own origin, avoiding ad blockers and third-party cookie
 * loss) plus a small builder for GA4 cross-subdomain linker config.
 *
 * @module @resq-systems/analytics/next
 */

import type { LiteralUnion } from "@resq-systems/types";
import type { GA4ProviderConfig } from "../index";
import type { Ga4MeasurementId, ResqSubdomain } from "../resq";

/**
 * Options for {@link withAnalyticsRewrites}.
 *
 * Defaults are tuned for PostHog's US ingestion endpoints; override
 * `upstream` / `assetsUpstream` for EU regions or self-hosted
 * deployments.
 */
export interface AnalyticsRewriteOptions {
	/** Local path prefix that proxies to PostHog. Default `"/ingest"`. */
	prefix?: string;
	/** PostHog ingestion endpoint. Default `"https://us.i.posthog.com"`. */
	upstream?: string;
	/** PostHog static-assets endpoint. Default `"https://us-assets.i.posthog.com"`. */
	assetsUpstream?: string;
}

interface NextRewriteRule {
	source: string;
	destination: string;
}

interface MinimalNextConfig {
	skipTrailingSlashRedirect?: boolean;
	rewrites?: () =>
		| Promise<NextRewriteRule[] | { beforeFiles?: NextRewriteRule[] }>
		| NextRewriteRule[]
		| { beforeFiles?: NextRewriteRule[] };
	[key: string]: unknown;
}

/**
 * Wrap a Next.js config to add reverse-proxy rewrites for
 * `@resq-systems/analytics`.
 *
 * Adds two rules to the `beforeFiles` rewrite array:
 *
 * 1. `/<prefix>/static/:path* → assetsUpstream/static/:path*`
 *    (PostHog snippet bundle).
 * 2. `/<prefix>/:path*        → upstream/:path*`
 *    (everything else: capture, decide, `/e/`).
 *
 * Pre-existing user-defined rewrites are preserved — the proxy
 * rules go *first* so they win when paths overlap. Also forces
 * `skipTrailingSlashRedirect: true`, which is required for the
 * proxy to work reliably across `/ingest` and `/ingest/`.
 *
 * @typeParam T - The user's full `next.config.{js,ts}` type.
 *
 * @example `next.config.ts`
 * ```ts
 * import { withAnalyticsRewrites } from "@resq-systems/analytics/next";
 *
 * export default withAnalyticsRewrites({
 *   reactStrictMode: true,
 *   // ...rest of your config
 * });
 * ```
 */
export const withAnalyticsRewrites = <T extends MinimalNextConfig>(
	nextConfig: T,
	options: AnalyticsRewriteOptions = {},
): T => {
	const prefix = (options.prefix ?? "/ingest").replace(/\/$/, "");
	const upstream = options.upstream ?? "https://us.i.posthog.com";
	const assetsUpstream = options.assetsUpstream ?? "https://us-assets.i.posthog.com";

	const proxyRules: NextRewriteRule[] = [
		{
			source: `${prefix}/static/:path*`,
			destination: `${assetsUpstream}/static/:path*`,
		},
		{ source: `${prefix}/:path*`, destination: `${upstream}/:path*` },
	];

	const previousRewrites = nextConfig.rewrites;
	return {
		...nextConfig,
		skipTrailingSlashRedirect: true,
		rewrites: async () => {
			const prior = previousRewrites ? await previousRewrites() : [];
			if (Array.isArray(prior)) {
				return [...proxyRules, ...prior];
			}
			return {
				...prior,
				beforeFiles: [...proxyRules, ...(prior.beforeFiles ?? [])],
			};
		},
	};
};

/**
 * Build a {@link GA4ProviderConfig} with cross-subdomain linker
 * domains. Drop into `AnalyticsConfig.ga4`:
 *
 * ```ts
 * const config: AnalyticsConfig = {
 *   posthog: { ... },
 *   ga4: ga4Stream("G-XXXXXXX", ["resq.software", "research.resq.software", "viz.resq.software"]),
 * };
 * ```
 *
 * @param measurementId - GA4 Measurement ID (`G-…`).
 * @param domains - Domain allow-list passed to gtag's `linker.domains`,
 *   so cross-subdomain navigation no longer counts as referral
 *   traffic.
 */
export const ga4Stream = (
	measurementId: Ga4MeasurementId,
	domains?: LiteralUnion<ResqSubdomain>[],
): GA4ProviderConfig => ({
	measurementId,
	domains,
});
