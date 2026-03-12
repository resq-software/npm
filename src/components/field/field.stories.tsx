// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import type { Meta, StoryObj } from "@storybook/nextjs";

import { Button } from "../button";
import { Input } from "../input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "../select";
import { Textarea } from "../textarea";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
	FieldTitle,
} from "./field";

const meta: Meta<typeof Field> = {
	argTypes: {
		orientation: {
			control: "select",
			options: ["vertical", "horizontal", "responsive"],
		},
	},
	component: Field,
	tags: ["autodocs"],
	title: "Forms/Field",
};

export default meta;
type Story = StoryObj<typeof Field>;

export const Default: Story = {
	render: () => (
		<FieldGroup className="w-80">
			<Field>
				<FieldLabel htmlFor="email">Email</FieldLabel>
				<Input id="email" placeholder="you@example.com" type="email" />
				<FieldDescription>We'll never share your email.</FieldDescription>
			</Field>
		</FieldGroup>
	),
};

export const WithError: Story = {
	render: () => (
		<FieldGroup className="w-80">
			<Field>
				<FieldTitle>Callsign</FieldTitle>
				<Input aria-invalid defaultValue="BRAVO" placeholder="e.g. BRAVO-7" />
				<FieldError>Callsign must include a number (e.g. BRAVO-7).</FieldError>
			</Field>
		</FieldGroup>
	),
};

export const Horizontal: Story = {
	render: () => (
		<FieldGroup className="w-96">
			<Field orientation="horizontal">
				<FieldLabel htmlFor="name">Full name</FieldLabel>
				<Input id="name" placeholder="Alex Rivera" />
			</Field>
			<Field orientation="horizontal">
				<FieldLabel htmlFor="rank">Rank</FieldLabel>
				<Input id="rank" placeholder="Sergeant" />
			</Field>
		</FieldGroup>
	),
};

export const FullForm: Story = {
	render: () => (
		<FieldGroup className="w-80">
			<Field>
				<FieldLabel htmlFor="full-name">Full name</FieldLabel>
				<Input id="full-name" placeholder="Alex Rivera" />
			</Field>
			<Field>
				<FieldLabel htmlFor="mission-email">Work email</FieldLabel>
				<Input id="mission-email" placeholder="you@resq.io" type="email" />
				<FieldDescription>Used for mission notifications.</FieldDescription>
			</Field>
			<Field>
				<FieldLabel htmlFor="zone-select">Primary zone</FieldLabel>
				<Select>
					<SelectTrigger id="zone-select">
						<SelectValue placeholder="Select zone" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="4a">Zone 4A</SelectItem>
						<SelectItem value="4b">Zone 4B</SelectItem>
						<SelectItem value="5a">Zone 5A</SelectItem>
					</SelectContent>
				</Select>
			</Field>
			<Field>
				<FieldLabel htmlFor="bio">Bio</FieldLabel>
				<Textarea id="bio" placeholder="Brief responder profile…" rows={3} />
				<FieldDescription>
					Optional. Visible to team commanders.
				</FieldDescription>
			</Field>
			<Button className="w-full">Save profile</Button>
		</FieldGroup>
	),
};
