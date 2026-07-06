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

import { createMailer } from "./mailer.js";
import { resqEmailTemplates } from "./templates.js";

/**
 * The default mailer over the built-in ResQ templates — the single source of
 * truth behind the package's `EmailPayload`, `decodeEmailPayload`, `registry`,
 * and `renderEmail` exports.
 */
export const resqMailer = createMailer(resqEmailTemplates);
