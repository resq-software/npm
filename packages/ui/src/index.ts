// Copyright 2026 ResQ Systems, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * @fileoverview Public API for `@resq-systems/ui` — 57-component React
 * library built on Radix UI primitives and Tailwind CSS v4 with a
 * dark-first oklch color system.
 *
 * **Prefer subpath imports** for production code:
 *
 * ```ts
 * import { Button } from "@resq-systems/ui/button";
 * import { Card, CardContent } from "@resq-systems/ui/card";
 * ```
 *
 * The bare `@resq-systems/ui` import (this barrel) re-exports everything
 * for convenience, but pulls the entire surface area; subpath
 * imports keep bundles tree-shakeable per component.
 *
 * Also exposes utility surface:
 * - {@link cn} — `clsx + tailwind-merge` class-name combiner.
 * - {@link useIsMobile} — `(max-width: 767px)` matchMedia hook.
 * - {@link getContrastingColor} — pick `#000` or `#fff` against any
 *   CSS color.
 *
 * @module @resq-systems/ui
 */

export * from "./components/accordion/index.js";
export * from "./components/alert/index.js";
export * from "./components/alert-dialog/index.js";
export * from "./components/aspect-ratio/index.js";
export * from "./components/avatar/index.js";
export * from "./components/badge/index.js";
export * from "./components/breadcrumb/index.js";
export * from "./components/button/index.js";
export * from "./components/button-group/index.js";
export * from "./components/calendar/index.js";
export * from "./components/card/index.js";
export * from "./components/carousel/index.js";
export * from "./components/chart/index.js";
export * from "./components/checkbox/index.js";
export * from "./components/collapsible/index.js";
export * from "./components/combobox/index.js";
export * from "./components/command/index.js";
export * from "./components/context-menu/index.js";
export * from "./components/dialog/index.js";
export * from "./components/direction/index.js";
export * from "./components/drawer/index.js";
export * from "./components/dropdown-menu/index.js";
export * from "./components/empty/index.js";
export * from "./components/field/index.js";
export * from "./components/hover-card/index.js";
export * from "./components/input/index.js";
export * from "./components/input-group/index.js";
export * from "./components/input-otp/index.js";
export * from "./components/item/index.js";
export * from "./components/kbd/index.js";
export * from "./components/label/index.js";
export * from "./components/menubar/index.js";
export * from "./components/native-select/index.js";
export * from "./components/navigation-menu/index.js";
export * from "./components/pagination/index.js";
export * from "./components/picture/index.js";
export * from "./components/popover/index.js";
export * from "./components/progress/index.js";
export * from "./components/radio-group/index.js";
export * from "./components/resizable/index.js";
export * from "./components/scroll-area/index.js";
export * from "./components/select/index.js";
export * from "./components/separator/index.js";
export * from "./components/sheet/index.js";
export * from "./components/sidebar/index.js";
export * from "./components/skeleton/index.js";
export * from "./components/slider/index.js";
export * from "./components/sonner/index.js";
export * from "./components/spinner/index.js";
export * from "./components/switch/index.js";
export * from "./components/table/index.js";
export * from "./components/tabs/index.js";
export * from "./components/textarea/index.js";
export * from "./components/toggle/index.js";
export * from "./components/toggle-group/index.js";
export * from "./components/tooltip/index.js";
export { useIsMobile } from "./hooks/use-mobile.js";
export { cn } from "./lib/utils.js";
export { getContrastingColor } from "./lib/get-contrasting-color.js";
export type { Channel, Rgb, RGB } from "./lib/get-contrasting-color.types.js";
