// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import type { Meta, StoryObj } from "@storybook/react";

import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import {
	type ChartConfig,
	ChartContainer,
	ChartLegend,
	ChartLegendContent,
	ChartTooltip,
	ChartTooltipContent,
} from "./chart";

const monthlyData = [
	{ missions: 14, month: "Jan", resolved: 12 },
	{ missions: 18, month: "Feb", resolved: 15 },
	{ missions: 22, month: "Mar", resolved: 20 },
	{ missions: 16, month: "Apr", resolved: 14 },
	{ missions: 25, month: "May", resolved: 22 },
	{ missions: 30, month: "Jun", resolved: 27 },
];

const responseData = [
	{ day: "Mon", resolution: 42, response: 8.2 },
	{ day: "Tue", resolution: 38, response: 6.5 },
	{ day: "Wed", resolution: 51, response: 9.1 },
	{ day: "Thu", resolution: 45, response: 7.3 },
	{ day: "Fri", resolution: 33, response: 5.8 },
	{ day: "Sat", resolution: 60, response: 11.2 },
	{ day: "Sun", resolution: 55, response: 10.5 },
];

const missionChartConfig: ChartConfig = {
	missions: { color: "var(--chart-1)", label: "Missions started" },
	resolved: { color: "var(--chart-2)", label: "Resolved" },
};

const responseChartConfig: ChartConfig = {
	resolution: { color: "var(--chart-2)", label: "Avg. resolution (min)" },
	response: { color: "var(--chart-1)", label: "Avg. response (min)" },
};

const meta: Meta<typeof ChartContainer> = {
	component: ChartContainer,
	tags: ["autodocs"],
	title: "Data/Chart",
};

export default meta;
type Story = StoryObj<typeof ChartContainer>;

export const BarDefault: Story = {
	render: () => (
		<ChartContainer className="h-56 w-full" config={missionChartConfig}>
			<BarChart data={monthlyData}>
				<CartesianGrid vertical={false} />
				<XAxis axisLine={false} dataKey="month" tickLine={false} />
				<ChartTooltip content={<ChartTooltipContent />} />
				<ChartLegend content={<ChartLegendContent />} />
				<Bar dataKey="missions" fill="var(--color-missions)" radius={4} />
				<Bar dataKey="resolved" fill="var(--color-resolved)" radius={4} />
			</BarChart>
		</ChartContainer>
	),
};

export const LineDefault: Story = {
	render: () => (
		<ChartContainer className="h-56 w-full" config={responseChartConfig}>
			<LineChart data={responseData}>
				<CartesianGrid vertical={false} />
				<XAxis axisLine={false} dataKey="day" tickLine={false} />
				<YAxis axisLine={false} tickLine={false} width={32} />
				<ChartTooltip content={<ChartTooltipContent />} />
				<ChartLegend content={<ChartLegendContent />} />
				<Line
					dataKey="response"
					dot={false}
					stroke="var(--color-response)"
					strokeWidth={2}
					type="monotone"
				/>
				<Line
					dataKey="resolution"
					dot={false}
					stroke="var(--color-resolution)"
					strokeWidth={2}
					type="monotone"
				/>
			</LineChart>
		</ChartContainer>
	),
};
