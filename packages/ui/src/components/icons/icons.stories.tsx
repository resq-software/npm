// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import type { Icon, IconWeight } from "@phosphor-icons/react";
import {
	AirplaneTiltIcon,
	ArrowLeftIcon,
	ArrowRightIcon,
	ArrowSquareOutIcon,
	ArrowsClockwiseIcon,
	BatteryFullIcon,
	BellIcon,
	BookOpenIcon,
	BrainIcon,
	BroadcastIcon,
	CalendarIcon,
	CaretDownIcon,
	CaretLeftIcon,
	CaretRightIcon,
	CaretUpDownIcon,
	CaretUpIcon,
	CellSignalFullIcon,
	ChartLineIcon,
	ChatTextIcon,
	CheckCircleIcon,
	CheckIcon,
	CircleIcon,
	ClipboardTextIcon,
	ClockIcon,
	CopyIcon,
	CornersOutIcon,
	CrosshairIcon,
	CurrencyCircleDollarIcon,
	DatabaseIcon,
	DesktopIcon,
	DotsThreeIcon,
	DownloadIcon,
	DropIcon,
	EnvelopeIcon,
	EyeIcon,
	FileCodeIcon,
	FileImageIcon,
	FileTextIcon,
	FirstAidKitIcon,
	FlameIcon,
	FunnelIcon,
	GearIcon,
	GitBranchIcon,
	GlobeIcon,
	HouseIcon,
	InfoIcon,
	LightningIcon,
	LinkBreakIcon,
	LinkIcon,
	ListIcon,
	LockIcon,
	MagnifyingGlassIcon,
	MapPinIcon,
	MinusIcon,
	PackageIcon,
	PaperPlaneTiltIcon,
	PencilIcon,
	PlayIcon,
	PlusIcon,
	PulseIcon,
	RadioIcon,
	ShieldCheckIcon,
	ShieldSlashIcon,
	SidebarSimpleIcon,
	SignOutIcon,
	SirenIcon,
	SlidersHorizontalIcon,
	SpinnerGapIcon,
	SquareIcon,
	StarIcon,
	TargetIcon,
	TerminalIcon,
	TextBIcon,
	TextItalicIcon,
	TextUnderlineIcon,
	TrashIcon,
	TrayArrowDownIcon,
	TruckIcon,
	UploadSimpleIcon,
	UserIcon,
	UsersIcon,
	WalletIcon,
	WarningCircleIcon,
	WarningIcon,
	WifiHighIcon,
	WifiSlashIcon,
	WrenchIcon,
	XCircleIcon,
	XIcon,
} from "@phosphor-icons/react";
import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";

// ---------------------------------------------------------------------------
// Icon registry — categorized for browsing
// ---------------------------------------------------------------------------

type IconEntry = { component: Icon; name: string; tags: string[] };

const icons: IconEntry[] = [
	// Navigation & direction
	{ component: ArrowLeftIcon, name: "ArrowLeftIcon", tags: ["navigation"] },
	{ component: ArrowRightIcon, name: "ArrowRightIcon", tags: ["navigation"] },
	{ component: CaretDownIcon, name: "CaretDownIcon", tags: ["navigation"] },
	{ component: CaretLeftIcon, name: "CaretLeftIcon", tags: ["navigation"] },
	{ component: CaretRightIcon, name: "CaretRightIcon", tags: ["navigation"] },
	{ component: CaretUpIcon, name: "CaretUpIcon", tags: ["navigation"] },
	{ component: CaretUpDownIcon, name: "CaretUpDownIcon", tags: ["navigation"] },
	{ component: HouseIcon, name: "HouseIcon", tags: ["navigation"] },
	{ component: ListIcon, name: "ListIcon", tags: ["navigation"] },
	{ component: SidebarSimpleIcon, name: "SidebarSimpleIcon", tags: ["navigation"] },
	{ component: SignOutIcon, name: "SignOutIcon", tags: ["navigation"] },

	// Actions
	{ component: ArrowsClockwiseIcon, name: "ArrowsClockwiseIcon", tags: ["action"] },
	{ component: ArrowSquareOutIcon, name: "ArrowSquareOutIcon", tags: ["action"] },
	{ component: CheckIcon, name: "CheckIcon", tags: ["action"] },
	{ component: CopyIcon, name: "CopyIcon", tags: ["action"] },
	{ component: CornersOutIcon, name: "CornersOutIcon", tags: ["action"] },
	{ component: DownloadIcon, name: "DownloadIcon", tags: ["action"] },
	{ component: EyeIcon, name: "EyeIcon", tags: ["action"] },
	{ component: FunnelIcon, name: "FunnelIcon", tags: ["action"] },
	{ component: MagnifyingGlassIcon, name: "MagnifyingGlassIcon", tags: ["action"] },
	{ component: PencilIcon, name: "PencilIcon", tags: ["action"] },
	{ component: PlayIcon, name: "PlayIcon", tags: ["action"] },
	{ component: PlusIcon, name: "PlusIcon", tags: ["action"] },
	{ component: TrashIcon, name: "TrashIcon", tags: ["action"] },
	{ component: UploadSimpleIcon, name: "UploadSimpleIcon", tags: ["action"] },
	{ component: XIcon, name: "XIcon", tags: ["action"] },

	// Status & feedback
	{ component: CheckCircleIcon, name: "CheckCircleIcon", tags: ["status"] },
	{ component: InfoIcon, name: "InfoIcon", tags: ["status"] },
	{ component: PulseIcon, name: "PulseIcon", tags: ["status"] },
	{ component: SpinnerGapIcon, name: "SpinnerGapIcon", tags: ["status"] },
	{ component: WarningCircleIcon, name: "WarningCircleIcon", tags: ["status"] },
	{ component: WarningIcon, name: "WarningIcon", tags: ["status"] },
	{ component: XCircleIcon, name: "XCircleIcon", tags: ["status"] },

	// Communication
	{ component: BellIcon, name: "BellIcon", tags: ["comms"] },
	{ component: BroadcastIcon, name: "BroadcastIcon", tags: ["comms"] },
	{ component: ChatTextIcon, name: "ChatTextIcon", tags: ["comms"] },
	{ component: EnvelopeIcon, name: "EnvelopeIcon", tags: ["comms"] },
	{ component: PaperPlaneTiltIcon, name: "PaperPlaneTiltIcon", tags: ["comms"] },

	// Emergency & operations
	{ component: AirplaneTiltIcon, name: "AirplaneTiltIcon", tags: ["emergency"] },
	{ component: CrosshairIcon, name: "CrosshairIcon", tags: ["emergency"] },
	{ component: DropIcon, name: "DropIcon", tags: ["emergency"] },
	{ component: FirstAidKitIcon, name: "FirstAidKitIcon", tags: ["emergency"] },
	{ component: FlameIcon, name: "FlameIcon", tags: ["emergency"] },
	{ component: LightningIcon, name: "LightningIcon", tags: ["emergency"] },
	{ component: MapPinIcon, name: "MapPinIcon", tags: ["emergency"] },
	{ component: SirenIcon, name: "SirenIcon", tags: ["emergency"] },
	{ component: TargetIcon, name: "TargetIcon", tags: ["emergency"] },
	{ component: TruckIcon, name: "TruckIcon", tags: ["emergency"] },

	// Content & data
	{ component: ChartLineIcon, name: "ChartLineIcon", tags: ["content"] },
	{ component: BookOpenIcon, name: "BookOpenIcon", tags: ["content"] },
	{ component: CalendarIcon, name: "CalendarIcon", tags: ["content"] },
	{ component: CircleIcon, name: "CircleIcon", tags: ["content"] },
	{ component: ClipboardTextIcon, name: "ClipboardTextIcon", tags: ["content"] },
	{ component: ClockIcon, name: "ClockIcon", tags: ["content"] },
	{ component: CurrencyCircleDollarIcon, name: "CurrencyCircleDollarIcon", tags: ["content"] },
	{ component: DatabaseIcon, name: "DatabaseIcon", tags: ["content"] },
	{ component: DotsThreeIcon, name: "DotsThreeIcon", tags: ["content"] },
	{ component: FileCodeIcon, name: "FileCodeIcon", tags: ["content"] },
	{ component: FileImageIcon, name: "FileImageIcon", tags: ["content"] },
	{ component: FileTextIcon, name: "FileTextIcon", tags: ["content"] },
	{ component: LinkIcon, name: "LinkIcon", tags: ["content"] },
	{ component: LinkBreakIcon, name: "LinkBreakIcon", tags: ["content"] },
	{ component: MinusIcon, name: "MinusIcon", tags: ["content"] },
	{ component: PackageIcon, name: "PackageIcon", tags: ["content"] },
	{ component: RadioIcon, name: "RadioIcon", tags: ["content"] },
	{ component: SquareIcon, name: "SquareIcon", tags: ["content"] },
	{ component: StarIcon, name: "StarIcon", tags: ["content"] },
	{ component: TrayArrowDownIcon, name: "TrayArrowDownIcon", tags: ["content"] },
	{ component: UserIcon, name: "UserIcon", tags: ["content"] },
	{ component: UsersIcon, name: "UsersIcon", tags: ["content"] },
	{ component: WalletIcon, name: "WalletIcon", tags: ["content"] },

	// Settings & security
	{ component: BatteryFullIcon, name: "BatteryFullIcon", tags: ["settings"] },
	{ component: BrainIcon, name: "BrainIcon", tags: ["settings"] },
	{ component: CellSignalFullIcon, name: "CellSignalFullIcon", tags: ["settings"] },
	{ component: DesktopIcon, name: "DesktopIcon", tags: ["settings"] },
	{ component: GearIcon, name: "GearIcon", tags: ["settings"] },
	{ component: GitBranchIcon, name: "GitBranchIcon", tags: ["settings"] },
	{ component: GlobeIcon, name: "GlobeIcon", tags: ["settings"] },
	{ component: LockIcon, name: "LockIcon", tags: ["settings"] },
	{ component: ShieldCheckIcon, name: "ShieldCheckIcon", tags: ["settings"] },
	{ component: ShieldSlashIcon, name: "ShieldSlashIcon", tags: ["settings"] },
	{ component: SlidersHorizontalIcon, name: "SlidersHorizontalIcon", tags: ["settings"] },
	{ component: TerminalIcon, name: "TerminalIcon", tags: ["settings"] },
	{ component: WifiHighIcon, name: "WifiHighIcon", tags: ["settings"] },
	{ component: WifiSlashIcon, name: "WifiSlashIcon", tags: ["settings"] },
	{ component: WrenchIcon, name: "WrenchIcon", tags: ["settings"] },

	// Text formatting
	{ component: TextBIcon, name: "TextBIcon", tags: ["formatting"] },
	{ component: TextItalicIcon, name: "TextItalicIcon", tags: ["formatting"] },
	{ component: TextUnderlineIcon, name: "TextUnderlineIcon", tags: ["formatting"] },
];

const categories = [
	{ label: "All", value: "all" },
	{ label: "Navigation", value: "navigation" },
	{ label: "Actions", value: "action" },
	{ label: "Status", value: "status" },
	{ label: "Comms", value: "comms" },
	{ label: "Emergency", value: "emergency" },
	{ label: "Content", value: "content" },
	{ label: "Settings", value: "settings" },
	{ label: "Formatting", value: "formatting" },
] as const;

const weights: IconWeight[] = ["thin", "light", "regular", "bold", "fill", "duotone"];

// ---------------------------------------------------------------------------
// Shared styles
// ---------------------------------------------------------------------------

const labelStyle: React.CSSProperties = {
	color: "var(--color-muted-foreground)",
	fontSize: "0.625rem",
	fontFamily: "var(--font-data)",
	textAlign: "center",
};

const sectionLabel: React.CSSProperties = {
	color: "var(--color-muted-foreground)",
	fontSize: "0.6875rem",
	fontFamily: "var(--font-data)",
	letterSpacing: "0.05em",
	textTransform: "uppercase",
};

const pillBase: React.CSSProperties = {
	border: "1px solid var(--color-border)",
	borderRadius: "var(--radius)",
	cursor: "pointer",
	fontFamily: "var(--font-data)",
	fontSize: "0.6875rem",
	padding: "0.25rem 0.625rem",
	transition: "all 150ms",
};

const cardStyle: React.CSSProperties = {
	alignItems: "center",
	border: "1px solid transparent",
	borderRadius: "var(--radius)",
	cursor: "pointer",
	display: "flex",
	flexDirection: "column",
	gap: "0.5rem",
	padding: "0.75rem",
	transition: "all 150ms",
};

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------

const meta: Meta = {
	parameters: { layout: "padded" },
	title: "Foundation/Icons",
};

export default meta;
type Story = StoryObj;

// ---------------------------------------------------------------------------
// Gallery — searchable, filterable, click-to-copy
// ---------------------------------------------------------------------------

function IconGallery() {
	const [search, setSearch] = useState("");
	const [category, setCategory] = useState<string>("all");
	const [copied, setCopied] = useState<string | null>(null);

	const filtered = icons.filter((icon) => {
		const matchesSearch = icon.name.toLowerCase().includes(search.toLowerCase());
		const matchesCategory = category === "all" || icon.tags.includes(category);
		return matchesSearch && matchesCategory;
	});

	function handleCopy(name: string) {
		void navigator.clipboard.writeText(`import { ${name} } from "@phosphor-icons/react";`);
		setCopied(name);
		setTimeout(() => setCopied(null), 1500);
	}

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
			{/* Search + filters */}
			<div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center" }}>
				<div style={{ position: "relative" }}>
					<MagnifyingGlassIcon
						className="size-4"
						style={{
							color: "var(--color-muted-foreground)",
							left: "0.625rem",
							position: "absolute",
							top: "50%",
							transform: "translateY(-50%)",
						}}
						weight="light"
					/>
					<input
						onChange={(e) => setSearch(e.target.value)}
						placeholder="Search icons..."
						style={{
							background: "var(--color-surface)",
							border: "1px solid var(--color-border)",
							borderRadius: "var(--radius)",
							color: "var(--color-foreground)",
							fontFamily: "var(--font-data)",
							fontSize: "0.8125rem",
							outline: "none",
							padding: "0.375rem 0.625rem 0.375rem 2rem",
							width: "14rem",
						}}
						type="text"
						value={search}
					/>
				</div>
				<div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem" }}>
					{categories.map((cat) => (
						<button
							key={cat.value}
							onClick={() => setCategory(cat.value)}
							style={{
								...pillBase,
								background: category === cat.value ? "var(--color-primary)" : "transparent",
								color:
									category === cat.value
										? "var(--color-primary-foreground)"
										: "var(--color-muted-foreground)",
							}}
							type="button"
						>
							{cat.label}
						</button>
					))}
				</div>
				<span style={{ ...sectionLabel, marginLeft: "auto" }}>
					{filtered.length} icon{filtered.length !== 1 ? "s" : ""}
				</span>
			</div>

			{/* Grid */}
			<div
				style={{
					display: "grid",
					gap: "0.5rem",
					gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))",
				}}
			>
				{filtered.map(({ component: IconComponent, name }) => (
					<div
						key={name}
						onClick={() => handleCopy(name)}
						onKeyDown={(e) => e.key === "Enter" && handleCopy(name)}
						role="button"
						style={{
							...cardStyle,
							background: copied === name ? "var(--color-success)" : "var(--color-surface)",
							borderColor: copied === name ? "var(--color-success)" : "transparent",
						}}
						tabIndex={0}
						title={`Click to copy import for ${name}`}
					>
						<IconComponent
							className="size-6"
							style={{ color: copied === name ? "var(--color-background)" : undefined }}
							weight="light"
						/>
						<span
							style={{
								...labelStyle,
								color:
									copied === name ? "var(--color-background)" : "var(--color-muted-foreground)",
							}}
						>
							{copied === name ? "Copied!" : name.replace("Icon", "")}
						</span>
					</div>
				))}
			</div>

			{filtered.length === 0 && (
				<div
					style={{
						alignItems: "center",
						color: "var(--color-muted-foreground)",
						display: "flex",
						flexDirection: "column",
						gap: "0.5rem",
						padding: "3rem",
					}}
				>
					<FileTextIcon className="size-8" weight="light" />
					<span style={{ fontSize: "0.875rem" }}>No icons match "{search}"</span>
				</div>
			)}
		</div>
	);
}

export const Gallery: Story = {
	render: () => <IconGallery />,
};

// ---------------------------------------------------------------------------
// Weight Comparison — multiple icons across all 6 weights
// ---------------------------------------------------------------------------

const weightShowcase: Icon[] = [
	CheckIcon,
	CaretRightIcon,
	WarningIcon,
	GearIcon,
	MapPinIcon,
	LockIcon,
	SirenIcon,
	FlameIcon,
];
const weightShowcaseNames = [
	"Check",
	"CaretRight",
	"Warning",
	"Gear",
	"MapPin",
	"Lock",
	"Siren",
	"Flame",
];

export const Weights: Story = {
	render: () => (
		<div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
			<div
				style={{
					alignItems: "center",
					columnGap: "2rem",
					display: "grid",
					gridTemplateColumns: `8rem repeat(${weights.length}, 1fr)`,
					rowGap: "1.25rem",
				}}
			>
				{/* Header row */}
				<div />
				{weights.map((w) => (
					<div key={w} style={{ ...sectionLabel, textAlign: "center" }}>
						{w}
						{w === "light" ? " *" : ""}
					</div>
				))}

				{/* Icon rows */}
				{weightShowcase.map((IconComponent, i) => (
					<>
						<div
							key={`label-${weightShowcaseNames[i]}`}
							style={{ ...labelStyle, textAlign: "left" }}
						>
							{weightShowcaseNames[i]}
						</div>
						{weights.map((w) => (
							<div
								key={`${weightShowcaseNames[i]}-${w}`}
								style={{
									alignItems: "center",
									background: w === "light" ? "var(--color-surface)" : undefined,
									borderRadius: "var(--radius)",
									display: "flex",
									justifyContent: "center",
									padding: "0.5rem",
								}}
							>
								<IconComponent className="size-6" weight={w} />
							</div>
						))}
					</>
				))}
			</div>
			<span style={sectionLabel}>* library default</span>
		</div>
	),
};

// ---------------------------------------------------------------------------
// Sizes — side-by-side scale ramp
// ---------------------------------------------------------------------------

const sizeRamp = [
	{ className: "size-3", label: "12px", token: "size-3" },
	{ className: "size-3.5", label: "14px", token: "size-3.5" },
	{ className: "size-4", label: "16px", token: "size-4" },
	{ className: "size-5", label: "20px", token: "size-5" },
	{ className: "size-6", label: "24px", token: "size-6" },
	{ className: "size-8", label: "32px", token: "size-8" },
	{ className: "size-10", label: "40px", token: "size-10" },
	{ className: "size-12", label: "48px", token: "size-12" },
];

export const Sizes: Story = {
	render: () => (
		<div style={{ alignItems: "flex-end", display: "flex", gap: "2rem" }}>
			{sizeRamp.map(({ className, label, token }) => (
				<div
					key={token}
					style={{
						alignItems: "center",
						display: "flex",
						flexDirection: "column",
						gap: "0.5rem",
					}}
				>
					<CheckIcon className={className} weight="light" />
					<span style={labelStyle}>{token}</span>
					<span style={{ ...labelStyle, opacity: 0.6 }}>{label}</span>
				</div>
			))}
		</div>
	),
};

// ---------------------------------------------------------------------------
// Color Tokens — icons colored with the design system palette
// ---------------------------------------------------------------------------

const colorTokens = [
	{ label: "foreground", value: "var(--color-foreground)" },
	{ label: "muted", value: "var(--color-muted-foreground)" },
	{ label: "primary", value: "var(--color-primary)" },
	{ label: "destructive", value: "var(--color-destructive)" },
	{ label: "info", value: "var(--color-info)" },
	{ label: "success", value: "var(--color-success)" },
	{ label: "warning", value: "var(--color-warning)" },
];

export const Colors: Story = {
	render: () => (
		<div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
			<div style={{ display: "flex", gap: "2.5rem" }}>
				{colorTokens.map(({ label, value }) => (
					<div
						key={label}
						style={{
							alignItems: "center",
							display: "flex",
							flexDirection: "column",
							gap: "0.75rem",
						}}
					>
						<div
							style={{
								display: "flex",
								flexDirection: "column",
								alignItems: "center",
								gap: "0.375rem",
							}}
						>
							<InfoIcon className="size-6" style={{ color: value }} weight="light" />
							<WarningIcon className="size-6" style={{ color: value }} weight="light" />
							<CheckCircleIcon className="size-6" style={{ color: value }} weight="light" />
						</div>
						<span style={labelStyle}>{label}</span>
					</div>
				))}
			</div>
		</div>
	),
};

// ---------------------------------------------------------------------------
// Semantic Pairings — icons used together in common UI patterns
// ---------------------------------------------------------------------------

const pairings: { icons: { component: Icon; weight?: IconWeight }[]; label: string }[] = [
	{
		icons: [
			{ component: CheckCircleIcon },
			{ component: InfoIcon },
			{ component: WarningIcon },
			{ component: XCircleIcon },
		],
		label: "Toast / Alert severity",
	},
	{
		icons: [
			{ component: CaretLeftIcon },
			{ component: CaretRightIcon },
			{ component: CaretUpIcon },
			{ component: CaretDownIcon },
		],
		label: "Directional navigation",
	},
	{
		icons: [
			{ component: CopyIcon },
			{ component: PencilIcon },
			{ component: TrashIcon },
			{ component: DownloadIcon },
			{ component: UploadSimpleIcon },
		],
		label: "CRUD actions",
	},
	{
		icons: [
			{ component: MagnifyingGlassIcon },
			{ component: FunnelIcon },
			{ component: SlidersHorizontalIcon },
			{ component: CaretUpDownIcon },
		],
		label: "Search & filter",
	},
	{
		icons: [
			{ component: LockIcon },
			{ component: ShieldCheckIcon },
			{ component: ShieldSlashIcon },
			{ component: EyeIcon },
		],
		label: "Security & privacy",
	},
	{
		icons: [
			{ component: SpinnerGapIcon },
			{ component: ClockIcon },
			{ component: PulseIcon },
			{ component: ArrowsClockwiseIcon },
		],
		label: "Loading & activity",
	},
	{
		icons: [
			{ component: SirenIcon },
			{ component: FirstAidKitIcon },
			{ component: FlameIcon },
			{ component: CrosshairIcon },
			{ component: TruckIcon },
		],
		label: "Emergency ops",
	},
	{
		icons: [
			{ component: AirplaneTiltIcon },
			{ component: MapPinIcon },
			{ component: TargetIcon },
			{ component: BroadcastIcon },
		],
		label: "Fleet & location",
	},
	{
		icons: [
			{ component: WifiHighIcon },
			{ component: WifiSlashIcon },
			{ component: CellSignalFullIcon },
			{ component: BatteryFullIcon },
		],
		label: "Connectivity & power",
	},
	{
		icons: [
			{ component: BellIcon },
			{ component: ChatTextIcon },
			{ component: EnvelopeIcon },
			{ component: PaperPlaneTiltIcon },
		],
		label: "Communication",
	},
];

export const SemanticPairings: Story = {
	name: "Semantic Pairings",
	render: () => (
		<div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
			{pairings.map(({ icons: groupIcons, label }) => (
				<div key={label} style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
					<span style={{ ...sectionLabel, minWidth: "12rem" }}>{label}</span>
					<div style={{ display: "flex", gap: "1rem" }}>
						{groupIcons.map(({ component: IconComponent }, i) => (
							<div
								key={`${label}-${i}`}
								style={{
									...cardStyle,
									background: "var(--color-surface)",
									cursor: "default",
									padding: "0.625rem",
								}}
							>
								<IconComponent className="size-5" weight="light" />
							</div>
						))}
					</div>
				</div>
			))}
		</div>
	),
};

// ---------------------------------------------------------------------------
// Animated — spinner, loading states
// ---------------------------------------------------------------------------

export const Animated: Story = {
	render: () => (
		<div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
			<div style={{ display: "flex", gap: "2.5rem", alignItems: "flex-start" }}>
				{/* Spinner */}
				<div
					style={{ alignItems: "center", display: "flex", flexDirection: "column", gap: "0.75rem" }}
				>
					<SpinnerGapIcon className="size-6 animate-spin" weight="light" />
					<span style={labelStyle}>animate-spin</span>
					<code
						style={{
							background: "var(--color-surface)",
							borderRadius: "var(--radius)",
							color: "var(--color-mono)",
							fontFamily: "var(--font-data)",
							fontSize: "0.5625rem",
							padding: "0.25rem 0.5rem",
						}}
					>
						className="animate-spin"
					</code>
				</div>

				{/* Pulse */}
				<div
					style={{ alignItems: "center", display: "flex", flexDirection: "column", gap: "0.75rem" }}
				>
					<BroadcastIcon className="size-6 animate-pulse" weight="light" />
					<span style={labelStyle}>animate-pulse</span>
					<code
						style={{
							background: "var(--color-surface)",
							borderRadius: "var(--radius)",
							color: "var(--color-mono)",
							fontFamily: "var(--font-data)",
							fontSize: "0.5625rem",
							padding: "0.25rem 0.5rem",
						}}
					>
						className="animate-pulse"
					</code>
				</div>

				{/* Bounce */}
				<div
					style={{ alignItems: "center", display: "flex", flexDirection: "column", gap: "0.75rem" }}
				>
					<CaretDownIcon className="size-6 animate-bounce" weight="light" />
					<span style={labelStyle}>animate-bounce</span>
					<code
						style={{
							background: "var(--color-surface)",
							borderRadius: "var(--radius)",
							color: "var(--color-mono)",
							fontFamily: "var(--font-data)",
							fontSize: "0.5625rem",
							padding: "0.25rem 0.5rem",
						}}
					>
						className="animate-bounce"
					</code>
				</div>

				{/* Ping */}
				<div
					style={{ alignItems: "center", display: "flex", flexDirection: "column", gap: "0.75rem" }}
				>
					<div style={{ position: "relative", display: "inline-flex" }}>
						<SirenIcon className="size-6" weight="light" />
						<CircleIcon
							className="size-2 animate-ping"
							style={{
								color: "var(--color-destructive)",
								position: "absolute",
								right: "-2px",
								top: "-2px",
							}}
							weight="fill"
						/>
					</div>
					<span style={labelStyle}>animate-ping (alert)</span>
					<code
						style={{
							background: "var(--color-surface)",
							borderRadius: "var(--radius)",
							color: "var(--color-mono)",
							fontFamily: "var(--font-data)",
							fontSize: "0.5625rem",
							padding: "0.25rem 0.5rem",
						}}
					>
						notification dot
					</code>
				</div>
			</div>
		</div>
	),
};
