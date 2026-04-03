// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

/**
 * ResQ icon system — server-component-safe variant.
 *
 * Mirrors `@resq-sw/ui/icons` but imports from `@phosphor-icons/react/ssr`,
 * which uses SSRBase instead of IconBase and therefore does NOT call
 * React.createContext() at module initialisation time.
 *
 * Use this subpath in React Server Components (Next.js App Router, etc.)
 * where the CSR variant causes "createContext is not a function" errors
 * during static page-data collection.
 *
 * Usage:
 *   import { ArrowLeftIcon } from "@resq-sw/ui/icons/ssr";
 *
 * Note: context-based theming via <IconContext.Provider> is unavailable in
 * SSRBase icons. Pass weight, size, and color as props directly.
 */

// ── Types ─────────────────────────────────────────────────────────────────────
export type { Icon, IconProps, IconWeight } from "@phosphor-icons/react";

// ── Navigation & chrome ───────────────────────────────────────────────────────
export {
	ArrowLeftIcon,
	ArrowRightIcon,
	ArrowSquareOutIcon,
	CaretDownIcon,
	CaretLeftIcon,
	CaretRightIcon,
	CaretUpDownIcon,
	CaretUpIcon,
	DotsThreeIcon,
	DotsThreeVerticalIcon,
	HouseIcon,
	ListIcon,
	SidebarSimpleIcon,
	SignOutIcon,
} from "@phosphor-icons/react/ssr";

// ── Actions ───────────────────────────────────────────────────────────────────
export {
	ArrowClockwiseIcon,
	ArrowsClockwiseIcon,
	CheckIcon,
	ClipboardIcon,
	CopyIcon,
	CornersOutIcon,
	DownloadIcon,
	EyeIcon,
	EyeSlashIcon,
	FunnelIcon,
	MagnifyingGlassIcon,
	PencilIcon,
	PlayIcon,
	PlusIcon,
	ToggleLeftIcon,
	ToggleRightIcon,
	TrashIcon,
	UploadIcon,
	UploadSimpleIcon,
	XIcon,
} from "@phosphor-icons/react/ssr";

// ── Status & feedback ─────────────────────────────────────────────────────────
export {
	CheckCircleIcon,
	CircleIcon,
	InfoIcon,
	MinusIcon,
	PulseIcon,
	SpinnerGapIcon,
	SquareIcon,
	WarningCircleIcon,
	WarningDiamondIcon,
	WarningIcon,
	XCircleIcon,
} from "@phosphor-icons/react/ssr";

// ── Communication ─────────────────────────────────────────────────────────────
export {
	BellIcon,
	BroadcastIcon,
	ChatTextIcon,
	EnvelopeIcon,
	MicrophoneIcon,
	PaperPlaneTiltIcon,
	PhoneIcon,
	RadioIcon,
	ShareNetworkIcon,
} from "@phosphor-icons/react/ssr";

// ── Emergency & field ops ─────────────────────────────────────────────────────
export {
	AirplaneTiltIcon,
	AmbulanceIcon,
	CrosshairIcon,
	DropIcon,
	FirstAidKitIcon,
	FlameIcon,
	HeartbeatIcon,
	LightningIcon,
	MapPinIcon,
	NavigationArrowIcon,
	PersonSimpleRunIcon,
	SirenIcon,
	TargetIcon,
	TimerIcon,
	TruckIcon,
	WindIcon,
} from "@phosphor-icons/react/ssr";

// ── Identity & security ───────────────────────────────────────────────────────
export {
	FingerprintIcon,
	IdentificationCardIcon,
	KeyIcon,
	LockIcon,
	LockOpenIcon,
	QrCodeIcon,
	SealCheckIcon,
	ShieldCheckIcon,
	ShieldChevronIcon,
	ShieldIcon,
	ShieldPlusIcon,
	ShieldSlashIcon,
	ShieldWarningIcon,
} from "@phosphor-icons/react/ssr";

// ── Data, content & files ─────────────────────────────────────────────────────
export {
	BookOpenIcon,
	BrainIcon,
	CalendarIcon,
	ChartLineIcon,
	ClipboardTextIcon,
	ClockIcon,
	CurrencyCircleDollarIcon,
	DatabaseIcon,
	FileCodeIcon,
	FileImageIcon,
	FileTextIcon,
	GlobeIcon,
	LinkBreakIcon,
	LinkIcon,
	MapTrifoldIcon,
	PackageIcon,
	StarIcon,
	TrayArrowDownIcon,
	UserIcon,
	UsersIcon,
	WalletIcon,
} from "@phosphor-icons/react/ssr";

// ── Infrastructure & dev ──────────────────────────────────────────────────────
export {
	BatteryFullIcon,
	CellSignalFullIcon,
	CloudIcon,
	CodeIcon,
	CubeIcon,
	DesktopIcon,
	GearIcon,
	GearSixIcon,
	GitBranchIcon,
	GitCommitIcon,
	GitForkIcon,
	GitMergeIcon,
	GithubLogoIcon,
	HardDrivesIcon,
	NetworkIcon,
	PuzzlePieceIcon,
	SlidersHorizontalIcon,
	TerminalIcon,
	TerminalWindowIcon,
	WifiHighIcon,
	WifiSlashIcon,
	WrenchIcon,
} from "@phosphor-icons/react/ssr";

// ── Text formatting ───────────────────────────────────────────────────────────
export {
	TextBIcon,
	TextItalicIcon,
	TextUnderlineIcon,
} from "@phosphor-icons/react/ssr";
