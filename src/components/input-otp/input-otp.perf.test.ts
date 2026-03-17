// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import { describe, it } from "vitest";

import {
	collectRenderedViolations,
	formatViolationReport,
	hasBlockingViolations,
} from "../../lib/perf-test-utils";
import { InputOTPGroup, InputOTPSeparator } from "./input-otp";

describe("InputOTP performance", () => {
	it("InputOTPGroup has no blocking perf violations", () => {
		const el = InputOTPGroup({});
		const violations = collectRenderedViolations(el, "InputOTPGroup");
		if (hasBlockingViolations(violations)) {
			throw new Error(formatViolationReport(violations));
		}
	});

	it("InputOTPSeparator has no blocking perf violations", () => {
		const el = InputOTPSeparator({});
		const violations = collectRenderedViolations(el, "InputOTPSeparator");
		if (hasBlockingViolations(violations)) {
			throw new Error(formatViolationReport(violations));
		}
	});
});
