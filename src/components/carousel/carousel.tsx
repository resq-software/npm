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

"use client";

import useEmblaCarousel, { type UseEmblaCarouselType } from "embla-carousel-react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import * as React from "react";

import { cn } from "../../lib/utils.js";
import { Button } from "../button/button.js";

type CarouselApi = UseEmblaCarouselType[1];
type CarouselContextProps = CarouselProps & {
	api: ReturnType<typeof useEmblaCarousel>[1];
	canScrollNext: boolean;
	canScrollPrev: boolean;
	carouselRef: ReturnType<typeof useEmblaCarousel>[0];
	scrollNext: () => void;
	scrollPrev: () => void;
};
type CarouselOptions = UseCarouselParameters[0];
type CarouselPlugin = UseCarouselParameters[1];

interface CarouselProps {
	opts?: CarouselOptions;
	orientation?: "horizontal" | "vertical";
	plugins?: CarouselPlugin;
	setApi?: (api: CarouselApi) => void;
}

type UseCarouselParameters = Parameters<typeof useEmblaCarousel>;

const CarouselContext = React.createContext<CarouselContextProps | null>(null);

function Carousel({
	children,
	className,
	opts,
	orientation = "horizontal",
	plugins,
	setApi,
	...props
}: CarouselProps & React.ComponentProps<"div">) {
	const [carouselRef, api] = useEmblaCarousel(
		{
			...opts,
			axis: orientation === "horizontal" ? "x" : "y",
		},
		plugins,
	);
	const [canScrollPrev, setCanScrollPrev] = React.useState(false);
	const [canScrollNext, setCanScrollNext] = React.useState(false);

	const onSelect = React.useCallback((api: CarouselApi) => {
		if (!api) {
			return;
		}
		setCanScrollPrev(api.canScrollPrev());
		setCanScrollNext(api.canScrollNext());
	}, []);

	const scrollPrev = React.useCallback(() => {
		api?.scrollPrev();
	}, [api]);

	const scrollNext = React.useCallback(() => {
		api?.scrollNext();
	}, [api]);

	const handleKeyDown = React.useCallback(
		(event: React.KeyboardEvent<HTMLDivElement>) => {
			if (event.key === "ArrowLeft") {
				event.preventDefault();
				scrollPrev();
			} else if (event.key === "ArrowRight") {
				event.preventDefault();
				scrollNext();
			}
		},
		[scrollPrev, scrollNext],
	);

	React.useEffect(() => {
		if (!api || !setApi) {
			return;
		}
		setApi(api);
	}, [api, setApi]);

	React.useEffect(() => {
		if (!api) {
			return;
		}
		onSelect(api);
		api.on("reInit", onSelect);
		api.on("select", onSelect);

		return () => {
			api?.off("reInit", onSelect);
			api?.off("select", onSelect);
		};
	}, [api, onSelect]);

	return (
		<CarouselContext.Provider
			value={{
				api,
				canScrollNext,
				canScrollPrev,
				carouselRef,
				opts,
				orientation: orientation || (opts?.axis === "y" ? "vertical" : "horizontal"),
				scrollNext,
				scrollPrev,
			}}
		>
			<div
				aria-roledescription="carousel"
				className={cn(
					"relative rounded-[10px] border border-border bg-card p-4 shadow-md",
					className,
				)}
				data-slot="carousel"
				onKeyDownCapture={handleKeyDown}
				role="region"
				{...props}
			>
				{children}
			</div>
		</CarouselContext.Provider>
	);
}

function CarouselContent({ className, ...props }: React.ComponentProps<"div">) {
	const { carouselRef, orientation } = useCarousel();

	return (
		<div className="overflow-hidden rounded-[8px]" data-slot="carousel-content" ref={carouselRef}>
			<div
				className={cn("flex", orientation === "horizontal" ? "-ml-4" : "-mt-4 flex-col", className)}
				{...props}
			/>
		</div>
	);
}

function CarouselItem({ className, ...props }: React.ComponentProps<"div">) {
	const { orientation } = useCarousel();

	return (
		<div
			aria-roledescription="slide"
			className={cn(
				"min-w-0 shrink-0 grow-0 basis-full",
				orientation === "horizontal" ? "pl-4" : "pt-4",
				className,
			)}
			data-slot="carousel-item"
			role="group"
			{...props}
		/>
	);
}

function CarouselNext({
	className,
	size = "icon-sm",
	variant = "outline",
	...props
}: React.ComponentProps<typeof Button>) {
	const { canScrollNext, orientation, scrollNext } = useCarousel();

	return (
		<Button
			className={cn(
				"rounded-full absolute touch-manipulation shadow-md",
				orientation === "horizontal"
					? "top-1/2 -right-4 -translate-y-1/2"
					: "-bottom-4 left-1/2 -translate-x-1/2 rotate-90",
				className,
			)}
			data-slot="carousel-next"
			disabled={!canScrollNext}
			onClick={scrollNext}
			size={size}
			variant={variant}
			{...props}
		>
			<ChevronRightIcon />
			<span className="sr-only">Next slide</span>
		</Button>
	);
}

function CarouselPrevious({
	className,
	size = "icon-sm",
	variant = "outline",
	...props
}: React.ComponentProps<typeof Button>) {
	const { canScrollPrev, orientation, scrollPrev } = useCarousel();

	return (
		<Button
			className={cn(
				"rounded-full absolute touch-manipulation shadow-md",
				orientation === "horizontal"
					? "top-1/2 -left-4 -translate-y-1/2"
					: "-top-4 left-1/2 -translate-x-1/2 rotate-90",
				className,
			)}
			data-slot="carousel-previous"
			disabled={!canScrollPrev}
			onClick={scrollPrev}
			size={size}
			variant={variant}
			{...props}
		>
			<ChevronLeftIcon />
			<span className="sr-only">Previous slide</span>
		</Button>
	);
}

function useCarousel() {
	const context = React.useContext(CarouselContext);

	if (!context) {
		throw new Error("useCarousel must be used within a <Carousel />");
	}

	return context;
}

export {
	Carousel,
	type CarouselApi,
	CarouselContent,
	CarouselItem,
	CarouselNext,
	CarouselPrevious,
	useCarousel,
};
