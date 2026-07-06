/**
 * Copyright 2026 ResQ Software
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

import { colors, fonts } from "@resq-sw/constants/tokens";

/**
 * Email-safe hex color tokens, sourced from the shared `@resq-sw/constants`
 * design tokens so the brand palette lives in one place across apps. Email
 * clients don't support `oklch()`, so the hex snapshot is used here.
 */
export const emailColors = colors.hex;

/** Brand font stacks + webfont stylesheet href, from the shared design tokens. */
export const emailFonts = fonts;

export type EmailColorToken = keyof typeof emailColors;
