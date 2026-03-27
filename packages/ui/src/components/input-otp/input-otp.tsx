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

"use client";

import { MinusIcon } from "@phosphor-icons/react";
import { OTPInput, OTPInputContext } from "input-otp";
import * as React from "react";

import { cn } from "../../lib/utils.js";

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
