// Copyright 2026 ResQ Systems, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * @fileoverview Class-name utilities for the design system. Provides `cn`, the
 * canonical `clsx` + `tailwind-merge` combiner every component uses to compose
 * conditional and conflicting Tailwind classes.
 *
 * @module @resq-systems/ui/lib/utils
 */

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Compose Tailwind class names with intelligent conflict resolution.
 *
 * Pipes `inputs` through `clsx` (handles arrays, objects, and
 * conditional values) and then `tailwind-merge` (deduplicates
 * conflicting Tailwind utilities, e.g. `px-2 px-4` → `px-4`). This
 * is the canonical class-name combiner used by every component in
 * `@resq-systems/ui` and is exported so consumers can match the same
 * conventions in their own components.
 *
 * @param inputs - Any combination of strings, arrays, objects, or
 *   conditional values supported by `clsx`.
 *
 * @returns A merged, conflict-free Tailwind class string.
 *
 * @example
 * ```ts
 * cn("px-2", "px-4");                                   // "px-4"
 * cn("text-foreground", isError && "text-destructive"); // last truthy wins
 * cn("rounded", { "ring-2": focused });
 * cn(baseClasses, variant && variantClasses, className);
 * ```
 */
export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}
