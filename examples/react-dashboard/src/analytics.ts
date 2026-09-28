/**
 * Copyright 2026 ResQ Systems, Inc.
 * SPDX-License-Identifier: Apache-2.0
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

import { type AnalyticsConfig, sanitizeGa4Id } from "@resq-systems/analytics";

// Keys come from the build environment. With neither set (the default for this
// example) analytics stays disabled and no consent banner is shown, because
// there is nothing to consent to.
const posthogKey: string | undefined = import.meta.env.VITE_POSTHOG_KEY;
const ga4Id = sanitizeGa4Id(import.meta.env.VITE_GA4_ID);

/** Whether this build has an analytics provider to ask the visitor about. */
export const analyticsEnabled = Boolean(posthogKey || ga4Id);

/**
 * Providers load only after the visitor accepts in the consent banner; until
 * then `AnalyticsProvider` records this config and nothing else.
 */
export const analyticsConfig: AnalyticsConfig = {
	disabled: !analyticsEnabled,
	...(posthogKey ? { posthog: { key: posthogKey } } : {}),
	...(ga4Id ? { ga4: { measurementId: ga4Id } } : {}),
};

/** Where the banner's "Privacy notice" link points. Replace with your site's own notice. */
export const PRIVACY_NOTICE_URL =
	"https://github.com/resq-software/npm/blob/master/PRIVACY.md#resq-systemsanalytics";
