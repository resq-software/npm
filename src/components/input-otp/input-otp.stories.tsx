// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import type { Meta, StoryObj } from "@storybook/nextjs";

import {
	InputOTP,
	InputOTPGroup,
	InputOTPSeparator,
	InputOTPSlot,
} from "./input-otp";

const meta: Meta<typeof InputOTP> = {
	component: InputOTP,
	tags: ["autodocs"],
	title: "Forms/Input OTP",
};

export default meta;
type Story = StoryObj<typeof InputOTP>;

export const Default: Story = {
	render: () => (
		<InputOTP maxLength={6}>
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
	),
};

export const FourDigit: Story = {
	render: () => (
		<InputOTP maxLength={4}>
			<InputOTPGroup>
				<InputOTPSlot index={0} />
				<InputOTPSlot index={1} />
				<InputOTPSlot index={2} />
				<InputOTPSlot index={3} />
			</InputOTPGroup>
		</InputOTP>
	),
};

export const WithDescription: Story = {
	render: () => (
		<div className="grid gap-2 text-center">
			<p className="text-sm font-medium">Two-factor authentication</p>
			<p className="text-sm text-muted-foreground">
				Enter the 6-digit code from your authenticator app.
			</p>
			<div className="flex justify-center">
				<InputOTP maxLength={6}>
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
				<button className="underline underline-offset-2">Resend</button>
			</p>
		</div>
	),
};
