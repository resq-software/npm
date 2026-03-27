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

import { CaretDownIcon } from "@phosphor-icons/react";
import type * as React from "react";

import { cn } from "../../lib/utils.js";

type NativeSelectProps = Omit<React.ComponentProps<"select">, "size"> & {
	size?: "default" | "sm";
};

function NativeSelect({ className, size = "default", ...props }: NativeSelectProps) {
	return (
		<div
			className={cn(
				"group/native-select relative w-fit has-[select:disabled]:opacity-50",
				className,
			)}
			data-size={size}
			data-slot="native-select-wrapper"
		>
			<select
				className="border-border placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground bg-surface hover:border-border-hover focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 aria-invalid:border-destructive h-9 w-full min-w-0 appearance-none rounded-lg border py-2 pr-8 pl-3 text-sm text-foreground transition-colors select-none focus-visible:ring-[3px] aria-invalid:ring-[3px] data-[size=sm]:h-7 data-[size=sm]:rounded-lg data-[size=sm]:py-1 outline-none disabled:pointer-events-none disabled:cursor-not-allowed"
				data-size={size}
				data-slot="native-select"
				{...props}
			/>
			<CaretDownIcon
				aria-hidden="true"
				className="text-hint top-1/2 right-2.5 size-4 -translate-y-1/2 pointer-events-none absolute select-none"
				data-slot="native-select-icon"
				weight="light"
			/>
		</div>
	);
}

function NativeSelectOptGroup({ className, ...props }: Readonly<React.ComponentProps<"optgroup">>) {
	return <optgroup className={cn(className)} data-slot="native-select-optgroup" {...props} />;
}

function NativeSelectOption({ ...props }: Readonly<React.ComponentProps<"option">>) {
	return <option data-slot="native-select-option" {...props} />;
}

export { NativeSelect, NativeSelectOptGroup, NativeSelectOption };
