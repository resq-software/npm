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

import { useConsentBanner } from "@resq-systems/analytics/react";
import { Button } from "@resq-systems/ui/button";
import { PRIVACY_NOTICE_URL } from "./analytics";

/**
 * Opt-in banner for `@resq-systems/analytics`. Accept and Decline share one
 * variant and size so neither is the easier choice; the notice link says what
 * accepting turns on before the visitor decides.
 */
export function ConsentBanner() {
	const { open, consent, accept, decline, close } = useConsentBanner();
	if (!open) return null;

	return (
		<section
			aria-labelledby="consent-title"
			className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-2xl rounded-lg border bg-card p-4 text-card-foreground shadow-lg"
		>
			<h2 id="consent-title" className="text-sm font-semibold">
				Analytics
			</h2>
			<p className="mt-1 text-sm text-muted-foreground">
				May we use Google Analytics 4 and PostHog to see how this dashboard is used? Nothing loads
				unless you accept, and you can change your mind any time under Privacy settings.{" "}
				<a className="underline underline-offset-4" href={PRIVACY_NOTICE_URL}>
					Privacy notice
				</a>
			</p>
			{consent !== "unset" && (
				<p className="mt-1 text-xs text-muted-foreground">
					Current choice: {consent === "granted" ? "accepted" : "declined"}.
				</p>
			)}
			<div className="mt-3 flex flex-wrap justify-end gap-2">
				{consent !== "unset" && (
					<Button variant="ghost" size="sm" onClick={close}>
						Close
					</Button>
				)}
				<Button variant="secondary" size="sm" onClick={decline}>
					Decline
				</Button>
				<Button variant="secondary" size="sm" onClick={accept}>
					Accept
				</Button>
			</div>
		</section>
	);
}
