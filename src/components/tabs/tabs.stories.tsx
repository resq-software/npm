// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import type { Meta, StoryObj } from "@storybook/react";

import { Button } from "../button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../card";
import { Input } from "../input";
import { Label } from "../label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";

const meta: Meta<typeof Tabs> = {
	component: Tabs,
	tags: ["autodocs"],
	title: "Navigation/Tabs",
};

export default meta;
type Story = StoryObj<typeof Tabs>;

export const Default: Story = {
	render: () => (
		<Tabs className="w-96" defaultValue="account">
			<TabsList className="grid w-full grid-cols-2">
				<TabsTrigger value="account">Account</TabsTrigger>
				<TabsTrigger value="password">Password</TabsTrigger>
			</TabsList>
			<TabsContent value="account">
				<Card>
					<CardHeader>
						<CardTitle>Account</CardTitle>
						<CardDescription>Make changes to your account here.</CardDescription>
					</CardHeader>
					<CardContent className="space-y-2">
						<div className="space-y-1">
							<Label htmlFor="name">Name</Label>
							<Input defaultValue="Pedro Duarte" id="name" />
						</div>
					</CardContent>
					<CardFooter>
						<Button>Save changes</Button>
					</CardFooter>
				</Card>
			</TabsContent>
			<TabsContent value="password">
				<Card>
					<CardHeader>
						<CardTitle>Password</CardTitle>
						<CardDescription>Change your password here.</CardDescription>
					</CardHeader>
					<CardContent className="space-y-2">
						<div className="space-y-1">
							<Label htmlFor="current">Current password</Label>
							<Input id="current" type="password" />
						</div>
					</CardContent>
					<CardFooter>
						<Button>Save password</Button>
					</CardFooter>
				</Card>
			</TabsContent>
		</Tabs>
	),
};
