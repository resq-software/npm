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
 * @fileoverview `useIsMobile` — an SSR-safe hook that tracks whether the viewport
 * is below the mobile breakpoint via `matchMedia`, so components can switch
 * between mobile and desktop affordances.
 *
 * @module @resq-systems/ui/hooks/use-mobile
 */

import * as React from "react";

/** Mobile breakpoint in CSS pixels. Matches Tailwind v4's default `md` breakpoint. */
const MOBILE_BREAKPOINT = 768;

/**
 * Subscribe to a `(max-width: 767px)` `matchMedia` query and return
 * whether the viewport is currently in the mobile range.
 *
 * SSR-safe: returns `false` during the first render (before
 * `useEffect` runs), then re-renders with the real value once the
 * subscription is active.
 *
 * Cleanup is automatic — the listener is removed on unmount or on
 * route changes.
 *
 * @returns `true` when the viewport is < 768 CSS pixels wide.
 *
 * @example
 * ```tsx
 * const isMobile = useIsMobile();
 * return isMobile ? <Drawer /> : <Sidebar />;
 * ```
 */
export function useIsMobile() {
	const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

	React.useEffect(() => {
		const mql = globalThis.matchMedia(`(max-width: ${String(MOBILE_BREAKPOINT - 1)}px)`);
		const onChange = () => {
			setIsMobile(mql.matches);
		};
		mql.addEventListener("change", onChange);
		setIsMobile(mql.matches);
		return () => {
			mql.removeEventListener("change", onChange);
		};
	}, []);

	return !!isMobile;
}
