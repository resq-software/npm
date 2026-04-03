// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

/**
 * ResQ icon system — powered by @phosphor-icons/react.
 *
 * All icons follow the Phosphor naming convention (`*Icon` suffix).
 * The `weight` prop controls stroke weight: "thin" | "light" | "regular" | "bold" | "fill" | "duotone".
 * Default weight is "light" (matches the ResQ design system baseline).
 *
 * Re-exported types:
 * - `Icon`       — the base ForwardRefExoticComponent type for all icons
 * - `IconProps`  — props accepted by every icon (weight, size, color, className, …)
 * - `IconWeight` — the union of allowed weight strings
 *
 * Server Components: import from `@resq-sw/ui/icons/ssr` instead to avoid
 * the React.createContext call at module-init time.
 */

// ── Types ─────────────────────────────────────────────────────────────────────
export type { Icon, IconProps, IconWeight } from "@phosphor-icons/react";

// ── Navigation & chrome ───────────────────────────────────────────────────────
// UI shell controls, directional arrows, overflow menus, view toggles
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
} from "@phosphor-icons/react";

// ── Actions ───────────────────────────────────────────────────────────────────
// Verbs: things users do to content or the system
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
} from "@phosphor-icons/react";

// ── Status & feedback ─────────────────────────────────────────────────────────
// State indicators, severity levels, loading states
export {
	AlarmIcon,
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
	WarningOctagonIcon,
	XCircleIcon,
} from "@phosphor-icons/react";

// ── Communication ─────────────────────────────────────────────────────────────
// Messaging, alerts, voice, video, sharing, connectivity
export {
	BellIcon,
	BellRingingIcon,
	BellSlashIcon,
	BluetoothConnectedIcon,
	BluetoothSlashIcon,
	BroadcastIcon,
	CellTowerIcon,
	ChatTextIcon,
	EnvelopeIcon,
	HeadsetIcon,
	MegaphoneIcon,
	MicrophoneIcon,
	PaperPlaneTiltIcon,
	PhoneIcon,
	RadioIcon,
	RssIcon,
	ShareNetworkIcon,
	VideoCameraIcon,
	VideoCameraSlashIcon,
	WaveformIcon,
} from "@phosphor-icons/react";

// ── Emergency & field ops ─────────────────────────────────────────────────────
// ResQ domain: incident response, fleet, dispatch, triage, weather, hazmat
export {
	AirplaneInFlightIcon,
	AirplaneLandingIcon,
	AirplaneTakeoffIcon,
	AirplaneTiltIcon,
	AirTrafficControlIcon,
	AmbulanceIcon,
	AxeIcon,
	BedIcon,
	BinocularsIcon,
	BiohazardIcon,
	BoatIcon,
	BridgeIcon,
	BusIcon,
	CarIcon,
	CarSimpleIcon,
	CloudLightningIcon,
	CloudRainIcon,
	CompassIcon,
	CraneIcon,
	CrosshairIcon,
	DroneIcon,
	DropIcon,
	FalloutShelterIcon,
	FireExtinguisherIcon,
	FireIcon,
	FirstAidKitIcon,
	FlagIcon,
	FlameIcon,
	FlashlightIcon,
	FireTruckIcon,
	HandHeartIcon,
	HeartbeatIcon,
	HeartIcon,
	HospitalIcon,
	LadderIcon,
	LifebuoyIcon,
	LighthouseIcon,
	LightningIcon,
	MapPinIcon,
	MotorcycleIcon,
	MountainsIcon,
	NavigationArrowIcon,
	PathIcon,
	PersonArmsSpreadIcon,
	PersonSimpleBikeIcon,
	PersonSimpleHikeIcon,
	PersonSimpleRunIcon,
	PersonSimpleWalkIcon,
	PillIcon,
	PoliceCarIcon,
	RadioactiveIcon,
	RoadHorizonIcon,
	SirenIcon,
	SnowflakeIcon,
	StethoscopeIcon,
	SyringeIcon,
	TargetIcon,
	ThermometerIcon,
	TimerIcon,
	TornadoIcon,
	TruckIcon,
	TruckTrailerIcon,
	VanIcon,
	VirusIcon,
	WindIcon,
} from "@phosphor-icons/react";

// ── Identity & security ───────────────────────────────────────────────────────
// Authentication, verification, access control, trust signals
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
} from "@phosphor-icons/react";

// ── Data, content & files ─────────────────────────────────────────────────────
// Records, analytics, documents, links, people, geography
export {
	BookOpenIcon,
	BrainIcon,
	CalendarCheckIcon,
	CalendarIcon,
	CalendarPlusIcon,
	CalendarXIcon,
	ChartBarHorizontalIcon,
	ChartBarIcon,
	ChartDonutIcon,
	ChartLineIcon,
	ChartPieIcon,
	ChartScatterIcon,
	ClipboardTextIcon,
	ClockAfternoonIcon,
	ClockCountdownIcon,
	ClockIcon,
	ColumnsIcon,
	CurrencyCircleDollarIcon,
	DatabaseIcon,
	FileCodeIcon,
	FileImageIcon,
	FileTextIcon,
	FolderIcon,
	FolderOpenIcon,
	GlobeIcon,
	HashIcon,
	LinkBreakIcon,
	LinkIcon,
	ListBulletsIcon,
	ListNumbersIcon,
	MapPinAreaIcon,
	MapPinLineIcon,
	MapPinPlusIcon,
	MapPinSimpleIcon,
	MapTrifoldIcon,
	PackageIcon,
	PercentIcon,
	PushPinIcon,
	StarIcon,
	TableIcon,
	TagIcon,
	TrayArrowDownIcon,
	UserCheckIcon,
	UserCircleIcon,
	UserFocusIcon,
	UserGearIcon,
	UserIcon,
	UserListIcon,
	UserMinusIcon,
	UserPlusIcon,
	UserSwitchIcon,
	UsersIcon,
	UsersFourIcon,
	UsersThreeIcon,
	WalletIcon,
} from "@phosphor-icons/react";

// ── Infrastructure & dev ──────────────────────────────────────────────────────
// Systems, connectivity, tooling, developer workflow
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
} from "@phosphor-icons/react";

// ── Text formatting ───────────────────────────────────────────────────────────
export {
	TextBIcon,
	TextItalicIcon,
	TextUnderlineIcon,
} from "@phosphor-icons/react";
