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

/**
 * @fileoverview Picture component family — responsive image with
 * art-direction support, AVIF/WebP fallbacks, blur-up placeholder,
 * and lazy-loading. Wraps the platform `<picture>` element with a
 * `<source>` resolution strategy and explicit width/height to
 * prevent CLS.
 *
 * Composition: `Picture > PictureSource* + PictureImg`. The
 * top-level `Picture` accepts variant / sizing props; sources
 * declare media queries and asset URLs.
 *
 * Performance contract: every `Picture` requires explicit
 * `width` × `height` (or `aspectRatio`) to reserve layout space —
 * matches the perf checklist in
 * `~/.claude/rules/web/performance.md`.
 *
 * @module @resq-systems/ui/components/picture/picture
 */

import { cva, type VariantProps } from "class-variance-authority";
import {
	type ComponentProps,
	type ElementType,
	type ReactNode,
	type SyntheticEvent,
	useCallback,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { cn } from "../../lib/utils.js";
import type { DistributiveOmit, LqipValue, Overwrite } from "./types.js";

//#region Helpers
/** Resolve an LqipValue to a raw base64 data-URL string. */
function resolveLqip(value: LqipValue | undefined): string | undefined {
	if (value == null) return undefined;
	if (typeof value === "string") return value;
	return value.lqip;
}

function useEventCallback<Args extends unknown[], R>(fn: (...args: Args) => R) {
	const ref = useRef<(...args: Args) => R>(() => {
		throw new Error("Cannot call an event callback during rendering.");
	});

	useLayoutEffect(() => {
		ref.current = fn;
	});

	return useCallback((...args: Args) => ref.current(...args), []);
}
//#endregion

//#region Constants
const defaultRootElement = "img" as const;

const pictureVariants = cva("border border-border bg-surface", {
	variants: {
		variant: {
			responsive: "w-full h-auto object-contain",
			fixed: "w-auto h-auto object-none",
			cover: "w-full h-full object-cover",
			contain: "w-full h-full object-contain",
			thumbnail: "w-24 h-24 rounded-lg object-cover shadow-md",
			avatar: "w-12 h-12 rounded-full object-cover shadow-sm",
			hero: "w-full h-[60vh] rounded-lg object-cover shadow-lg",
			card: "w-full h-48 rounded-lg object-cover shadow-md",
		},
		isLoading: {
			true: "animate-pulse bg-surface",
			false: "",
		},
		rounded: {
			none: "rounded-none",
			sm: "rounded-sm",
			md: "rounded-md",
			lg: "rounded-lg",
			xl: "rounded-lg",
			full: "rounded-full",
		},
		shadow: {
			none: "shadow-none",
			sm: "shadow-sm",
			md: "shadow-md",
			lg: "shadow-lg",
			xl: "shadow-xl",
		},
		transition: {
			none: "",
			hover: "transition-transform duration-200 hover:scale-105",
			zoom: "transition-transform duration-300 hover:scale-110",
			fade: "transition-opacity duration-200 hover:opacity-80",
		},
	},
	defaultVariants: {
		variant: "responsive",
		isLoading: false,
		rounded: "none",
		shadow: "none",
		transition: "none",
	},
});
//#endregion

//#region Types
namespace Picture {
	export interface BaseRootElementProps {
		className?: string;
		style?: React.CSSProperties;
		onLoad?: React.ReactEventHandler<HTMLImageElement>;
		onError?: React.ReactEventHandler<HTMLImageElement>;
	}

	export type BaseRootElementType = ElementType<BaseRootElementProps>;

	export interface OwnProps extends Omit<VariantProps<typeof pictureVariants>, "isLoading"> {
		/**
		 * Image source URL
		 */
		src?: string;

		/**
		 * Low-Quality Image Placeholder (LQIP).
		 * Accepts a raw base64 data-URL string **or** an `LqipEntry` object
		 * from the LQIP registry (`design/assets/lqip.json`).
		 *
		 * @example
		 * // Raw string
		 * <Picture lqip="data:image/png;base64,..." />
		 *
		 * // Registry entry (dot-notation)
		 * import lqip from "@resq-systems/design/assets/lqip.json";
		 * <Picture lqip={lqip.resqMarkColorPng.x16} />
		 */
		lqip?: LqipValue;

		/**
		 * Alternative text for accessibility
		 */
		alt?: string;

		/**
		 * Loading strategy
		 */
		loading?: "lazy" | "eager";

		/**
		 * Responsive image sizes
		 */
		sizes?: string;

		/**
		 * Source set for responsive images
		 */
		srcSet?: string;

		/**
		 * Override the default root element.
		 */
		component?: BaseRootElementType;

		/**
		 * A single art-directed `<source>` rendered inside the `<picture>`,
		 * ahead of the image. Omit for a plain responsive image; provide `media`
		 * to swap assets by viewport/format. Only one source is emitted.
		 */
		source?: {
			srcSet?: string;
			sizes?: string;
			media?: string;
		};

		/** Props forwarded to the wrapping `<picture>` element (e.g. its `className`). */
		picture?: {
			className?: string;
		};
	}

	export type Props<TRootElement extends BaseRootElementType = typeof defaultRootElement> =
		Overwrite<ComponentProps<TRootElement>, OwnProps>;

	/**
	 * Call signatures for the public {@link Picture} component. The first overload
	 * applies when a `component` root element is supplied, inferring the forwarded
	 * props from it; the second is the default (`"img"`) form with `component`
	 * omitted.
	 */
	export interface Type {
		<TRootElement extends BaseRootElementType = typeof defaultRootElement>(
			props: Overwrite<Props<TRootElement>, { component: TRootElement }>,
		): ReactNode;
		(props: DistributiveOmit<Props, "component">): ReactNode;
	}
}
//#endregion

//#region Public API
/**
 * Generic implementation of the Picture component. Prefer the {@link Picture}
 * alias, which carries the overloaded call signatures ({@link Picture.Type}) that
 * infer props from the `component` root element.
 *
 * Tracks its own `isLoading` state to drive the blur-up placeholder and
 * `aria-busy`. The built-in `onError` handler calls `console.warn` with the
 * failed `src` (in addition to invoking any caller-supplied `onError`), unless
 * the caller calls `preventDefault()` on the event.
 *
 * @template TRootElement - The rendered root element type (defaults to `"img"`);
 *   set via the `component` prop and used to infer the forwarded props.
 */
export const PictureInternal = <
	TRootElement extends Picture.BaseRootElementType = typeof defaultRootElement,
>({
	component: Component = defaultRootElement,
	variant,
	src,
	alt = "",
	loading = "lazy",
	sizes,
	srcSet,
	source,
	picture,
	rounded,
	shadow,
	transition,
	className,
	onLoad,
	onError,
	lqip,
	style,
	...rest
}: Picture.Props<TRootElement>) => {
	const [isLoading, setIsLoading] = useState<boolean>(true);
	const resolvedLqip = resolveLqip(lqip);

	const handleLoad = useEventCallback((e: SyntheticEvent<HTMLImageElement>) => {
		if (onLoad) (onLoad as React.ReactEventHandler<HTMLImageElement>)(e);
		if (e.defaultPrevented) return;
		setIsLoading(false);
	});

	const handleError = useEventCallback((e: SyntheticEvent<HTMLImageElement>) => {
		if (onError) (onError as React.ReactEventHandler<HTMLImageElement>)(e);
		if (e.defaultPrevented) return;
		setIsLoading(false);
		console.warn("Image failed to load:", src);
	});

	const defaultProps = useMemo<Partial<Picture.BaseRootElementProps>>(
		() => ({
			onLoad: handleLoad,
			onError: handleError,
			loading,
			alt,
		}),
		[loading, alt, handleLoad, handleError],
	);

	const imgClassName = useMemo<Picture.BaseRootElementProps["className"]>(
		() =>
			cn(
				pictureVariants({
					variant,
					isLoading: isLoading && !resolvedLqip,
					rounded,
					shadow,
					transition,
					className,
				}),
			),
		[className, variant, isLoading, resolvedLqip, rounded, shadow, transition],
	);

	const imgStyle = useMemo(() => {
		const baseStyle = style as React.CSSProperties | undefined;
		if (isLoading && resolvedLqip) {
			return {
				...baseStyle,
				backgroundImage: `url("${resolvedLqip}")`,
				backgroundSize: "cover",
				backgroundPosition: "center",
				backgroundRepeat: "no-repeat",
			};
		}
		return baseStyle;
	}, [isLoading, resolvedLqip, style]);

	const imgProps = {
		...defaultProps,
		...rest,
		src,
		srcSet,
		sizes,
		style: imgStyle,
		className: imgClassName,
		"aria-busy": isLoading,
		"aria-label": alt,
	} as unknown as React.ComponentProps<TRootElement>;

	const Comp = Component as React.ElementType;

	return (
		<picture className={cn("block overflow-hidden", picture?.className)}>
			{source && <source srcSet={source.srcSet} sizes={source.sizes} media={source.media} />}
			<Comp {...imgProps} />
		</picture>
	);
};

/**
 * Responsive `<picture>` component with AVIF/WebP fallbacks, blur-up LQIP, and
 * lazy-loading. The public entry point — {@link PictureInternal} typed with the
 * overloaded {@link Picture.Type} signatures.
 */
export const Picture = PictureInternal as Picture.Type;
//#endregion
