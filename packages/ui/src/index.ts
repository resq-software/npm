// Copyright 2026 ResQ Systems, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * @fileoverview Public API for `@resq-systems/ui` — 57-component React
 * library built on Radix UI primitives and Tailwind CSS v4 with a
 * dark-first oklch color system.
 *
 * **Prefer subpath imports** for production code:
 *
 * ```ts
 * import { Button } from "@resq-systems/ui/button";
 * import { Card, CardContent } from "@resq-systems/ui/card";
 * ```
 *
 * The bare `@resq-systems/ui` import (this barrel) re-exports everything
 * for convenience, but pulls the entire surface area; subpath
 * imports keep bundles tree-shakeable per component.
 *
 * Also exposes utility surface:
 * - {@link cn} — `clsx + tailwind-merge` class-name combiner.
 * - {@link useIsMobile} — `(max-width: 767px)` matchMedia hook.
 * - {@link getContrastingColor} — pick `#000` or `#fff` against any
 *   CSS color.
 *
 * @module @resq-systems/ui
 */

export {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "./components/accordion/index.js";
export { Alert, AlertAction, AlertDescription, AlertTitle } from "./components/alert/index.js";
export {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogMedia,
	AlertDialogOverlay,
	AlertDialogPortal,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "./components/alert-dialog/index.js";
export { AspectRatio } from "./components/aspect-ratio/index.js";
export {
	Avatar,
	AvatarBadge,
	AvatarFallback,
	AvatarGroup,
	AvatarGroupCount,
	AvatarImage,
} from "./components/avatar/index.js";
export { Badge, badgeVariants } from "./components/badge/index.js";
export {
	Breadcrumb,
	BreadcrumbEllipsis,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "./components/breadcrumb/index.js";
export { Button, buttonVariants } from "./components/button/index.js";
export {
	ButtonGroup,
	ButtonGroupSeparator,
	ButtonGroupText,
	buttonGroupVariants,
} from "./components/button-group/index.js";
export { Calendar, CalendarDayButton } from "./components/calendar/index.js";
export {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "./components/card/index.js";
export {
	Carousel,
	CarouselContent,
	CarouselItem,
	CarouselNext,
	CarouselPrevious,
	useCarousel,
} from "./components/carousel/index.js";
export type { CarouselApi } from "./components/carousel/index.js";
export {
	ChartContainer,
	ChartLegend,
	ChartLegendContent,
	ChartStyle,
	ChartTooltip,
	ChartTooltipContent,
} from "./components/chart/index.js";
export type { ChartConfig } from "./components/chart/index.js";
export { Checkbox } from "./components/checkbox/index.js";
export {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "./components/collapsible/index.js";
export {
	Combobox,
	ComboboxChip,
	ComboboxChips,
	ComboboxChipsInput,
	ComboboxCollection,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxGroup,
	ComboboxInput,
	ComboboxItem,
	ComboboxLabel,
	ComboboxList,
	ComboboxSeparator,
	ComboboxTrigger,
	ComboboxValue,
	useComboboxAnchor,
} from "./components/combobox/index.js";
export {
	Command,
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
	CommandShortcut,
} from "./components/command/index.js";
export {
	ContextMenu,
	ContextMenuCheckboxItem,
	ContextMenuContent,
	ContextMenuGroup,
	ContextMenuItem,
	ContextMenuLabel,
	ContextMenuPortal,
	ContextMenuRadioGroup,
	ContextMenuRadioItem,
	ContextMenuSeparator,
	ContextMenuShortcut,
	ContextMenuSub,
	ContextMenuSubContent,
	ContextMenuSubTrigger,
	ContextMenuTrigger,
} from "./components/context-menu/index.js";
export {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogOverlay,
	DialogPortal,
	DialogTitle,
	DialogTrigger,
} from "./components/dialog/index.js";
export { DirectionProvider, useDirection } from "./components/direction/index.js";
export {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerOverlay,
	DrawerPortal,
	DrawerTitle,
	DrawerTrigger,
} from "./components/drawer/index.js";
export {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuPortal,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "./components/dropdown-menu/index.js";
export {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "./components/empty/index.js";
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
} from "./components/field/index.js";
export { HoverCard, HoverCardContent, HoverCardTrigger } from "./components/hover-card/index.js";
export { Input } from "./components/input/index.js";
export {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
	InputGroupText,
	InputGroupTextarea,
} from "./components/input-group/index.js";
export {
	InputOTP,
	InputOTPGroup,
	InputOTPSeparator,
	InputOTPSlot,
} from "./components/input-otp/index.js";
export {
	Item,
	ItemActions,
	ItemContent,
	ItemDescription,
	ItemFooter,
	ItemGroup,
	ItemHeader,
	ItemMedia,
	ItemSeparator,
	ItemTitle,
} from "./components/item/index.js";
export { Kbd, KbdGroup } from "./components/kbd/index.js";
export { Label } from "./components/label/index.js";
export {
	Menubar,
	MenubarCheckboxItem,
	MenubarContent,
	MenubarGroup,
	MenubarItem,
	MenubarLabel,
	MenubarMenu,
	MenubarPortal,
	MenubarRadioGroup,
	MenubarRadioItem,
	MenubarSeparator,
	MenubarShortcut,
	MenubarSub,
	MenubarSubContent,
	MenubarSubTrigger,
	MenubarTrigger,
} from "./components/menubar/index.js";
export {
	NativeSelect,
	NativeSelectOptGroup,
	NativeSelectOption,
} from "./components/native-select/index.js";
export {
	NavigationMenu,
	NavigationMenuContent,
	NavigationMenuIndicator,
	NavigationMenuItem,
	NavigationMenuLink,
	NavigationMenuList,
	NavigationMenuTrigger,
	navigationMenuTriggerStyle,
	NavigationMenuViewport,
} from "./components/navigation-menu/index.js";
export {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from "./components/pagination/index.js";
export { Picture, PictureInternal } from "./components/picture/index.js";
export type {
	DistributiveOmit,
	LqipEntry,
	LqipValue,
	Overwrite,
} from "./components/picture/index.js";
export {
	Popover,
	PopoverAnchor,
	PopoverContent,
	PopoverDescription,
	PopoverHeader,
	PopoverTitle,
	PopoverTrigger,
} from "./components/popover/index.js";
export { Progress } from "./components/progress/index.js";
export { RadioGroup, RadioGroupItem } from "./components/radio-group/index.js";
export {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "./components/resizable/index.js";
export { ScrollArea, ScrollBar } from "./components/scroll-area/index.js";
export {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectScrollDownButton,
	SelectScrollUpButton,
	SelectSeparator,
	SelectTrigger,
	SelectValue,
} from "./components/select/index.js";
export { Separator } from "./components/separator/index.js";
export {
	Sheet,
	SheetClose,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "./components/sheet/index.js";
export {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupAction,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarInput,
	SidebarInset,
	SidebarMenu,
	SidebarMenuAction,
	SidebarMenuBadge,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSkeleton,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
	SidebarProvider,
	SidebarRail,
	SidebarSeparator,
	SidebarTrigger,
	useSidebar,
} from "./components/sidebar/index.js";
export { Skeleton } from "./components/skeleton/index.js";
export { Slider } from "./components/slider/index.js";
export { Toaster } from "./components/sonner/index.js";
export { Spinner } from "./components/spinner/index.js";
export { Switch } from "./components/switch/index.js";
export {
	Table,
	TableBody,
	TableCaption,
	TableCell,
	TableFooter,
	TableHead,
	TableHeader,
	TableRow,
} from "./components/table/index.js";
export {
	Tabs,
	TabsContent,
	TabsList,
	tabsListVariants,
	TabsTrigger,
} from "./components/tabs/index.js";
export { Textarea } from "./components/textarea/index.js";
export { Toggle, toggleVariants } from "./components/toggle/index.js";
export { ToggleGroup, ToggleGroupItem } from "./components/toggle-group/index.js";
export {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "./components/tooltip/index.js";
export { useIsMobile } from "./hooks/use-mobile.js";
export { cn } from "./lib/utils.js";
export { getContrastingColor } from "./lib/get-contrasting-color.js";
export type { Channel, Rgb, RGB } from "./lib/get-contrasting-color.types.js";
