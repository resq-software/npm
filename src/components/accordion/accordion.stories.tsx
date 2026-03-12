// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import type { Meta, StoryObj } from "@storybook/nextjs";

import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "./accordion";

const meta: Meta<typeof Accordion> = {
	argTypes: {
		type: { control: "select", options: ["single", "multiple"] },
	},
	component: Accordion,
	tags: ["autodocs"],
	title: "Layout/Accordion",
};

export default meta;
type Story = StoryObj<typeof Accordion>;

export const Default: Story = {
	args: { collapsible: true, type: "single" },
	render: (args) => (
		<Accordion {...args} className="w-96">
			<AccordionItem value="accessible">
				<AccordionTrigger>Is it accessible?</AccordionTrigger>
				<AccordionContent>
					Yes. It adheres to the WAI-ARIA design pattern.
				</AccordionContent>
			</AccordionItem>
			<AccordionItem value="styled">
				<AccordionTrigger>Is it styled?</AccordionTrigger>
				<AccordionContent>
					Yes. It comes with default styles that match the design system.
				</AccordionContent>
			</AccordionItem>
			<AccordionItem value="animated">
				<AccordionTrigger>Is it animated?</AccordionTrigger>
				<AccordionContent>
					Yes. It's animated by default, but you can disable it if you prefer.
				</AccordionContent>
			</AccordionItem>
		</Accordion>
	),
};

export const FAQ: Story = {
	args: { collapsible: true, type: "single" },
	render: (args) => (
		<Accordion {...args} className="w-96">
			<AccordionItem value="q1">
				<AccordionTrigger>What is the maximum drone range?</AccordionTrigger>
				<AccordionContent>
					Standard drones in our fleet have a 5 km operational radius. Extended
					range units can reach up to 12 km with a signal repeater deployed.
				</AccordionContent>
			</AccordionItem>
			<AccordionItem value="q2">
				<AccordionTrigger>How do I report a new incident?</AccordionTrigger>
				<AccordionContent>
					Go to the Missions dashboard, click "New mission", fill in the
					incident details and zone coordinates, then click "Launch". Responders
					in the selected zone will be notified immediately.
				</AccordionContent>
			</AccordionItem>
			<AccordionItem value="q3">
				<AccordionTrigger>
					Can multiple teams operate in the same zone?
				</AccordionTrigger>
				<AccordionContent>
					Yes. Zones can be subdivided into sectors and assigned to different
					teams. Use the zone editor to split and assign sectors before launch.
				</AccordionContent>
			</AccordionItem>
			<AccordionItem value="q4">
				<AccordionTrigger>How are survivors tracked?</AccordionTrigger>
				<AccordionContent>
					Survivors are logged via the incident report form and marked on the
					live map. Each survivor record includes GPS coordinates, time of
					discovery, and assigned medical team.
				</AccordionContent>
			</AccordionItem>
		</Accordion>
	),
};

export const Multiple: Story = {
	args: { type: "multiple" },
	render: (args) => (
		<Accordion {...args} className="w-96">
			<AccordionItem value="ground">
				<AccordionTrigger>Ground operations</AccordionTrigger>
				<AccordionContent>
					12 responders deployed across 3 sectors. All teams equipped with
					first-aid kits and communication gear.
				</AccordionContent>
			</AccordionItem>
			<AccordionItem value="air">
				<AccordionTrigger>Air support</AccordionTrigger>
				<AccordionContent>
					2 drones active. EAGLE-1 covering north sector, EAGLE-2 covering south
					sector. Battery levels: 87% and 62%.
				</AccordionContent>
			</AccordionItem>
			<AccordionItem value="medical">
				<AccordionTrigger>Medical staging</AccordionTrigger>
				<AccordionContent>
					Field hospital established at Grid 4B-North. 2 paramedics on duty. 1
					ambulance standing by.
				</AccordionContent>
			</AccordionItem>
		</Accordion>
	),
};
