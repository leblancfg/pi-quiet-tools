import { stripTerminalSequences, visibleWidth } from "@earendil-works/pi-tui";
import { describe, expect, it } from "vitest";
import { toOneLine } from "../src/one-line.ts";

describe("toOneLine", () => {
	it("returns nothing when the inner component rendered nothing", () => {
		expect(toOneLine([], 20, "…")).toEqual([]);
	});

	it("keeps a line that already fits", () => {
		expect(toOneLine(["bash ls -la"], 20, "…")).toEqual(["bash ls -la"]);
	});

	it("drops the padding a component added to fill its render width", () => {
		expect(toOneLine(["bash ls -la        "], 20, "…")).toEqual(["bash ls -la"]);
	});

	it("marks a line that is wider than the terminal", () => {
		const lines = toOneLine(["bash pnpm run build --verbose"], 20, "…");
		expect(stripTerminalSequences(lines[0]!)).toBe("bash pnpm run build…");
	});

	it("marks a line when the component produced more lines below it", () => {
		const lines = toOneLine(["bash first", "second"], 20, "…");
		expect(stripTerminalSequences(lines[0]!)).toBe("bash first…");
	});

	it("never returns a line wider than the terminal", () => {
		const lines = toOneLine(["0123456789"], 6, "…");
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
