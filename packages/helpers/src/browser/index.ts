/**
 * Copyright 2026 ResQ
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
 * @fileoverview Browser-only helpers for `@resq-sw/helpers/browser`.
 *
 * Surfaces:
 * - Platform / browser detection (`isIOS`, `isAndroid`, `getBrowser`,
 *   `getPlatform`, `isTouchScreen`, …)
 * - HTML-entity obfuscation for `mailto:` / `tel:` links
 *   (`obfuscateLink`)
 *
 * All exports rely on `navigator`, `window`, or DOM globals — do not
 * import this subpath into server-side bundles. Use the universal
 * `@resq-sw/helpers` entry for SSR-safe utilities.
 */

export * from "./platform.js";
export * from "./html-entities.js";
