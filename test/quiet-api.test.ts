import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { describe, expect, it } from "vitest";
import { createQuietToolApi } from "../src/quiet-api.ts";
import type { AnyToolDefinition } from "../src/quieten.ts";

function tool(name: string): AnyToolDefinition {
	return {
		name,
		label: name,
		description: "fake",
		parameters: {} as never,
		execute: async () => ({ content: [{ type: "text", text: "output" }], details: undefined }),
	};
}

describe("createQuietToolApi", () => {
	it("quietens tools registered later by a wrapped extension", () => {
		const registered: AnyToolDefinition[] = [];
		const pi = {
			registerTool(definition: AnyToolDefinition) {
				registered.push(definition);
			},
		} as ExtensionAPI;
		const quietPi = createQuietToolApi(pi, () => true);

		quietPi.registerTool(tool("codemode"));
		quietPi.registerTool(tool("mcp__docs__search"));

		expect(registered.map(({ name }) => name)).toEqual(["codemode", "mcp__docs__search"]);
		expect(registered.every(({ renderCall, renderResult }) => renderCall && renderResult)).toBe(true);
	});

	it("passes non-tool extension APIs through unchanged", () => {
		const getActiveTools = () => ["codemode"];
		const pi = { registerTool() {}, getActiveTools } as unknown as ExtensionAPI;
		const quietPi = createQuietToolApi(pi, () => true);

		expect(quietPi.getActiveTools).toBe(getActiveTools);
	});
});
