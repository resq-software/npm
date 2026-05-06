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

import { type ReactNode, useEffect } from "react";
import {
	type Analytics,
	type AnalyticsConfig,
	analytics,
	identify,
	pageview,
	reset,
	track,
} from "../index";

export interface AnalyticsProviderProps {
	config: AnalyticsConfig;
	deferUntilIdle?: boolean;
	children?: ReactNode;
}

const requestIdle = (cb: () => void): void => {
	if (typeof window === "undefined") return;
	const w = window as unknown as {
		requestIdleCallback?: (cb: () => void) => number;
	};
	if (typeof w.requestIdleCallback === "function") {
		w.requestIdleCallback(cb);
	} else {
		setTimeout(cb, 1);
	}
};

export const AnalyticsProvider = ({
	config,
	deferUntilIdle = true,
	children,
}: AnalyticsProviderProps): ReactNode => {
	useEffect(() => {
		if (deferUntilIdle) {
			requestIdle(() => {
				void analytics.init(config);
			});
		} else {
			void analytics.init(config);
		}
	}, [config, deferUntilIdle]);

	return children;
};

export interface UseAnalyticsReturn {
	track: Analytics["track"];
	identify: typeof identify;
	reset: typeof reset;
	pageview: typeof pageview;
	analytics: Analytics;
}

export const useAnalytics = (): UseAnalyticsReturn => ({
	track,
	identify,
	reset,
	pageview,
	analytics,
});
