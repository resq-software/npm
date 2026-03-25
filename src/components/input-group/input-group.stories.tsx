// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import { LockIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";
import type { Meta, StoryObj } from "@storybook/react";

import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "./input-group";

const meta: Meta<typeof InputGroup> = {
	component: InputGroup,
	tags: ["autodocs"],
	title: "Forms/Input Group",
};

export default meta;
type Story = StoryObj<typeof InputGroup>;

export const Default: Story = {
	render: () => (
		<InputGroup className="w-72">
			<InputGroupAddon>
				<MagnifyingGlassIcon className="size-4" />
			</InputGroupAddon>
			<InputGroupInput placeholder="Search missions…" />
		</InputGroup>
	),
};

export const WithEndAddon: Story = {
	render: () => (
		<InputGroup className="w-48">
			<InputGroupInput placeholder="0.00" type="number" />
			<InputGroupAddon align="inline-end">USD</InputGroupAddon>
		</InputGroup>
	),
};

export const BothEnds: Story = {
	render: () => (
		<InputGroup className="w-72">
			<InputGroupAddon>https://</InputGroupAddon>
			<InputGroupInput placeholder="example.com" />
			<InputGroupAddon align="inline-end">/rescue</InputGroupAddon>
		</InputGroup>
	),
};

export const WithButton: Story = {
	render: () => (
		<InputGroup className="w-72">
			<InputGroupInput placeholder="Search callsign…" />
			<InputGroupButton>Search</InputGroupButton>
		</InputGroup>
	),
};

export const Password: Story = {
	render: () => (
		<InputGroup className="w-72">
			<InputGroupAddon>
				<LockIcon className="size-4" />
			</InputGroupAddon>
			<InputGroupInput placeholder="Enter passphrase" type="password" />
		</InputGroup>
	),
};
