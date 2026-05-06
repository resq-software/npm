/**
 *
 * Copyright 2026 ResQ Software
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

import type { GA4ProviderConfig } from "../index";

export interface AnalyticsRewriteOptions {
	prefix?: string;
	upstream?: string;
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

export const ga4Stream = (measurementId: string, domains?: string[]): GA4ProviderConfig => ({
	measurementId,
	domains,
});
