// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import type { Icon, IconWeight } from "@phosphor-icons/react";
import {
	AirplaneInFlightIcon,
	AirplaneLandingIcon,
	AirplaneTakeoffIcon,
	AirplaneTiltIcon,
	AirTrafficControlIcon,
	AlarmIcon,
	AmbulanceIcon,
	ArrowBendUpLeftIcon,
	ArrowBendUpRightIcon,
	ArrowClockwiseIcon,
	ArrowCounterClockwiseIcon,
	ArrowDownIcon,
	ArrowLeftIcon,
	ArrowRightIcon,
	ArrowSquareOutIcon,
	ArrowUpIcon,
	ArrowsClockwiseIcon,
	ArrowsInIcon,
	ArrowsOutIcon,
	AxeIcon,
	BankIcon,
	BatteryChargingIcon,
	BatteryEmptyIcon,
	BatteryFullIcon,
	BatteryLowIcon,
	BedIcon,
	BellIcon,
	BellRingingIcon,
	BellSlashIcon,
	BinocularsIcon,
	BiohazardIcon,
	BluetoothConnectedIcon,
	BluetoothSlashIcon,
	BoatIcon,
	BookOpenIcon,
	BrainIcon,
	BridgeIcon,
	BroadcastIcon,
	BuildingApartmentIcon,
	BuildingOfficeIcon,
	BuildingsIcon,
	BusIcon,
	CalendarBlankIcon,
	CalendarCheckIcon,
	CalendarDotsIcon,
	CalendarIcon,
	CalendarPlusIcon,
	CalendarStarIcon,
	CalendarXIcon,
	CaretDownIcon,
	CaretLeftIcon,
	CaretRightIcon,
	CaretUpDownIcon,
	CaretUpIcon,
	CarIcon,
	CarSimpleIcon,
	CellSignalFullIcon,
	CellTowerIcon,
	ChartBarHorizontalIcon,
	ChartBarIcon,
	ChartDonutIcon,
	ChartLineIcon,
	ChartPieIcon,
	ChartScatterIcon,
	ChatTextIcon,
	CheckCircleIcon,
	CheckIcon,
	CircleIcon,
	ClipboardIcon,
	ClipboardTextIcon,
	ClockAfternoonIcon,
	ClockClockwiseIcon,
	ClockCountdownIcon,
	ClockCounterClockwiseIcon,
	ClockIcon,
	ClockUserIcon,
	CloudIcon,
	CloudLightningIcon,
	CloudRainIcon,
	CodeIcon,
	ColumnsIcon,
	CompassIcon,
	CopyIcon,
	CornersOutIcon,
	CraneIcon,
	CrosshairIcon,
	CubeIcon,
	CurrencyCircleDollarIcon,
	DatabaseIcon,
	DesktopIcon,
	DotsThreeIcon,
	DotsThreeVerticalIcon,
	DoorIcon,
	DownloadIcon,
	DroneIcon,
	DropIcon,
	EnvelopeIcon,
	EraserIcon,
	EyeIcon,
	EyeSlashIcon,
	FalloutShelterIcon,
	FactoryIcon,
	FileCodeIcon,
	FileImageIcon,
	FileTextIcon,
	FingerprintIcon,
	FireExtinguisherIcon,
	FireIcon,
	FireTruckIcon,
	FirstAidKitIcon,
	FlagIcon,
	FlameIcon,
	FlashlightIcon,
	FolderIcon,
	FolderOpenIcon,
	FastForwardIcon,
	FunnelIcon,
	GarageIcon,
	GasPumpIcon,
	GearIcon,
	GearSixIcon,
	GitBranchIcon,
	GitCommitIcon,
	GitForkIcon,
	GitMergeIcon,
	GithubLogoIcon,
	GlobeIcon,
	HandHeartIcon,
	HandIcon,
	HandPointingIcon,
	HandTapIcon,
	HardDrivesIcon,
	HashIcon,
	HeadsetIcon,
	HeartbeatIcon,
	HeartIcon,
	HospitalIcon,
	HourglassIcon,
	HourglassMediumIcon,
	HouseIcon,
	IdentificationCardIcon,
	InfoIcon,
	KeyIcon,
	LadderIcon,
	LifebuoyIcon,
	LighthouseIcon,
	LightningIcon,
	LinkBreakIcon,
	LinkIcon,
	ListBulletsIcon,
	ListChecksIcon,
	ListDashesIcon,
	ListIcon,
	ListNumbersIcon,
	LockIcon,
	LockOpenIcon,
	MagnifyingGlassIcon,
	MapPinAreaIcon,
	MapPinIcon,
	MapPinLineIcon,
	MapPinPlusIcon,
	MapPinSimpleIcon,
	MapTrifoldIcon,
	MegaphoneIcon,
	MicrophoneIcon,
	MinusIcon,
	MotorcycleIcon,
	MountainsIcon,
	NavigationArrowIcon,
	NetworkIcon,
	NoteIcon,
	NotebookIcon,
	NotePencilIcon,
	PackageIcon,
	PaperPlaneTiltIcon,
	PathIcon,
	PauseIcon,
	PencilIcon,
	PenIcon,
	PenNibIcon,
	PercentIcon,
	PersonArmsSpreadIcon,
	PersonSimpleBikeIcon,
	PersonSimpleHikeIcon,
	PersonSimpleRunIcon,
	PersonSimpleWalkIcon,
	PhoneIcon,
	PillIcon,
	PipeWrenchIcon,
	PlayIcon,
	PlugIcon,
	PoliceCarIcon,
	PlusIcon,
	ProhibitIcon,
	PulseIcon,
	PushPinIcon,
	PuzzlePieceIcon,
	QrCodeIcon,
	QuestionIcon,
	RadioactiveIcon,
	RadioIcon,
	RecordIcon,
	RepeatIcon,
	RewindIcon,
	RoadHorizonIcon,
	RowsIcon,
	RssIcon,
	SealCheckIcon,
	ShareNetworkIcon,
	ShieldCheckIcon,
	ShieldChevronIcon,
	ShieldIcon,
	ShieldPlusIcon,
	ShieldSlashIcon,
	ShieldWarningIcon,
	SidebarSimpleIcon,
	ShuffleIcon,
	SignatureIcon,
	SignOutIcon,
	SirenIcon,
	SkipBackIcon,
	SkipForwardIcon,
	SlidersHorizontalIcon,
	SnowflakeIcon,
	SolarPanelIcon,
	SortAscendingIcon,
	SortDescendingIcon,
	SpinnerGapIcon,
	SquareIcon,
	SquaresFourIcon,
	StackIcon,
	StarIcon,
	StethoscopeIcon,
	StopIcon,
	StorefrontIcon,
	SwapIcon,
	SyringeIcon,
	TableIcon,
	TagIcon,
	TargetIcon,
	TerminalIcon,
	TerminalWindowIcon,
	TextBIcon,
	TextItalicIcon,
	TextUnderlineIcon,
	ThermometerIcon,
	TimerIcon,
	ToggleLeftIcon,
	ToggleRightIcon,
	TornadoIcon,
	TrashIcon,
	TrayArrowDownIcon,
	TruckIcon,
	TentIcon,
	TruckTrailerIcon,
	UploadIcon,
	UploadSimpleIcon,
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
	VanIcon,
	VideoCameraIcon,
	WarehouseIcon,
	VideoCameraSlashIcon,
	VirusIcon,
	WalletIcon,
	WarningCircleIcon,
	WarningDiamondIcon,
	WarningIcon,
	WarningOctagonIcon,
	WaveformIcon,
	WifiHighIcon,
	WifiSlashIcon,
	WindIcon,
	WrenchIcon,
	XCircleIcon,
	XIcon,
} from "@phosphor-icons/react";
import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";

// ---------------------------------------------------------------------------
// Icon registry — categorised for browsing
// ---------------------------------------------------------------------------

type IconEntry = { component: Icon; name: string; tags: string[] };

const icons: IconEntry[] = [
	// Navigation & chrome
	{ component: ArrowDownIcon, name: "ArrowDownIcon", tags: ["nav"] },
	{ component: ArrowLeftIcon, name: "ArrowLeftIcon", tags: ["nav"] },
	{ component: ArrowRightIcon, name: "ArrowRightIcon", tags: ["nav"] },
	{ component: ArrowSquareOutIcon, name: "ArrowSquareOutIcon", tags: ["nav"] },
	{ component: ArrowUpIcon, name: "ArrowUpIcon", tags: ["nav"] },
	{ component: ArrowsInIcon, name: "ArrowsInIcon", tags: ["nav"] },
	{ component: ArrowsOutIcon, name: "ArrowsOutIcon", tags: ["nav"] },
	{ component: CaretDownIcon, name: "CaretDownIcon", tags: ["nav"] },
	{ component: CaretLeftIcon, name: "CaretLeftIcon", tags: ["nav"] },
	{ component: CaretRightIcon, name: "CaretRightIcon", tags: ["nav"] },
	{ component: CaretUpDownIcon, name: "CaretUpDownIcon", tags: ["nav"] },
	{ component: CaretUpIcon, name: "CaretUpIcon", tags: ["nav"] },
	{ component: DotsThreeIcon, name: "DotsThreeIcon", tags: ["nav"] },
	{ component: DotsThreeVerticalIcon, name: "DotsThreeVerticalIcon", tags: ["nav"] },
	{ component: HouseIcon, name: "HouseIcon", tags: ["nav"] },
	{ component: ListIcon, name: "ListIcon", tags: ["nav"] },
	{ component: RowsIcon, name: "RowsIcon", tags: ["nav"] },
	{ component: SidebarSimpleIcon, name: "SidebarSimpleIcon", tags: ["nav"] },
	{ component: SignOutIcon, name: "SignOutIcon", tags: ["nav"] },
	{ component: SquaresFourIcon, name: "SquaresFourIcon", tags: ["nav"] },

	// Actions
	{ component: ArrowBendUpLeftIcon, name: "ArrowBendUpLeftIcon", tags: ["action"] },
	{ component: ArrowBendUpRightIcon, name: "ArrowBendUpRightIcon", tags: ["action"] },
	{ component: ArrowClockwiseIcon, name: "ArrowClockwiseIcon", tags: ["action"] },
	{ component: ArrowCounterClockwiseIcon, name: "ArrowCounterClockwiseIcon", tags: ["action"] },
	{ component: ArrowsClockwiseIcon, name: "ArrowsClockwiseIcon", tags: ["action"] },
	{ component: CheckIcon, name: "CheckIcon", tags: ["action"] },
	{ component: ClipboardIcon, name: "ClipboardIcon", tags: ["action"] },
	{ component: CopyIcon, name: "CopyIcon", tags: ["action"] },
	{ component: CornersOutIcon, name: "CornersOutIcon", tags: ["action"] },
	{ component: DownloadIcon, name: "DownloadIcon", tags: ["action"] },
	{ component: EraserIcon, name: "EraserIcon", tags: ["action"] },
	{ component: EyeIcon, name: "EyeIcon", tags: ["action"] },
	{ component: EyeSlashIcon, name: "EyeSlashIcon", tags: ["action"] },
	{ component: FastForwardIcon, name: "FastForwardIcon", tags: ["action"] },
	{ component: FunnelIcon, name: "FunnelIcon", tags: ["action"] },
	{ component: HandIcon, name: "HandIcon", tags: ["action"] },
	{ component: HandPointingIcon, name: "HandPointingIcon", tags: ["action"] },
	{ component: HandTapIcon, name: "HandTapIcon", tags: ["action"] },
	{ component: MagnifyingGlassIcon, name: "MagnifyingGlassIcon", tags: ["action"] },
	{ component: PauseIcon, name: "PauseIcon", tags: ["action"] },
	{ component: PencilIcon, name: "PencilIcon", tags: ["action"] },
	{ component: PlayIcon, name: "PlayIcon", tags: ["action"] },
	{ component: PlusIcon, name: "PlusIcon", tags: ["action"] },
	{ component: RecordIcon, name: "RecordIcon", tags: ["action"] },
	{ component: RepeatIcon, name: "RepeatIcon", tags: ["action"] },
	{ component: RewindIcon, name: "RewindIcon", tags: ["action"] },
	{ component: ShuffleIcon, name: "ShuffleIcon", tags: ["action"] },
	{ component: SkipBackIcon, name: "SkipBackIcon", tags: ["action"] },
	{ component: SkipForwardIcon, name: "SkipForwardIcon", tags: ["action"] },
	{ component: SortAscendingIcon, name: "SortAscendingIcon", tags: ["action"] },
	{ component: SortDescendingIcon, name: "SortDescendingIcon", tags: ["action"] },
	{ component: StopIcon, name: "StopIcon", tags: ["action"] },
	{ component: SwapIcon, name: "SwapIcon", tags: ["action"] },
	{ component: ToggleLeftIcon, name: "ToggleLeftIcon", tags: ["action"] },
	{ component: ToggleRightIcon, name: "ToggleRightIcon", tags: ["action"] },
	{ component: TrashIcon, name: "TrashIcon", tags: ["action"] },
	{ component: UploadIcon, name: "UploadIcon", tags: ["action"] },
	{ component: UploadSimpleIcon, name: "UploadSimpleIcon", tags: ["action"] },
	{ component: XIcon, name: "XIcon", tags: ["action"] },

	// Status & feedback
	{ component: AlarmIcon, name: "AlarmIcon", tags: ["status"] },
	{ component: CheckCircleIcon, name: "CheckCircleIcon", tags: ["status"] },
	{ component: CircleIcon, name: "CircleIcon", tags: ["status"] },
	{ component: HourglassIcon, name: "HourglassIcon", tags: ["status"] },
	{ component: HourglassMediumIcon, name: "HourglassMediumIcon", tags: ["status"] },
	{ component: InfoIcon, name: "InfoIcon", tags: ["status"] },
	{ component: MinusIcon, name: "MinusIcon", tags: ["status"] },
	{ component: ProhibitIcon, name: "ProhibitIcon", tags: ["status"] },
	{ component: PulseIcon, name: "PulseIcon", tags: ["status"] },
	{ component: QuestionIcon, name: "QuestionIcon", tags: ["status"] },
	{ component: SpinnerGapIcon, name: "SpinnerGapIcon", tags: ["status"] },
	{ component: SquareIcon, name: "SquareIcon", tags: ["status"] },
	{ component: WarningCircleIcon, name: "WarningCircleIcon", tags: ["status"] },
	{ component: WarningDiamondIcon, name: "WarningDiamondIcon", tags: ["status"] },
	{ component: WarningIcon, name: "WarningIcon", tags: ["status"] },
	{ component: WarningOctagonIcon, name: "WarningOctagonIcon", tags: ["status"] },
	{ component: XCircleIcon, name: "XCircleIcon", tags: ["status"] },

	// Communication
	{ component: BellIcon, name: "BellIcon", tags: ["comms"] },
	{ component: BellRingingIcon, name: "BellRingingIcon", tags: ["comms"] },
	{ component: BellSlashIcon, name: "BellSlashIcon", tags: ["comms"] },
	{ component: BluetoothConnectedIcon, name: "BluetoothConnectedIcon", tags: ["comms"] },
	{ component: BluetoothSlashIcon, name: "BluetoothSlashIcon", tags: ["comms"] },
	{ component: BroadcastIcon, name: "BroadcastIcon", tags: ["comms"] },
	{ component: CellTowerIcon, name: "CellTowerIcon", tags: ["comms"] },
	{ component: ChatTextIcon, name: "ChatTextIcon", tags: ["comms"] },
	{ component: EnvelopeIcon, name: "EnvelopeIcon", tags: ["comms"] },
	{ component: HeadsetIcon, name: "HeadsetIcon", tags: ["comms"] },
	{ component: MegaphoneIcon, name: "MegaphoneIcon", tags: ["comms"] },
	{ component: MicrophoneIcon, name: "MicrophoneIcon", tags: ["comms"] },
	{ component: PaperPlaneTiltIcon, name: "PaperPlaneTiltIcon", tags: ["comms"] },
	{ component: PhoneIcon, name: "PhoneIcon", tags: ["comms"] },
	{ component: RadioIcon, name: "RadioIcon", tags: ["comms"] },
	{ component: RssIcon, name: "RssIcon", tags: ["comms"] },
	{ component: ShareNetworkIcon, name: "ShareNetworkIcon", tags: ["comms"] },
	{ component: VideoCameraIcon, name: "VideoCameraIcon", tags: ["comms"] },
	{ component: VideoCameraSlashIcon, name: "VideoCameraSlashIcon", tags: ["comms"] },
	{ component: WaveformIcon, name: "WaveformIcon", tags: ["comms"] },

	// Emergency & field ops
	{ component: AirplaneInFlightIcon, name: "AirplaneInFlightIcon", tags: ["emergency"] },
	{ component: AirplaneLandingIcon, name: "AirplaneLandingIcon", tags: ["emergency"] },
	{ component: AirplaneTakeoffIcon, name: "AirplaneTakeoffIcon", tags: ["emergency"] },
	{ component: AirplaneTiltIcon, name: "AirplaneTiltIcon", tags: ["emergency"] },
	{ component: AirTrafficControlIcon, name: "AirTrafficControlIcon", tags: ["emergency"] },
	{ component: AmbulanceIcon, name: "AmbulanceIcon", tags: ["emergency"] },
	{ component: AxeIcon, name: "AxeIcon", tags: ["emergency"] },
	{ component: BedIcon, name: "BedIcon", tags: ["emergency"] },
	{ component: BinocularsIcon, name: "BinocularsIcon", tags: ["emergency"] },
	{ component: BiohazardIcon, name: "BiohazardIcon", tags: ["emergency"] },
	{ component: BoatIcon, name: "BoatIcon", tags: ["emergency"] },
	{ component: BridgeIcon, name: "BridgeIcon", tags: ["emergency"] },
	{ component: BusIcon, name: "BusIcon", tags: ["emergency"] },
	{ component: CarIcon, name: "CarIcon", tags: ["emergency"] },
	{ component: CarSimpleIcon, name: "CarSimpleIcon", tags: ["emergency"] },
	{ component: CloudLightningIcon, name: "CloudLightningIcon", tags: ["emergency"] },
	{ component: CloudRainIcon, name: "CloudRainIcon", tags: ["emergency"] },
	{ component: CompassIcon, name: "CompassIcon", tags: ["emergency"] },
	{ component: CraneIcon, name: "CraneIcon", tags: ["emergency"] },
	{ component: CrosshairIcon, name: "CrosshairIcon", tags: ["emergency"] },
	{ component: DroneIcon, name: "DroneIcon", tags: ["emergency"] },
	{ component: DropIcon, name: "DropIcon", tags: ["emergency"] },
	{ component: FalloutShelterIcon, name: "FalloutShelterIcon", tags: ["emergency"] },
	{ component: FireExtinguisherIcon, name: "FireExtinguisherIcon", tags: ["emergency"] },
	{ component: FireIcon, name: "FireIcon", tags: ["emergency"] },
	{ component: FireTruckIcon, name: "FireTruckIcon", tags: ["emergency"] },
	{ component: FirstAidKitIcon, name: "FirstAidKitIcon", tags: ["emergency"] },
	{ component: FlagIcon, name: "FlagIcon", tags: ["emergency"] },
	{ component: FlameIcon, name: "FlameIcon", tags: ["emergency"] },
	{ component: FlashlightIcon, name: "FlashlightIcon", tags: ["emergency"] },
	{ component: HandHeartIcon, name: "HandHeartIcon", tags: ["emergency"] },
	{ component: HeartbeatIcon, name: "HeartbeatIcon", tags: ["emergency"] },
	{ component: HeartIcon, name: "HeartIcon", tags: ["emergency"] },
	{ component: HospitalIcon, name: "HospitalIcon", tags: ["emergency"] },
	{ component: LadderIcon, name: "LadderIcon", tags: ["emergency"] },
	{ component: LifebuoyIcon, name: "LifebuoyIcon", tags: ["emergency"] },
	{ component: LighthouseIcon, name: "LighthouseIcon", tags: ["emergency"] },
	{ component: LightningIcon, name: "LightningIcon", tags: ["emergency"] },
	{ component: MapPinIcon, name: "MapPinIcon", tags: ["emergency"] },
	{ component: MotorcycleIcon, name: "MotorcycleIcon", tags: ["emergency"] },
	{ component: MountainsIcon, name: "MountainsIcon", tags: ["emergency"] },
	{ component: NavigationArrowIcon, name: "NavigationArrowIcon", tags: ["emergency"] },
	{ component: PathIcon, name: "PathIcon", tags: ["emergency"] },
	{ component: PersonArmsSpreadIcon, name: "PersonArmsSpreadIcon", tags: ["emergency"] },
	{ component: PersonSimpleBikeIcon, name: "PersonSimpleBikeIcon", tags: ["emergency"] },
	{ component: PersonSimpleHikeIcon, name: "PersonSimpleHikeIcon", tags: ["emergency"] },
	{ component: PersonSimpleRunIcon, name: "PersonSimpleRunIcon", tags: ["emergency"] },
	{ component: PersonSimpleWalkIcon, name: "PersonSimpleWalkIcon", tags: ["emergency"] },
	{ component: PillIcon, name: "PillIcon", tags: ["emergency"] },
	{ component: PoliceCarIcon, name: "PoliceCarIcon", tags: ["emergency"] },
	{ component: RadioactiveIcon, name: "RadioactiveIcon", tags: ["emergency"] },
	{ component: RoadHorizonIcon, name: "RoadHorizonIcon", tags: ["emergency"] },
	{ component: SirenIcon, name: "SirenIcon", tags: ["emergency"] },
	{ component: SnowflakeIcon, name: "SnowflakeIcon", tags: ["emergency"] },
	{ component: StethoscopeIcon, name: "StethoscopeIcon", tags: ["emergency"] },
	{ component: SyringeIcon, name: "SyringeIcon", tags: ["emergency"] },
	{ component: TargetIcon, name: "TargetIcon", tags: ["emergency"] },
	{ component: ThermometerIcon, name: "ThermometerIcon", tags: ["emergency"] },
	{ component: TimerIcon, name: "TimerIcon", tags: ["emergency"] },
	{ component: TornadoIcon, name: "TornadoIcon", tags: ["emergency"] },
	{ component: TruckIcon, name: "TruckIcon", tags: ["emergency"] },
	{ component: TruckTrailerIcon, name: "TruckTrailerIcon", tags: ["emergency"] },
	{ component: VanIcon, name: "VanIcon", tags: ["emergency"] },
	{ component: VirusIcon, name: "VirusIcon", tags: ["emergency"] },
	{ component: WindIcon, name: "WindIcon", tags: ["emergency"] },
	// buildings as incident location types
	{ component: BankIcon, name: "BankIcon", tags: ["emergency"] },
	{ component: BuildingApartmentIcon, name: "BuildingApartmentIcon", tags: ["emergency"] },
	{ component: BuildingOfficeIcon, name: "BuildingOfficeIcon", tags: ["emergency"] },
	{ component: BuildingsIcon, name: "BuildingsIcon", tags: ["emergency"] },
	{ component: DoorIcon, name: "DoorIcon", tags: ["emergency"] },
	{ component: FactoryIcon, name: "FactoryIcon", tags: ["emergency"] },
	{ component: GarageIcon, name: "GarageIcon", tags: ["emergency"] },
	{ component: StorefrontIcon, name: "StorefrontIcon", tags: ["emergency"] },
	{ component: TentIcon, name: "TentIcon", tags: ["emergency"] },
	{ component: WarehouseIcon, name: "WarehouseIcon", tags: ["emergency"] },

	// Identity & security
	{ component: FingerprintIcon, name: "FingerprintIcon", tags: ["security"] },
	{ component: IdentificationCardIcon, name: "IdentificationCardIcon", tags: ["security"] },
	{ component: KeyIcon, name: "KeyIcon", tags: ["security"] },
	{ component: LockIcon, name: "LockIcon", tags: ["security"] },
	{ component: LockOpenIcon, name: "LockOpenIcon", tags: ["security"] },
	{ component: QrCodeIcon, name: "QrCodeIcon", tags: ["security"] },
	{ component: SealCheckIcon, name: "SealCheckIcon", tags: ["security"] },
	{ component: ShieldCheckIcon, name: "ShieldCheckIcon", tags: ["security"] },
	{ component: ShieldChevronIcon, name: "ShieldChevronIcon", tags: ["security"] },
	{ component: ShieldIcon, name: "ShieldIcon", tags: ["security"] },
	{ component: ShieldPlusIcon, name: "ShieldPlusIcon", tags: ["security"] },
	{ component: ShieldSlashIcon, name: "ShieldSlashIcon", tags: ["security"] },
	{ component: ShieldWarningIcon, name: "ShieldWarningIcon", tags: ["security"] },

	// Data, content & files
	{ component: BookOpenIcon, name: "BookOpenIcon", tags: ["data"] },
	{ component: BrainIcon, name: "BrainIcon", tags: ["data"] },
	{ component: CalendarBlankIcon, name: "CalendarBlankIcon", tags: ["data"] },
	{ component: CalendarCheckIcon, name: "CalendarCheckIcon", tags: ["data"] },
	{ component: CalendarDotsIcon, name: "CalendarDotsIcon", tags: ["data"] },
	{ component: CalendarIcon, name: "CalendarIcon", tags: ["data"] },
	{ component: CalendarPlusIcon, name: "CalendarPlusIcon", tags: ["data"] },
	{ component: CalendarStarIcon, name: "CalendarStarIcon", tags: ["data"] },
	{ component: CalendarXIcon, name: "CalendarXIcon", tags: ["data"] },
	{ component: ChartBarHorizontalIcon, name: "ChartBarHorizontalIcon", tags: ["data"] },
	{ component: ChartBarIcon, name: "ChartBarIcon", tags: ["data"] },
	{ component: ChartDonutIcon, name: "ChartDonutIcon", tags: ["data"] },
	{ component: ChartLineIcon, name: "ChartLineIcon", tags: ["data"] },
	{ component: ChartPieIcon, name: "ChartPieIcon", tags: ["data"] },
	{ component: ChartScatterIcon, name: "ChartScatterIcon", tags: ["data"] },
	{ component: ClipboardTextIcon, name: "ClipboardTextIcon", tags: ["data"] },
	{ component: ClockAfternoonIcon, name: "ClockAfternoonIcon", tags: ["data"] },
	{ component: ClockClockwiseIcon, name: "ClockClockwiseIcon", tags: ["data"] },
	{ component: ClockCountdownIcon, name: "ClockCountdownIcon", tags: ["data"] },
	{ component: ClockCounterClockwiseIcon, name: "ClockCounterClockwiseIcon", tags: ["data"] },
	{ component: ClockIcon, name: "ClockIcon", tags: ["data"] },
	{ component: ClockUserIcon, name: "ClockUserIcon", tags: ["data"] },
	{ component: ColumnsIcon, name: "ColumnsIcon", tags: ["data"] },
	{ component: CurrencyCircleDollarIcon, name: "CurrencyCircleDollarIcon", tags: ["data"] },
	{ component: DatabaseIcon, name: "DatabaseIcon", tags: ["data"] },
	{ component: FileCodeIcon, name: "FileCodeIcon", tags: ["data"] },
	{ component: FileImageIcon, name: "FileImageIcon", tags: ["data"] },
	{ component: FileTextIcon, name: "FileTextIcon", tags: ["data"] },
	{ component: FolderIcon, name: "FolderIcon", tags: ["data"] },
	{ component: FolderOpenIcon, name: "FolderOpenIcon", tags: ["data"] },
	{ component: GlobeIcon, name: "GlobeIcon", tags: ["data"] },
	{ component: HashIcon, name: "HashIcon", tags: ["data"] },
	{ component: LinkBreakIcon, name: "LinkBreakIcon", tags: ["data"] },
	{ component: LinkIcon, name: "LinkIcon", tags: ["data"] },
	{ component: ListBulletsIcon, name: "ListBulletsIcon", tags: ["data"] },
	{ component: ListChecksIcon, name: "ListChecksIcon", tags: ["data"] },
	{ component: ListDashesIcon, name: "ListDashesIcon", tags: ["data"] },
	{ component: ListNumbersIcon, name: "ListNumbersIcon", tags: ["data"] },
	{ component: MapPinAreaIcon, name: "MapPinAreaIcon", tags: ["data"] },
	{ component: MapPinLineIcon, name: "MapPinLineIcon", tags: ["data"] },
	{ component: MapPinPlusIcon, name: "MapPinPlusIcon", tags: ["data"] },
	{ component: MapPinSimpleIcon, name: "MapPinSimpleIcon", tags: ["data"] },
	{ component: MapTrifoldIcon, name: "MapTrifoldIcon", tags: ["data"] },
	{ component: NoteIcon, name: "NoteIcon", tags: ["data"] },
	{ component: NotebookIcon, name: "NotebookIcon", tags: ["data"] },
	{ component: NotePencilIcon, name: "NotePencilIcon", tags: ["data"] },
	{ component: PackageIcon, name: "PackageIcon", tags: ["data"] },
	{ component: PenIcon, name: "PenIcon", tags: ["data"] },
	{ component: PenNibIcon, name: "PenNibIcon", tags: ["data"] },
	{ component: PercentIcon, name: "PercentIcon", tags: ["data"] },
	{ component: PushPinIcon, name: "PushPinIcon", tags: ["data"] },
	{ component: SignatureIcon, name: "SignatureIcon", tags: ["data"] },
	{ component: StarIcon, name: "StarIcon", tags: ["data"] },
	{ component: TableIcon, name: "TableIcon", tags: ["data"] },
	{ component: TagIcon, name: "TagIcon", tags: ["data"] },
	{ component: TrayArrowDownIcon, name: "TrayArrowDownIcon", tags: ["data"] },
	{ component: UserCheckIcon, name: "UserCheckIcon", tags: ["data"] },
	{ component: UserCircleIcon, name: "UserCircleIcon", tags: ["data"] },
	{ component: UserFocusIcon, name: "UserFocusIcon", tags: ["data"] },
	{ component: UserGearIcon, name: "UserGearIcon", tags: ["data"] },
	{ component: UserIcon, name: "UserIcon", tags: ["data"] },
	{ component: UserListIcon, name: "UserListIcon", tags: ["data"] },
	{ component: UserMinusIcon, name: "UserMinusIcon", tags: ["data"] },
	{ component: UserPlusIcon, name: "UserPlusIcon", tags: ["data"] },
	{ component: UserSwitchIcon, name: "UserSwitchIcon", tags: ["data"] },
	{ component: UsersIcon, name: "UsersIcon", tags: ["data"] },
	{ component: UsersFourIcon, name: "UsersFourIcon", tags: ["data"] },
	{ component: UsersThreeIcon, name: "UsersThreeIcon", tags: ["data"] },
	{ component: WalletIcon, name: "WalletIcon", tags: ["data"] },

	// Infrastructure & dev
	{ component: BatteryChargingIcon, name: "BatteryChargingIcon", tags: ["infra"] },
	{ component: BatteryEmptyIcon, name: "BatteryEmptyIcon", tags: ["infra"] },
	{ component: BatteryFullIcon, name: "BatteryFullIcon", tags: ["infra"] },
	{ component: BatteryLowIcon, name: "BatteryLowIcon", tags: ["infra"] },
	{ component: CellSignalFullIcon, name: "CellSignalFullIcon", tags: ["infra"] },
	{ component: CloudIcon, name: "CloudIcon", tags: ["infra"] },
	{ component: CodeIcon, name: "CodeIcon", tags: ["infra"] },
	{ component: CubeIcon, name: "CubeIcon", tags: ["infra"] },
	{ component: DesktopIcon, name: "DesktopIcon", tags: ["infra"] },
	{ component: GasPumpIcon, name: "GasPumpIcon", tags: ["infra"] },
	{ component: GearIcon, name: "GearIcon", tags: ["infra"] },
	{ component: GearSixIcon, name: "GearSixIcon", tags: ["infra"] },
	{ component: GitBranchIcon, name: "GitBranchIcon", tags: ["infra"] },
	{ component: GitCommitIcon, name: "GitCommitIcon", tags: ["infra"] },
	{ component: GitForkIcon, name: "GitForkIcon", tags: ["infra"] },
	{ component: GitMergeIcon, name: "GitMergeIcon", tags: ["infra"] },
	{ component: GithubLogoIcon, name: "GithubLogoIcon", tags: ["infra"] },
	{ component: HardDrivesIcon, name: "HardDrivesIcon", tags: ["infra"] },
	{ component: NetworkIcon, name: "NetworkIcon", tags: ["infra"] },
	{ component: PipeWrenchIcon, name: "PipeWrenchIcon", tags: ["infra"] },
	{ component: PlugIcon, name: "PlugIcon", tags: ["infra"] },
	{ component: PuzzlePieceIcon, name: "PuzzlePieceIcon", tags: ["infra"] },
	{ component: SlidersHorizontalIcon, name: "SlidersHorizontalIcon", tags: ["infra"] },
	{ component: SolarPanelIcon, name: "SolarPanelIcon", tags: ["infra"] },
	{ component: StackIcon, name: "StackIcon", tags: ["infra"] },
	{ component: TerminalIcon, name: "TerminalIcon", tags: ["infra"] },
	{ component: TerminalWindowIcon, name: "TerminalWindowIcon", tags: ["infra"] },
	{ component: WifiHighIcon, name: "WifiHighIcon", tags: ["infra"] },
	{ component: WifiSlashIcon, name: "WifiSlashIcon", tags: ["infra"] },
	{ component: WrenchIcon, name: "WrenchIcon", tags: ["infra"] },

	// Text formatting
	{ component: TextBIcon, name: "TextBIcon", tags: ["formatting"] },
	{ component: TextItalicIcon, name: "TextItalicIcon", tags: ["formatting"] },
	{ component: TextUnderlineIcon, name: "TextUnderlineIcon", tags: ["formatting"] },
];

const categories = [
	{ label: "All", value: "all" },
	{ label: "Navigation", value: "nav" },
	{ label: "Actions", value: "action" },
	{ label: "Status", value: "status" },
	{ label: "Comms", value: "comms" },
	{ label: "Emergency", value: "emergency" },
	{ label: "Security", value: "security" },
	{ label: "Data", value: "data" },
	{ label: "Infra", value: "infra" },
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
		void navigator.clipboard.writeText(`import { ${name} } from "@resq-sw/ui/icons";`);
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
			{ component: AmbulanceIcon },
			{ component: FirstAidKitIcon },
			{ component: HeartbeatIcon },
			{ component: TimerIcon },
		],
		label: "Emergency response",
	},
	{
		icons: [
			{ component: AirplaneTiltIcon },
			{ component: TruckIcon },
			{ component: MapPinIcon },
			{ component: NavigationArrowIcon },
			{ component: PersonSimpleRunIcon },
		],
		label: "Fleet & tracking",
	},
	{
		icons: [
			{ component: PhoneIcon },
			{ component: RadioIcon },
			{ component: MicrophoneIcon },
			{ component: BroadcastIcon },
		],
		label: "Voice & radio comms",
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

				{/* Heartbeat (emergency) */}
				<div
					style={{ alignItems: "center", display: "flex", flexDirection: "column", gap: "0.75rem" }}
				>
					<HeartbeatIcon
						className="size-6"
						style={{
							color: "var(--color-destructive)",
							animation: "pulse 1s ease-in-out infinite",
						}}
						weight="light"
					/>
					<span style={labelStyle}>vital sign</span>
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
						animate-pulse + color
					</code>
				</div>
			</div>
		</div>
	),
};
