/**
 * Copyright 2025 GDG on Campus Farmingdale State College
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

import type { Meta, StoryObj } from "@storybook/react";
import { Picture } from "./index.js";

const meta: Meta<typeof Picture> = {
	title: "Components/Picture",
	component: Picture,
	tags: ["autodocs"],
	argTypes: {
		variant: {
			control: "select",
			options: ["responsive", "fixed", "cover", "contain", "thumbnail", "avatar", "hero", "card"],
		},
		rounded: {
			control: "select",
			options: ["none", "sm", "md", "lg", "xl", "full"],
		},
		shadow: {
			control: "select",
			options: ["none", "sm", "md", "lg", "xl"],
		},
		transition: {
			control: "select",
			options: ["none", "hover", "zoom", "fade"],
		},
	},
};

export default meta;
type Story = StoryObj<typeof Picture>;

export const Default: Story = {
	args: {
		src: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
		alt: "User Avatar",
		variant: "avatar",
		rounded: "full",
	},
};

export const Thumbnail: Story = {
	args: {
		src: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60",
		alt: "Code thumbnail",
		variant: "thumbnail",
		rounded: "lg",
		shadow: "md",
		transition: "hover",
	},
};

export const Hero: Story = {
	args: {
		src: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80",
		alt: "Workspace hero",
		variant: "hero",
		rounded: "none",
	},
	parameters: {
		layout: "fullscreen",
	},
};

export const Card: Story = {
	args: {
		src: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?ixlib=rb-1.2.1&auto=format&fit=crop&w=1352&q=80",
		alt: "Laptop on desk",
		variant: "card",
		rounded: "xl",
		shadow: "lg",
	},
};
