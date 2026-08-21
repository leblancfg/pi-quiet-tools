import { stripTerminalSequences, visibleWidth } from "@earendil-works/pi-tui";
import { describe, expect, it } from "vitest";
import { toOneLine } from "../src/one-line.ts";

describe("toOneLine", () => {
	it("returns nothing when the inner component rendered nothing", () => {
		expect(toOneLine([], 20, "…")).toEqual([]);
	});

	it("keeps a single short line unchanged", () => {
		expect(toOneLine(["bash ls -la"], 20, "…")).toEqual(["bash ls -la"]);
	});

	it("marks the line when the inner component wrapped to more lines", () => {
		const lines = toOneLine(["bash pnpm run build", "  --verbose"], 20, "…");
		expect(lines).toHaveLength(1);
		expect(lines[0]).toBe("bash pnpm run build…");
	});

	it("never returns a line wider than the terminal", () => {
		const lines = toOneLine(["0123456789", "rest"], 6, "…");
		expect(visibleWidth(lines[0]!)).toBeLessThanOrEqual(6);
		expect(stripTerminalSequences(lines[0]!)).toBe("01234…");
	});

	it("keeps ANSI colour codes out of the width budget", () => {
		const coloured = `\u001b[31mbash\u001b[0m ls`;
		expect(toOneLine([coloured], 10, "…")).toEqual([coloured]);
	});

	it("still returns one usable line when the width is 1", () => {
		expect(toOneLine(["abc", "def"], 1, "…")).toEqual(["…"]);
	});
});
