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
 * @fileoverview Slider — single- or multi-thumb range slider built
 * on Radix UI's `Slider` primitive. Supports `orientation` (`horizontal`
 * / `vertical`), `min` / `max` / `step`, and arbitrary thumb
 * counts via the `value` array (e.g. for range filters).
 *
 * Keyboard: arrow keys adjust by `step`, Home / End jump to bounds.
 * Each thumb rolls up `aria-valuenow` for screen-reader
 * announcements, and is named through `thumbAriaLabels` /
 * `thumbAriaLabelledBy` because `role="slider"` carries no
 * implicit accessible name.
 *
 * @module @resq-systems/ui/components/slider/slider
 */

"use client";

import { Slider as SliderPrimitive } from "radix-ui";
import * as React from "react";

import { cn } from "../../lib/utils.js";

/**
 * Naming attributes for the thumb at `index`, emitting only the ones actually
 * supplied.
 *
 * Radix computes its own fallback (`props["aria-label"] || label`) and then
 * spreads the caller's props over the result, so passing an explicit
 * `aria-label={undefined}` would overwrite that fallback with `undefined` and
 * strip the "Minimum" / "Maximum" names off every multi-thumb slider. Omitting
 * the key entirely leaves the fallback intact.
 */
function thumbNameProps(
	index: number,
	labels?: readonly string[],
	labelledBy?: readonly string[],
): Readonly<{ "aria-label"?: string; "aria-labelledby"?: string }> {
	const label = labels?.[index];
	const labelledById = labelledBy?.[index];

	return {
		...(label === undefined ? {} : { "aria-label": label }),
		...(labelledById === undefined ? {} : { "aria-labelledby": labelledById }),
	};
}

/**
 * Single- or multi-thumb range slider.
 *
 * Radix puts `role="slider"` on each **thumb**, not on the root, and that role
 * carries no implicit accessible name. A thumb is a `span`, so it is not a
 * labelable element and `<Label htmlFor>` cannot name it — only `aria-label` or
 * `aria-labelledby` on the thumb itself will. The thumbs are rendered inside
 * this component, so name them through `thumbAriaLabels` /
 * `thumbAriaLabelledBy`; both are indexed by thumb.
 *
 * Radix supplies a fallback name only once there are two or more thumbs
 * ("Minimum" / "Maximum", then "Value n of m"). A single-thumb slider is
 * nameless unless the caller names it — assistive technology announces a bare
 * "slider, 50", a number with no subject, and axe-core fails it under
 * `aria-input-field-name`.
 *
 * Prefer `thumbAriaLabelledBy` pointing at the visible caption over duplicating
 * that copy into `thumbAriaLabels`, so the seen and the announced name cannot
 * drift. Give each thumb of a range an end-specific name: the same name on both
 * says nothing about which bound is moving.
 *
 * @example
 * ```tsx
 * <span id="altitude-limit">Drone altitude limit</span>
 * <Slider max={12} thumbAriaLabelledBy={["altitude-limit"]} value={value} />
 * ```
 */
function Slider({
	className,
	defaultValue,
	max = 100,
	min = 0,
	thumbAriaLabelledBy,
	thumbAriaLabels,
	value,
	...props
}: Readonly<
	React.ComponentProps<typeof SliderPrimitive.Root> & {
		thumbAriaLabelledBy?: readonly string[];
		thumbAriaLabels?: readonly string[];
	}
>) {
	const _values = React.useMemo(() => {
		if (Array.isArray(value)) return value;
		if (Array.isArray(defaultValue)) return defaultValue;
		return [min, max];
	}, [value, defaultValue, min, max]);

	return (
		<SliderPrimitive.Root
			className={cn(
				"data-vertical:min-h-40 relative flex w-full touch-none items-center select-none data-disabled:opacity-50 data-vertical:h-full data-vertical:w-auto data-vertical:flex-col",
				className,
			)}
			data-slot="slider"
			defaultValue={defaultValue}
			max={max}
			min={min}
			value={value}
			{...props}
		>
			<SliderPrimitive.Track
				className="bg-muted rounded-full data-horizontal:h-1 data-horizontal:w-full data-vertical:h-full data-vertical:w-1 relative grow overflow-hidden"
				data-slot="slider-track"
			>
				<SliderPrimitive.Range
					className="bg-primary absolute select-none data-horizontal:h-full data-vertical:w-full"
					data-slot="slider-range"
				/>
			</SliderPrimitive.Track>
			{Array.from({ length: _values.length }, (_, index) => (
				<SliderPrimitive.Thumb
					className="border-ring ring-ring/50 relative size-3 rounded-full border bg-white transition-[color,box-shadow] after:absolute after:-inset-2 hover:ring-[3px] focus-visible:ring-[3px] focus-visible:outline-hidden active:ring-[3px] block shrink-0 select-none disabled:pointer-events-none disabled:opacity-50"
					data-slot="slider-thumb"
					key={index}
					{...thumbNameProps(index, thumbAriaLabels, thumbAriaLabelledBy)}
				/>
			))}
		</SliderPrimitive.Root>
	);
}

export { Slider };
