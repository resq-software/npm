/**
 * @fileoverview Bind decorator module exports.
 * Provides the @bind decorator for automatic method binding.
 *
 * @module @resq/typescript/decorators/bind
 *
 * @example
 * ```typescript
 * import { bind } from '@resq/typescript/decorators/bind';
 *
 * class Component {
 *   @bind
 *   handleClick(): void {
 *     // this is correctly bound
 *   }
 * }
 * ```
 *
 * @copyright Copyright (c) 2026 ResQ
 * @license MIT
 */

export * from './bind.js';
export * from './bind.types.js';
