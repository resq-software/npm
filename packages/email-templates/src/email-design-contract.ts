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
 * @fileoverview Public, framework-neutral ResQ Systems email design contract.
 *
 * @module @resq-systems/email-templates/email-contract
 */

import { type EmailDesignContract, emailDesignContractCore } from "./email-design-contract-core.js";
import { emailDesignContractIntegrity } from "./email-design-contract-integrity.js";

export { canonicalizeEmailContract } from "./email-design-contract-core.js";
export type {
	EmailDesignContract,
	EmailDesignContractCore,
	EmailModeColors,
} from "./email-design-contract-core.js";
export { emailDesignContractIntegrity } from "./email-design-contract-integrity.js";

/** Versioned ResQ Systems email identity, tokens, layout, and presentation rules. */
export const emailDesignContract = {
	...emailDesignContractCore,
	integrity: {
		algorithm: "sha256",
		digest: emailDesignContractIntegrity,
	},
} as const satisfies EmailDesignContract;
