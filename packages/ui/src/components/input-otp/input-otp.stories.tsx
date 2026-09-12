// Copyright 2026 ResQ Systems, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { Meta, StoryObj } from "@storybook/react";

import { Label } from "../label";
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from "./input-otp";

const meta: Meta<typeof InputOTP> = {
	component: InputOTP,
	tags: ["autodocs"],
	title: "Forms/Input OTP",
};

export default meta;
type Story = StoryObj<typeof InputOTP>;

/**
 * The slots are decorative `div`s — the whole field is one hidden `<input>`, so a
 * `Label` bound by `htmlFor` is the only thing that gives a screen-reader user a
 * name to act on. One-time codes expire, so an unnamed field is not merely
 * confusing, it is a deadline the user cannot meet. `autoComplete="one-time-code"`
 * is the companion convention: it lets the platform offer the code from SMS or an
 * authenticator app so the user need not transcribe it at all.
 */
export const Default: Story = {
	render: () => (
		<div className="grid gap-2">
			<Label htmlFor="otp-default">Verification code</Label>
			<InputOTP autoComplete="one-time-code" id="otp-default" maxLength={6}>
				<InputOTPGroup>
					<InputOTPSlot index={0} />
					<InputOTPSlot index={1} />
					<InputOTPSlot index={2} />
				</InputOTPGroup>
				<InputOTPSeparator />
				<InputOTPGroup>
					<InputOTPSlot index={3} />
					<InputOTPSlot index={4} />
					<InputOTPSlot index={5} />
				</InputOTPGroup>
			</InputOTP>
		</div>
	),
};

/**
 * A shorter code carries the same naming duty, and the label is the only place
 * the expected length is announced — nothing in the slot row tells a
 * screen-reader user how many characters the field is waiting for.
 */
export const FourDigit: Story = {
	render: () => (
		<div className="grid gap-2">
			<Label htmlFor="otp-four-digit">Four-digit security code</Label>
			<InputOTP autoComplete="one-time-code" id="otp-four-digit" maxLength={4}>
				<InputOTPGroup>
					<InputOTPSlot index={0} />
					<InputOTPSlot index={1} />
					<InputOTPSlot index={2} />
					<InputOTPSlot index={3} />
				</InputOTPGroup>
			</InputOTP>
		</div>
	),
};

/**
 * Supporting copy is a description, never a name: `aria-describedby` is announced
 * after the accessible name and may be skipped entirely, so a field carrying only
 * helper text still reaches assistive technology unnamed. Both are needed — the
 * `Label` names where the code goes, the description says where it came from.
 */
export const WithDescription: Story = {
	render: () => (
		<div className="grid gap-2 text-center">
			<Label className="justify-center" htmlFor="otp-two-factor">
				Two-factor authentication
			</Label>
			<p className="text-sm text-muted-foreground" id="otp-two-factor-description">
				Enter the 6-digit code from your authenticator app.
			</p>
			<div className="flex justify-center">
				<InputOTP
					aria-describedby="otp-two-factor-description"
					autoComplete="one-time-code"
					id="otp-two-factor"
					maxLength={6}
				>
					<InputOTPGroup>
						<InputOTPSlot index={0} />
						<InputOTPSlot index={1} />
						<InputOTPSlot index={2} />
					</InputOTPGroup>
					<InputOTPSeparator />
					<InputOTPGroup>
						<InputOTPSlot index={3} />
						<InputOTPSlot index={4} />
						<InputOTPSlot index={5} />
					</InputOTPGroup>
				</InputOTP>
			</div>
			<p className="text-xs text-muted-foreground">
				Didn't receive a code?{" "}
				<button className="underline underline-offset-2" type="button">
					Resend
				</button>
			</p>
		</div>
	),
};
