import { type Component, stripTerminalSequences, Text } from "@earendil-works/pi-tui";
import { beforeEach, describe, expect, it } from "vitest";
import { type AnyToolDefinition, quieten } from "../src/quieten.ts";

type RenderContext = Parameters<NonNullable<AnyToolDefinition["renderCall"]>>[2];

const theme = { fg: (_role: string, text: string) => text, bold: (text: string) => text } as never;

/** Compare rendered lines without the padding and colour codes components add. */
function plain(lines: string[]): string[] {
	return lines.map((line) => stripTerminalSequences(line).replace(/[ \t]+$/, ""));
}

function fakeContext(state: Record<string, unknown>): RenderContext {
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

interface Seen {
	callLastComponents: (Component | undefined)[];
	resultLastComponents: (Component | undefined)[];
}

function fakeDefinition(seen: Seen): AnyToolDefinition {
	return {
		name: "bash",
		label: "bash",
		description: "fake",
		parameters: {} as never,
		execute: async () => ({ content: [{ type: "text", text: "ok" }], details: undefined }),
		renderCall(_args, _theme, context) {
			seen.callLastComponents.push(context.lastComponent);
			return new Text("bash a-very-long-command --flag", 0, 0);
		},
		renderResult(_result, _options, _theme, context) {
			seen.resultLastComponents.push(context.lastComponent);
			return new Text("line one\nline two\nline three", 0, 0);
		},
	};
}

const result = { content: [{ type: "text" as const, text: "ok" }], details: undefined };
const options = { expanded: false, isPartial: false };

describe("quieten", () => {
	let seen: Seen;
	let state: Record<string, unknown>;
	let hidden: boolean;
	let definition: AnyToolDefinition;

	beforeEach(() => {
		seen = { callLastComponents: [], resultLastComponents: [] };
		state = {};
		hidden = false;
		definition = quieten(fakeDefinition(seen), () => hidden);
	});

	it("keeps execute and the other fields", () => {
		expect(definition.name).toBe("bash");
		expect(definition.description).toBe("fake");
		expect(definition.execute).toBeTypeOf("function");
	});

	it("passes rendering straight through while output is visible", () => {
		const call = definition.renderCall!({}, theme, fakeContext(state));
		const output = definition.renderResult!(result, options, theme, fakeContext(state));
		expect(plain(call.render(40))).toEqual(["bash a-very-long-command --flag"]);
		expect(plain(output.render(40))).toEqual(["line one", "line two", "line three"]);
	});

	it("renders nothing for the result while output is hidden", () => {
		hidden = true;
		const output = definition.renderResult!(result, options, theme, fakeContext(state));
		expect(output.render(40)).toEqual([]);
	});

	it("adds quiet renderers to tools that normally use pi's generic rendering", () => {
		hidden = true;
		const generic = quieten(
			{
				name: "mcp__docs__search",
				label: "mcp__docs__search",
				description: "fake MCP tool",
				parameters: {} as never,
				execute: async () => result,
			},
			() => hidden,
		);

		const call = generic.renderCall!({ query: "tool output" }, theme, fakeContext(state));
		const output = generic.renderResult!(result, options, theme, fakeContext(state));
		expect(plain(call.render(40))).toEqual(["mcp__docs__search query=\"tool output\""]);
		expect(output.render(40)).toEqual([]);

		hidden = false;
		const visibleOutput = generic.renderResult!(result, options, theme, fakeContext(state));
		expect(plain(visibleOutput.render(40))).toEqual(["ok"]);
	});

	it("still runs pi's result renderer while output is hidden, so row timers settle", () => {
		hidden = true;
		definition.renderResult!(result, options, theme, fakeContext(state));
		expect(seen.resultLastComponents).toHaveLength(1);
	});

	it("cuts the tool call down to one line while output is hidden", () => {
		hidden = true;
		const call = definition.renderCall!({}, theme, fakeContext(state));
		expect(plain(call.render(14))).toEqual(["bash a-very-l…"]);
	});

	it("applies a mid-session toggle to a row it already rendered", () => {
		// The row keeps one state object for its whole life. Toggling has to change
		// what that same row renders, not only what the next tool call renders.
		const visibleCall = definition.renderCall!({}, theme, fakeContext(state));
		const visibleOutput = definition.renderResult!(result, options, theme, fakeContext(state));
		expect(plain(visibleCall.render(40))).toEqual(["bash a-very-long-command --flag"]);
		expect(visibleOutput.render(40).length).toBe(3);

		hidden = true;
		const hiddenCall = definition.renderCall!({}, theme, fakeContext(state));
		const hiddenOutput = definition.renderResult!(result, options, theme, fakeContext(state));
		expect(hiddenCall.render(40)).toHaveLength(1);
		expect(hiddenOutput.render(40)).toEqual([]);

		hidden = false;
		const shownCall = definition.renderCall!({}, theme, fakeContext(state));
		const shownOutput = definition.renderResult!(result, options, theme, fakeContext(state));
		expect(plain(shownCall.render(40))).toEqual(["bash a-very-long-command --flag"]);
		expect(shownOutput.render(40).length).toBe(3);
	});

	it("hands pi's renderers their own previous component, never the wrapper", () => {
		hidden = true;
		const first = definition.renderCall!({}, theme, fakeContext(state));
		const second = definition.renderCall!({}, theme, fakeContext(state));
		expect(second).toBe(first);
		expect(seen.callLastComponents[0]).toBeUndefined();
		expect(seen.callLastComponents[1]).toBeInstanceOf(Text);
	});
});
