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
 * @fileoverview InputOTP component family — segmented one-time-pin
 * input built on `input-otp`. Each digit gets its own visual slot
 * with focus and active states, while a single hidden `<input>`
 * receives keyboard input for autofill compatibility.
 *
 * Composition: `InputOTP > InputOTPGroup > InputOTPSlot*`, with
 * optional `InputOTPSeparator` (rendered as a minus icon between
 * groups, e.g. `XXX-XXX`).
 *
 * @module @resq-systems/ui/components/input-otp/input-otp
 */

"use client";

import { MinusIcon } from "@phosphor-icons/react";
import { OTPInput, OTPInputContext } from "input-otp";
import * as React from "react";

import { cn } from "../../lib/utils.js";

/**
 * Root of the segmented one-time-pin input; a single hidden field drives
 * autofill while `containerClassName` styles the slot row.
 *
 * @see {@link InputOTPSlot}
 */
function InputOTP({
	className,
	containerClassName,
	...props
}: Readonly<
	React.ComponentProps<typeof OTPInput> & {
		containerClassName?: string;
	}
>) {
	return (
		<OTPInput
			className={cn("disabled:cursor-not-allowed", className)}
			containerClassName={cn(
				"cn-input-otp flex items-center has-disabled:opacity-50",
				containerClassName,
			)}
			data-slot="input-otp"
			spellCheck={false}
			{...props}
		/>
	);
}

/** Visually groups a run of `InputOTPSlot`s (e.g. one triad of `XXX-XXX`). */
function InputOTPGroup({ className, ...props }: Readonly<React.ComponentProps<"div">>) {
	return (
		<div
			className={cn(
				"has-aria-invalid:ring-destructive/20 has-aria-invalid:border-destructive rounded-lg has-aria-invalid:ring-[3px] flex items-center",
				className,
			)}
			data-slot="input-otp-group"
			{...props}
		/>
	);
}

/** Minus-icon divider rendered between two `InputOTPGroup`s. */
function InputOTPSeparator({ ...props }: Readonly<React.ComponentProps<"div">>) {
	return (
		<div
			className="[&_svg:not([class*='size-'])]:size-4 flex items-center"
			data-slot="input-otp-separator"
			role="separator"
			{...props}
		>
			<MinusIcon weight="light" />
		</div>
	);
}

/**
 * Renders one digit cell, reading its character, active state, and fake caret
 * from the OTP context by `index`.
 *
 * @param index - Zero-based position of this slot within the OTP value.
 */
function InputOTPSlot({
	className,
	index,
	...props
}: Readonly<
	React.ComponentProps<"div"> & {
		index: number;
	}
>) {
	const inputOTPContext = React.useContext(OTPInputContext);
	const { char, hasFakeCaret, isActive } = inputOTPContext.slots[index] ?? {};

	return (
		<div
			className={cn(
				"bg-surface border-border data-[active=true]:border-ring data-[active=true]:ring-ring/50 data-[active=true]:aria-invalid:ring-destructive/20 aria-invalid:border-destructive data-[active=true]:aria-invalid:border-destructive size-9 border-y border-r text-sm transition-colors outline-none first:rounded-l-[6px] first:border-l last:rounded-r-[6px] data-[active=true]:ring-[3px] relative flex items-center justify-center data-[active=true]:z-10",
				className,
			)}
			data-active={isActive}
			data-slot="input-otp-slot"
			{...props}
		>
			{char}
			{hasFakeCaret && (
				<div className="pointer-events-none absolute inset-0 flex items-center justify-center">
					<div className="animate-caret-blink bg-foreground h-4 w-px duration-1000" />
				</div>
			)}
		</div>
	);
}

export { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot };
