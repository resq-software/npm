/**
 * @fileoverview Type definitions for the Bind decorator.
 * Provides configuration types for the bind decorator.
 *
 * @module @resq/typescript/decorators/bind/types
 *
 * @copyright Copyright (c) 2026 ResQ
 * @license MIT
 */

/**
 * Configuration options for the bind decorator.
 *
 * @interface BindConfig
 * @property {boolean} [lazy=true] - If true, the method is bound lazily on first access.
 *                                   If false, the method is bound at decoration time.
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
