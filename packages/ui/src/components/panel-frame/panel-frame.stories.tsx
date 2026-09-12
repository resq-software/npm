// Copyright 2026 ResQ Systems, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * @fileoverview Storybook stories for the PanelFrame component —
 * the priority, staleness, collapse and error states the console shell drives,
 * for visual review and Chromatic regression.
 *
 * @module @resq-systems/ui/components/panel-frame/panel-frame.stories
 */

import type { Meta, StoryObj } from "@storybook/react";

import { PanelFrame } from "./panel-frame";

const meta: Meta<typeof PanelFrame> = {
	component: PanelFrame,
	tags: ["autodocs"],
	title: "Console/Panel Frame",
};

export default meta;
type Story = StoryObj<typeof PanelFrame>;

/**
 * Depth is what an operator steers by, so it is the last panel the grid gives
 * up. Priority is declared once, here, and every width obeys it — which is why
 * this story carries real readouts rather than a placeholder: the frame is only
 * honest when you can see it wrapped around something worth keeping.
 *
 * Every story is pinned to one console column width so the set is comparable and
 * so header truncation shows up here rather than in the field.
 */
export const Primary: Story = {
	args: {
		children: (
			<dl className="grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-xs">
				<dt className="text-muted-foreground">Depth</dt>
				<dd className="text-right tabular-nums">12.4 m</dd>
				<dt className="text-muted-foreground">Seabed</dt>
				<dd className="text-right tabular-nums">16.0 m</dd>
				<dt className="text-muted-foreground">Rate</dt>
				<dd className="text-right tabular-nums">-0.3 m/s</dd>
			</dl>
		),
		className: "w-80",
		priority: "primary",
		title: "Depth",
	},
};

/**
 * The default, and the right answer when nobody has thought about it yet. Worth
 * watching, but the grid may fold it away before it touches anything primary.
 */
export const Secondary: Story = {
	args: {
		children: "24.6 V / -12.4 A",
		className: "w-80",
		priority: "secondary",
		title: "Power",
	},
};

/**
 * First to go when space runs out. Saying so up front means the layout never
 * has to guess which panel an operator can spare mid-mission.
 */
export const Ancillary: Story = {
	args: {
		children: "Last update 14:02:41",
		className: "w-80",
		priority: "ancillary",
		title: "Session log",
	},
};

/**
 * Panel-local controls live in the chrome rather than the body, so every panel
 * keeps its unit toggle in the same corner and the eye stops hunting for it.
 */
export const HeaderActions: Story = {
	args: {
		...Primary.args,
		actions: (
			<button
				className="rounded-[3px] border border-border px-1 py-px font-mono text-[9px] uppercase leading-none text-muted-foreground hover:text-foreground"
				type="button"
			>
				m/ft
			</button>
		),
	},
};

/**
 * A frozen reading is more dangerous than a missing one, because it still
 * invites a decision. Dimmed, badged, and announced as stale before its title —
 * the same treatment the instruments give themselves, so staleness means one
 * thing everywhere on the console.
 */
export const Stale: Story = {
	args: { ...Primary.args, stale: true },
};

/**
 * The header is the part that actually breaks. A long title, the Stale badge and
 * a panel control are each fine on their own — covered by the stories above —
 * but at one column width they compete for a single row, and only together do
 * they show whether the title yields and the badge and control survive intact.
 * Operators read the badge to decide whether to trust the number at all, so it
 * must never be the thing that gets squeezed out by a verbose panel name.
 */
export const CrowdedHeader: Story = {
	args: {
		...HeaderActions.args,
		stale: true,
		title: "Forward sonar and seabed profile, starboard array",
	},
};

/**
 * Folded away by the operator, not by itself: the shell owns collapse and
 * persists it. The header survives so the panel stays findable and named.
 */
export const Collapsed: Story = {
	args: { ...Primary.args, collapsed: true },
};

/**
 * When the source fails, the last good number must not sit on screen pretending
 * to be current. The error takes the body outright rather than sharing it.
 */
export const SourceUnreachable: Story = {
	args: {
		...Primary.args,
		error: <p className="font-mono text-[11px] text-destructive">Source unreachable</p>,
	},
};

/**
 * Stale and broken at once. The body dim is reserved for readings you should
 * distrust; an error is not a reading, so the message stays at full contrast
 * while the header still says why the panel stopped being current.
 */
export const StaleSourceUnreachable: Story = {
	args: { ...SourceUnreachable.args, stale: true },
};
