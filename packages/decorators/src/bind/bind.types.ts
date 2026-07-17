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
 * @fileoverview Type for the `@bind` decorator — `BindConfig` toggles lazy
 * (first-access) versus eager (decoration-time) binding.
 *
 * @module @resq-systems/decorators/bind/bind.types
 */

/**
 * Configuration options for the bind decorator.
 *
 * @example
 * ```typescript
 * // Lazy binding (default) - binds on first access
 * const lazyConfig: BindConfig = { lazy: true };
 *
 * // Eager binding - binds immediately
 * const eagerConfig: BindConfig = { lazy: false };
 * ```
 */
export interface BindConfig {
	/**
	 * If true, the method is bound lazily on first access.
	 * If false (default), the method is bound at decoration time.
	 */
	lazy?: boolean;
}
