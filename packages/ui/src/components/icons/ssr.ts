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
	ArrowDownIcon,
	ArrowLeftIcon,
	ArrowRightIcon,
	ArrowSquareOutIcon,
	ArrowsInIcon,
	ArrowsOutIcon,
	ArrowUpIcon,
	CaretDownIcon,
	CaretLeftIcon,
	CaretRightIcon,
	CaretUpDownIcon,
	CaretUpIcon,
	DotsThreeIcon,
	DotsThreeVerticalIcon,
	HouseIcon,
	ListIcon,
	RowsIcon,
	SidebarSimpleIcon,
	SignOutIcon,
	SquaresFourIcon,
} from "@phosphor-icons/react/ssr";

// ── Actions ───────────────────────────────────────────────────────────────────
export {
	ArrowClockwiseIcon,
	ArrowCounterClockwiseIcon,
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
	SortAscendingIcon,
	SortDescendingIcon,
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
	HourglassIcon,
	HourglassMediumIcon,
	InfoIcon,
	MinusIcon,
	ProhibitIcon,
	PulseIcon,
	QuestionIcon,
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
	BellRingingIcon,
	BellSlashIcon,
	BroadcastIcon,
	ChatTextIcon,
	EnvelopeIcon,
	HeadsetIcon,
	MegaphoneIcon,
	MicrophoneIcon,
	PaperPlaneTiltIcon,
	PhoneIcon,
	RadioIcon,
	ShareNetworkIcon,
	VideoCameraIcon,
	VideoCameraSlashIcon,
} from "@phosphor-icons/react/ssr";

// ── Emergency & field ops ─────────────────────────────────────────────────────
export {
	AirplaneTiltIcon,
	AmbulanceIcon,
	BinocularsIcon,
	CloudLightningIcon,
	CloudRainIcon,
	CompassIcon,
	CrosshairIcon,
	DropIcon,
	FirstAidKitIcon,
	FlagIcon,
	FlameIcon,
	HeartbeatIcon,
	LightningIcon,
	MapPinIcon,
	NavigationArrowIcon,
	PersonSimpleRunIcon,
	SirenIcon,
	TargetIcon,
	ThermometerIcon,
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
	ChartBarHorizontalIcon,
	ChartBarIcon,
	ChartLineIcon,
	ChartPieIcon,
	ClipboardTextIcon,
	ClockIcon,
	CurrencyCircleDollarIcon,
	DatabaseIcon,
	FileCodeIcon,
	FileImageIcon,
	FileTextIcon,
	FolderIcon,
	FolderOpenIcon,
	GlobeIcon,
	LinkBreakIcon,
	LinkIcon,
	MapTrifoldIcon,
	PackageIcon,
	StarIcon,
	TagIcon,
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
	StackIcon,
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
