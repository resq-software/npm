/**
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
 */

import { IncidentAlertEmail } from "../src/emails/incident-alert";

/** Preview for `email dev`. Not part of the published build. */
export default function IncidentAlertPreview() {
	return (
		<IncidentAlertEmail
			incidentId="INC-2048"
			title="Wildfire perimeter breach detected"
			severity="critical"
			summary="Drone 07 detected fire crossing the northern containment line near Sector 4. Immediate reassessment required."
			location="Sector 4 — Northern ridge"
			detectedAt="2026-07-05 18:42 PDT"
			dashboardUrl="https://app.resq.software/incidents/INC-2048"
		/>
	);
}
