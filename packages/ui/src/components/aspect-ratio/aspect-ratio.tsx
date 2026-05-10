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
 * @fileoverview AspectRatio — pin a child to a specific
 * width:height ratio (e.g. 16:9 video thumbnails, 4:3 photo cards,
 * 1:1 avatars). Pass the desired ratio as a number prop:
 * `<AspectRatio ratio={16 / 9}>`.
 *
 * Built on `@radix-ui/react-aspect-ratio`, which uses the
 * `padding-bottom: %` trick under the hood for layout-stable
 * preservation of ratio across viewport sizes.
 */

"use client";

import { AspectRatio as AspectRatioPrimitive } from "radix-ui";

function AspectRatio({
	...props
}: Readonly<React.ComponentProps<typeof AspectRatioPrimitive.Root>>) {
	return <AspectRatioPrimitive.Root data-slot="aspect-ratio" {...props} />;
}

export { AspectRatio };
