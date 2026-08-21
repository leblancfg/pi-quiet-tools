import { createBashToolDefinition, initTheme } from "@earendil-works/pi-coding-agent";
import { stripTerminalSequences } from "@earendil-works/pi-tui";
import { beforeAll, describe, expect, it } from "vitest";
import { quieten } from "../src/quieten.ts";

type RenderContext = Parameters<NonNullable<ReturnType<typeof createBashToolDefinition>["renderCall"]>>[2];

const theme = { fg: (_role: string, text: string) => text } as never;

function context(state: Record<string, unknown>): RenderContext {
	return {
		args: {},
		toolCallId: "call-1",
		invalidate: () => {},
		lastComponent: undefined,
		state,
		cwd: "/tmp",
		executionStarted: true,
		argsComplete: true,
		isPartial: false,
		expanded: false,
		showImages: false,
		isError: false,
	} as RenderContext;
}

const longCommand = "pnpm run build --verbose --with-a-very-long-flag-that-will-not-fit";
const result = {
	content: [{ type: "text" as const, text: "line one\nline two\nline three" }],
	details: undefined,
};
const options = { expanded: false, isPartial: false };

describe("pi's own bash tool, wrapped", () => {
	// pi's built-in renderers read a theme singleton.
	beforeAll(() => initTheme("dark", false));

	it("shows the call and the output while output is visible", () => {
		const definition = quieten(createBashToolDefinition("/tmp"), () => false);
		const state = {};
		const call = definition.renderCall!({ command: longCommand }, theme, context(state));
		const output = definition.renderResult!(result, options, theme, context(state));
		expect(call.render(60).length).toBeGreaterThan(0);
		expect(output.render(60).length).toBeGreaterThan(0);
	});

	it("shows one truncated call line and no output while output is hidden", () => {
		const definition = quieten(createBashToolDefinition("/tmp"), () => true);
		const state = {};
		const call = definition.renderCall!({ command: longCommand }, theme, context(state));
		const output = definition.renderResult!(result, options, theme, context(state));

		const lines = call.render(30);
		expect(lines).toHaveLength(1);
		expect(stripTerminalSequences(lines[0]!)).toBe("$ pnpm run build --verbose --…");
		expect(output.render(30)).toEqual([]);
	});
});
