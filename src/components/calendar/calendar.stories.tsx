// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import type { Meta, StoryObj } from "@storybook/react";

import * as React from "react";

import { Calendar } from "./calendar";

const meta: Meta<typeof Calendar> = {
	component: Calendar,
	tags: ["autodocs"],
	title: "Forms/Calendar",
};

export default meta;
type Story = StoryObj<typeof Calendar>;

function DefaultDemo() {
	const [date, setDate] = React.useState<Date | undefined>(new Date());
	return <Calendar mode="single" onSelect={setDate} selected={date} />;
}

export const Default: Story = {
	render: () => <DefaultDemo />,
};

function MultipleDemo() {
	const [dates, setDates] = React.useState<Date[] | undefined>();
	return <Calendar mode="multiple" onSelect={setDates} selected={dates} />;
}

export const Multiple: Story = {
	render: () => <MultipleDemo />,
};

function RangeDemo() {
	const [range, setRange] = React.useState<undefined | { from: Date | undefined; to?: Date }>();
	return <Calendar mode="range" onSelect={setRange} selected={range} />;
}

export const Range: Story = {
	render: () => <RangeDemo />,
};
