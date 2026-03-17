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

import { cva, type VariantProps } from "class-variance-authority";
import { useMemo } from "react";

import { cn } from "../../lib/utils.js";
import { Label } from "../label/label.js";
import { Separator } from "../separator/separator.js";

function FieldGroup({ className, ...props }: Readonly<React.ComponentProps<"div">>) {
	return (
		<div
			className={cn(
				"gap-5 data-[slot=checkbox-group]:gap-3 *:data-[slot=field-group]:gap-4 group/field-group @container/field-group flex w-full flex-col",
				className,
			)}
			data-slot="field-group"
			{...props}
		/>
	);
}

function FieldLegend({
	className,
	variant = "legend",
	...props
}: Readonly<React.ComponentProps<"legend"> & { variant?: "label" | "legend" }>) {
	return (
		<legend
			className={cn(
				"mb-1.5 font-mono font-medium uppercase tracking-[0.18em] text-hint data-[variant=label]:text-[10px] data-[variant=legend]:text-[11px]",
				className,
			)}
			data-slot="field-legend"
			data-variant={variant}
			{...props}
		/>
	);
}

function FieldSet({ className, ...props }: Readonly<React.ComponentProps<"fieldset">>) {
	return (
		<fieldset
			className={cn(
				"gap-4 has-[>[data-slot=checkbox-group]]:gap-3 has-[>[data-slot=radio-group]]:gap-3 flex flex-col",
				className,
			)}
			data-slot="field-set"
			{...props}
		/>
	);
}

const fieldVariants = cva(
	"data-[invalid=true]:text-destructive-text gap-2 group/field flex w-full",
	{
		defaultVariants: {
			orientation: "vertical",
		},
		variants: {
			orientation: {
				horizontal:
					"flex-row items-center [&>[data-slot=field-label]]:flex-auto has-[>[data-slot=field-content]]:items-start has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px",
				responsive:
					"flex-col [&>*]:w-full [&>.sr-only]:w-auto @md/field-group:flex-row @md/field-group:items-center @md/field-group:[&>*]:w-auto @md/field-group:[&>[data-slot=field-label]]:flex-auto @md/field-group:has-[>[data-slot=field-content]]:items-start @md/field-group:has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px",
				vertical: "flex-col [&>*]:w-full [&>.sr-only]:w-auto",
			},
		},
	},
);

function Field({
	className,
	orientation = "vertical",
	...props
}: Readonly<React.ComponentProps<"div"> & VariantProps<typeof fieldVariants>>) {
	return (
		<div
			className={cn(fieldVariants({ orientation }), className)}
			data-orientation={orientation}
			data-slot="field"
			role="group"
			{...props}
		/>
	);
}

function FieldContent({ className, ...props }: Readonly<React.ComponentProps<"div">>) {
	return (
		<div
			className={cn("gap-0.5 group/field-content flex flex-1 flex-col leading-snug", className)}
			data-slot="field-content"
			{...props}
		/>
	);
}

function FieldDescription({ className, ...props }: Readonly<React.ComponentProps<"p">>) {
	return (
		<p
			className={cn(
				"text-muted-foreground text-left text-sm [[data-variant=legend]+&]:-mt-1.5 leading-relaxed font-normal group-has-data-[orientation=horizontal]/field:text-balance",
				"last:mt-0 nth-last-2:-mt-1",
				"[&>a:hover]:text-primary [&>a]:underline [&>a]:underline-offset-4",
				className,
			)}
			data-slot="field-description"
			{...props}
		/>
	);
}

function FieldError({
	children,
	className,
	errors,
	...props
}: React.ComponentProps<"div"> & {
	errors?: (undefined | { message?: string })[];
}) {
	const content = useMemo(() => {
		if (children) {
			return children;
		}

		if (!errors?.length) {
			return null;
		}

		const uniqueErrors = [...new Map(errors.map((error) => [error?.message, error])).values()];

		if (uniqueErrors.length === 1) {
			return uniqueErrors[0]?.message;
		}

		return (
			<ul className="ml-4 flex list-disc flex-col gap-1">
				{uniqueErrors.map(
					(error, index) =>
						error?.message && <li key={`error-${Number(index)}`}>{error.message}</li>,
				)}
			</ul>
		);
	}, [children, errors]);

	if (!content) {
		return null;
	}

	return (
		<div
			className={cn("text-destructive-text text-sm leading-relaxed font-normal", className)}
			data-slot="field-error"
			role="alert"
			{...props}
		>
			{content}
		</div>
	);
}

function FieldLabel({ className, ...props }: Readonly<React.ComponentProps<typeof Label>>) {
	return (
		<Label
			className={cn(
				"has-data-checked:bg-primary/5 has-data-checked:border-primary/30 gap-2 group-data-[disabled=true]/field:opacity-50 has-[>[data-slot=field]]:rounded-lg has-[>[data-slot=field]]:border has-[>[data-slot=field]]:border-border has-[>[data-slot=field]]:bg-surface *:data-[slot=field]:p-3 group/field-label peer/field-label flex w-fit leading-snug",
				"has-[>[data-slot=field]]:w-full has-[>[data-slot=field]]:flex-col",
				className,
			)}
			data-slot="field-label"
			{...props}
		/>
	);
}

function FieldSeparator({
	children,
	className,
	...props
}: Readonly<
	React.ComponentProps<"div"> & {
		children?: React.ReactNode;
	}
>) {
	return (
		<div
			className={cn(
				"-my-2 h-5 text-sm group-data-[variant=outline]/field-group:-mb-2 relative",
				className,
			)}
			data-content={!!children}
			data-slot="field-separator"
			{...props}
		>
			<Separator className="absolute inset-0 top-1/2" />
			{children && (
				<span
					className="text-hint px-2 bg-background font-mono text-[10px] uppercase tracking-[0.14em] relative mx-auto block w-fit"
					data-slot="field-separator-content"
				>
					{children}
				</span>
			)}
		</div>
	);
}

function FieldTitle({ className, ...props }: Readonly<React.ComponentProps<"div">>) {
	return (
		<div
			className={cn(
				"text-foreground gap-2 text-sm font-medium group-data-[disabled=true]/field:opacity-50 flex w-fit items-center leading-snug",
				className,
			)}
			data-slot="field-label"
			{...props}
		/>
	);
}

export {
	Field,
	FieldContent,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
	FieldLegend,
	FieldSeparator,
	FieldSet,
	FieldTitle,
};
