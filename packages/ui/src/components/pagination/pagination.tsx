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
 * @fileoverview Pagination component family — page-number
 * navigation rendered as `<nav aria-label="pagination">`. Page
 * links use `Button` styling internally for visual parity with
 * other interactive controls.
 *
 * Composition: `Pagination > PaginationContent > PaginationItem*`,
 * with `PaginationLink` for numbered pages, `PaginationPrevious` /
 * `PaginationNext` for chevron controls, and `PaginationEllipsis`
 * for elided ranges.
 *
 * Active state is opt-in via the `isActive` prop on
 * `PaginationLink`; the helper renders `aria-current="page"`
 * automatically.
 */

import { CaretLeftIcon, CaretRightIcon, DotsThreeIcon } from "@phosphor-icons/react";
import type * as React from "react";

import { cn } from "../../lib/utils.js";
import { Button } from "../button/button.js";

type PaginationLinkProps = Pick<React.ComponentProps<typeof Button>, "size"> &
	React.ComponentProps<"a"> & {
		isActive?: boolean;
	};

function Pagination({ className, ...props }: Readonly<React.ComponentProps<"nav">>) {
	return (
		<nav
			aria-label="pagination"
			className={cn("mx-auto flex w-full justify-center", className)}
			data-slot="pagination"
			{...props}
		/>
	);
}

function PaginationContent({ className, ...props }: Readonly<React.ComponentProps<"ul">>) {
	return (
		<ul
			className={cn("gap-0.5 flex items-center", className)}
			data-slot="pagination-content"
			{...props}
		/>
	);
}

function PaginationEllipsis({ className, ...props }: Readonly<React.ComponentProps<"span">>) {
	return (
		<span
			aria-hidden
			className={cn(
				"size-8 flex items-center justify-center [&_svg:not([class*='size-'])]:size-4",
				className,
			)}
			data-slot="pagination-ellipsis"
			{...props}
		>
			<DotsThreeIcon weight="light" />
			<span className="sr-only">More pages</span>
		</span>
	);
}

function PaginationItem({ ...props }: Readonly<React.ComponentProps<"li">>) {
	return <li data-slot="pagination-item" {...props} />;
}

function PaginationLink({ className, isActive, size = "icon", ...props }: PaginationLinkProps) {
	return (
		<Button asChild className={cn(className)} size={size} variant={isActive ? "outline" : "ghost"}>
			<a
				aria-current={isActive ? "page" : undefined}
				data-active={isActive}
				data-slot="pagination-link"
				{...props}
			/>
		</Button>
	);
}

function PaginationNext({
	className,
	text = "Next",
	...props
}: Readonly<React.ComponentProps<typeof PaginationLink> & { text?: string }>) {
	return (
		<PaginationLink
			aria-label="Go to next page"
			className={cn("pr-1.5!", className)}
			size="default"
			{...props}
		>
			<span className="hidden sm:block">{text}</span>
			<CaretRightIcon data-icon="inline-end" weight="light" />
		</PaginationLink>
	);
}

function PaginationPrevious({
	className,
	text = "Previous",
	...props
}: Readonly<React.ComponentProps<typeof PaginationLink> & { text?: string }>) {
	return (
		<PaginationLink
			aria-label="Go to previous page"
			className={cn("pl-1.5!", className)}
			size="default"
			{...props}
		>
			<CaretLeftIcon data-icon="inline-start" weight="light" />
			<span className="hidden sm:block">{text}</span>
		</PaginationLink>
	);
}

export {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
};
