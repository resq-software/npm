/**
 * Copyright 2026 ResQ
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

/**
 * @fileoverview RTL/LTR direction provider — thin wrapper around
 * `@radix-ui/react-direction`'s `DirectionProvider`. Wrap the app
 * (or a sub-tree) in `<DirectionProvider direction="rtl">` to flip
 * directional behaviour for every Radix-based component
 * underneath. Accepts both `dir` (Radix native) and `direction`
 * (alias for ergonomic JSX).
 *
 * Re-exports `useDirection()` for components that need to read the
 * resolved direction.
 */

"use client";

import { Direction } from "radix-ui";
import type * as React from "react";

function DirectionProvider({
	children,
	dir,
	direction,
}: Readonly<
	React.ComponentProps<typeof Direction.DirectionProvider> & {
		direction?: React.ComponentProps<typeof Direction.DirectionProvider>["dir"];
	}
>) {
	return (
		<Direction.DirectionProvider dir={direction ?? dir}>{children}</Direction.DirectionProvider>
	);
}

const useDirection = Direction.useDirection;

export { DirectionProvider, useDirection };
