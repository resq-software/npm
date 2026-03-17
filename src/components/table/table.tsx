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

import type * as React from "react";

import { cn } from "../../lib/utils.js";

function Table({ className, ...props }: Readonly<React.ComponentProps<"table">>) {
	return (
		<div className="relative w-full overflow-x-auto" data-slot="table-container">
			<table
				className={cn("w-full caption-bottom text-sm", className)}
				data-slot="table"
				{...props}
			/>
		</div>
	);
}

function TableBody({ className, ...props }: Readonly<React.ComponentProps<"tbody">>) {
	return (
		<tbody
			className={cn("[&_tr:last-child]:border-0", className)}
			data-slot="table-body"
			{...props}
		/>
	);
}

function TableCaption({ className, ...props }: Readonly<React.ComponentProps<"caption">>) {
	return (
		<caption
			className={cn("text-muted-foreground mt-4 text-sm", className)}
			data-slot="table-caption"
			{...props}
		/>
	);
}

function TableCell({ className, ...props }: Readonly<React.ComponentProps<"td">>) {
	return (
		<td
			className={cn("p-3 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0", className)}
			data-slot="table-cell"
			{...props}
		/>
	);
}

function TableFooter({ className, ...props }: Readonly<React.ComponentProps<"tfoot">>) {
	return (
		<tfoot
			className={cn(
				"bg-surface border-t border-border font-medium [&>tr]:last:border-b-0",
				className,
			)}
			data-slot="table-footer"
			{...props}
		/>
	);
}

function TableHead({ className, ...props }: Readonly<React.ComponentProps<"th">>) {
	return (
		<th
			className={cn(
				"text-hint h-10 px-3 text-left align-middle font-mono text-[10px] font-medium uppercase tracking-[0.18em] whitespace-nowrap [&:has([role=checkbox])]:pr-0",
				className,
			)}
			data-slot="table-head"
			{...props}
		/>
	);
}

function TableHeader({ className, ...props }: Readonly<React.ComponentProps<"thead">>) {
	return <thead className={cn("[&_tr]:border-b", className)} data-slot="table-header" {...props} />;
}

function TableRow({ className, ...props }: Readonly<React.ComponentProps<"tr">>) {
	return (
		<tr
			className={cn(
				"hover:bg-card data-[state=selected]:bg-card border-b border-border transition-colors",
				className,
			)}
			data-slot="table-row"
			{...props}
		/>
	);
}

export { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow };
