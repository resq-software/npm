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

// @ts-nocheck -- recharts 3.x type exports don't align with ComponentProps inference

"use client";

import * as React from "react";
import * as RechartsPrimitive from "recharts";

import { cn } from "../../lib/utils.js";

// Format: { THEME_NAME: CSS_SELECTOR }
const THEMES = { dark: "", light: ".light" } as const;

const SAFE_KEY_RE = /^[a-zA-Z0-9_-]+$/;
// Allowlist: permit only named colors, hex, rgb/hsl/oklch values, and CSS variables.
const SAFE_COLOR_RE =
	/^(#[0-9a-fA-F]{3,8}|[a-zA-Z]+|\d+(\.\d+)?\s+\d+(\.\d+)?%?\s+\d+(\.\d+)?%?|(rgb|hsl|oklch|color)\([^)]{0,100}\)|var\(--[a-zA-Z0-9_-]+\))$/;

export type ChartConfig = {
	[k in string]: {
		icon?: React.ComponentType;
		label?: React.ReactNode;
	} & (
		| { color?: never; theme: Record<keyof typeof THEMES, string> }
		| { color?: string; theme?: never }
	);
};

type ChartContextProps = {
	config: ChartConfig;
};

const ChartContext = React.createContext<ChartContextProps | null>(null);

function buildChartCss(id: string, colorConfig: [string, ChartConfig[string]][]): string {
	return Object.entries(THEMES)
		.map(
			([theme, prefix]) => `
${prefix} [data-chart=${id}] {
${colorConfig
	.map(([key, itemConfig]) => {
		const color = itemConfig.theme?.[theme as keyof typeof itemConfig.theme] || itemConfig.color;
		const isSafeKey = SAFE_KEY_RE.test(key);
		const isSafeColor = color ? SAFE_COLOR_RE.test(color.trim()) : false;
		return isSafeKey && isSafeColor ? `  --color-${key}: ${color?.trim()};` : null;
	})
	.join("\n")}
}
`,
		)
		.join("\n");
}

function ChartContainer({
	children,
	className,
	config,
	id,
	...props
}: Readonly<
	React.ComponentProps<"div"> & {
		children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>["children"];
		config: ChartConfig;
	}
>) {
	const uniqueId = React.useId();
	const chartId = `chart-${id || uniqueId.replaceAll(/:/g, "")}`;

	return (
		<ChartContext.Provider value={React.useMemo(() => ({ config }), [config])}>
			<div
				className={cn(
					"bg-card border border-border rounded-lg p-4 shadow-md [&_.recharts-cartesian-axis-tick_text]:fill-hint [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/70 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border-hover [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border/70 [&_.recharts-radial-bar-background-sector]:fill-surface [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-surface [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border-hover flex aspect-video justify-center text-xs [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-hidden [&_.recharts-sector]:outline-hidden [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-surface]:outline-hidden",
					className,
				)}
				data-chart={chartId}
				data-slot="chart"
				{...props}
			>
				<ChartStyle config={config} id={chartId} />
				<RechartsPrimitive.ResponsiveContainer>{children}</RechartsPrimitive.ResponsiveContainer>
			</div>
		</ChartContext.Provider>
	);
}

function useChart() {
	const context = React.useContext(ChartContext);

	if (!context) {
		throw new Error("useChart must be used within a <ChartContainer />");
	}

	return context;
}

const ChartStyle = React.memo(function ChartStyle({
	config,
	id,
}: {
	config: ChartConfig;
	id: string;
}) {
	const colorConfig = React.useMemo(
		() =>
			Object.entries(config).filter(([, c]) => c.theme ?? c.color) as [
				string,
				ChartConfig[string],
			][],
		[config],
	);

	const css = React.useMemo(() => buildChartCss(id, colorConfig), [id, colorConfig]);

	if (!colorConfig.length) {
		return null;
	}

	// css is built only from allowlisted keys/colors validated by SAFE_KEY_RE and SAFE_COLOR_RE.
	return <style dangerouslySetInnerHTML={{ __html: css }} />;
});

const ChartTooltip = RechartsPrimitive.Tooltip;

function ChartTooltipContent({
	active,
	className,
	color,
	formatter,
	hideIndicator = false,
	hideLabel = false,
	indicator = "dot",
	label,
	labelClassName,
	labelFormatter,
	labelKey,
	nameKey,
	payload,
}: React.ComponentProps<"div"> &
	React.ComponentProps<typeof RechartsPrimitive.Tooltip> & {
		hideIndicator?: boolean;
		hideLabel?: boolean;
		indicator?: "dashed" | "dot" | "line";
		labelKey?: string;
		nameKey?: string;
	}) {
	const { config } = useChart();

	const tooltipLabel = React.useMemo(() => {
		if (hideLabel || !payload?.length) {
			return null;
		}

		const [item] = payload;
		const key = `${labelKey || item?.dataKey || item?.name || "value"}`;
		const itemConfig = getPayloadConfigFromPayload(config, item, key);
		const value =
			!labelKey && typeof label === "string"
				? config[label as keyof typeof config]?.label || label
				: itemConfig?.label;

		if (labelFormatter) {
			return (
				<div
					className={cn(
						"font-mono text-[10px] font-medium uppercase tracking-[0.14em]",
						labelClassName,
					)}
				>
					{labelFormatter(value, payload)}
				</div>
			);
		}

		if (!value) {
			return null;
		}

		return (
			<div
				className={cn(
					"font-mono text-[10px] font-medium uppercase tracking-[0.14em]",
					labelClassName,
				)}
			>
				{value}
			</div>
		);
	}, [label, labelFormatter, payload, hideLabel, labelClassName, config, labelKey]);

	if (!active || !payload?.length) {
		return null;
	}

	const nestLabel = payload.length === 1 && indicator !== "dot";

	return (
		<div
			className={cn(
				"border-border bg-card gap-2 rounded-lg border px-3 py-2 text-xs shadow-xl grid min-w-36 items-start",
				className,
			)}
		>
			{!nestLabel ? tooltipLabel : null}
			<div className="grid gap-1.5">
				{payload
					.filter((item) => item.type !== "none")
					.map((item, index) => {
						const key = `${nameKey || item.name || item.dataKey || "value"}`;
						const itemConfig = getPayloadConfigFromPayload(config, item, key);
						const indicatorColor = color || item.payload.fill || item.color;

						return (
							<div
								className={cn(
									"[&>svg]:text-muted-foreground flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5",
									indicator === "dot" && "items-center",
								)}
								key={item.dataKey}
							>
								{formatter && item?.value !== undefined && item.name ? (
									formatter(item.value, item.name, item, index, item.payload)
								) : (
									<>
										{itemConfig?.icon ? (
											<itemConfig.icon />
										) : (
											!hideIndicator && (
												<div
													className={cn(
														"shrink-0 rounded-[2px] border-(--color-border) bg-(--color-bg)",
														{
															"h-2.5 w-2.5": indicator === "dot",
															"my-0.5": nestLabel && indicator === "dashed",
															"w-0 border-[1.5px] border-dashed bg-transparent":
																indicator === "dashed",
															"w-1": indicator === "line",
														},
													)}
													style={
														{
															"--color-bg": indicatorColor,
															"--color-border": indicatorColor,
														} as React.CSSProperties
													}
												/>
											)
										)}
										<div
											className={cn(
												"flex flex-1 justify-between leading-none",
												nestLabel ? "items-end" : "items-center",
											)}
										>
											<div className="grid gap-1.5">
												{nestLabel ? tooltipLabel : null}
												<span className="text-hint font-mono text-[10px] uppercase tracking-[0.12em]">
													{itemConfig?.label || item.name}
												</span>
											</div>
											{item.value && (
												<span className="text-foreground font-mono font-medium tabular-nums">
													{item.value.toLocaleString()}
												</span>
											)}
										</div>
									</>
								)}
							</div>
						);
					})}
			</div>
		</div>
	);
}

const ChartLegend = RechartsPrimitive.Legend;

function ChartLegendContent({
	className,
	hideIcon = false,
	nameKey,
	payload,
	verticalAlign = "bottom",
}: Partial<Pick<RechartsPrimitive.LegendProps, "payload" | "verticalAlign">> &
	React.ComponentProps<"div"> & {
		hideIcon?: boolean;
		nameKey?: string;
	}) {
	const { config } = useChart();

	if (!payload?.length) {
		return null;
	}

	return (
		<div
			className={cn(
				"text-hint font-mono text-[10px] font-medium uppercase tracking-[0.14em] flex items-center justify-center gap-4",
				verticalAlign === "top" ? "pb-3" : "pt-3",
				className,
			)}
		>
			{payload
				.filter((item) => item.type !== "none")
				.map((item) => {
					const key = `${nameKey || item.dataKey || "value"}`;
					const itemConfig = getPayloadConfigFromPayload(config, item, key);

					return (
						<div
							className={cn(
								"[&>svg]:text-muted-foreground flex items-center gap-1.5 [&>svg]:h-3 [&>svg]:w-3",
							)}
							key={item.value}
						>
							{itemConfig?.icon && !hideIcon ? (
								<itemConfig.icon />
							) : (
								<div
									className="h-2 w-2 shrink-0 rounded-[2px]"
									style={{
										backgroundColor: item.color,
									}}
								/>
							)}
							{itemConfig?.label}
						</div>
					);
				})}
		</div>
	);
}

function getPayloadConfigFromPayload(config: ChartConfig, payload: unknown, key: string) {
	if (typeof payload !== "object" || payload === null) {
		return undefined;
	}

	const payloadPayload =
		"payload" in payload && typeof payload.payload === "object" && payload.payload !== null
			? payload.payload
			: undefined;

	let configLabelKey: string = key;

	if (key in payload && typeof payload[key as keyof typeof payload] === "string") {
		configLabelKey = payload[key as keyof typeof payload] as string;
	} else if (
		payloadPayload &&
		key in payloadPayload &&
		typeof payloadPayload[key as keyof typeof payloadPayload] === "string"
	) {
		configLabelKey = payloadPayload[key as keyof typeof payloadPayload] as string;
	}

	return configLabelKey in config ? config[configLabelKey] : config[key as keyof typeof config];
}

export {
	ChartContainer,
	ChartLegend,
	ChartLegendContent,
	ChartStyle,
	ChartTooltip,
	ChartTooltipContent,
};
