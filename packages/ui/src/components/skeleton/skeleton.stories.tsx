// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import type { Meta, StoryObj } from "@storybook/react";

import { Skeleton } from "./skeleton";

const meta: Meta<typeof Skeleton> = {
	component: Skeleton,
	tags: ["autodocs"],
	title: "Display/Skeleton",
};

export default meta;
type Story = StoryObj<typeof Skeleton>;

export const Default: Story = {
	args: { className: "h-4 w-48" },
};

export const CardSkeleton: Story = {
	render: () => (
		<div className="flex flex-col gap-3 w-64">
			<Skeleton className="h-32 w-full rounded-xl" />
			<Skeleton className="h-4 w-3/4" />
			<Skeleton className="h-4 w-1/2" />
			<div className="flex gap-2 mt-1">
				<Skeleton className="h-8 w-24 rounded-md" />
				<Skeleton className="h-8 w-20 rounded-md" />
			</div>
		</div>
	),
};

export const AvatarSkeleton: Story = {
	render: () => (
		<div className="flex items-center gap-3">
			<Skeleton className="size-10 rounded-full" />
			<div className="flex flex-col gap-2">
				<Skeleton className="h-4 w-32" />
				<Skeleton className="h-3 w-24" />
			</div>
		</div>
	),
};

export const ListSkeleton: Story = {
	render: () => (
		<div className="flex flex-col gap-4 w-80">
			{Array.from({ length: 5 }, (_, i) => `skeleton-list-${String(i)}`).map((id) => (
				<div className="flex items-center gap-3" key={id}>
					<Skeleton className="size-8 rounded-full shrink-0" />
					<div className="flex flex-col gap-1.5 flex-1">
						<Skeleton className="h-4 w-3/4" />
						<Skeleton className="h-3 w-1/2" />
					</div>
					<Skeleton className="h-6 w-16 rounded-full" />
				</div>
			))}
		</div>
	),
};

export const TableSkeleton: Story = {
	render: () => (
		<div className="grid gap-3 w-full">
			<div className="flex gap-4">
				<Skeleton className="h-4 w-24" />
				<Skeleton className="h-4 w-32" />
				<Skeleton className="h-4 w-20" />
				<Skeleton className="h-4 w-16 ml-auto" />
			</div>
			{Array.from({ length: 4 }, (_, i) => `skeleton-table-${String(i)}`).map((id) => (
				<div className="flex gap-4" key={id}>
					<Skeleton className="h-4 w-20" />
					<Skeleton className="h-4 w-36" />
					<Skeleton className="h-4 w-16" />
					<Skeleton className="h-6 w-14 rounded-full ml-auto" />
				</div>
			))}
		</div>
	),
};
