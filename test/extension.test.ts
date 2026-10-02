import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { describe, expect, it, vi } from "vitest";
import quietTools from "../extensions/quiet-tools.ts";
import type { AnyToolDefinition } from "../src/quieten.ts";

describe("quiet-tools extension", () => {
	it("takes over pi's tool-producing built-in extensions", () => {
		const tools: AnyToolDefinition[] = [];
		const commands: string[] = [];
		const api = new Proxy(
			{
				registerTool: (definition: AnyToolDefinition) => tools.push(definition),
				registerCommand: (name: string) => commands.push(name),
			},
			{
				get(target, property) {
					return Reflect.get(target, property) ?? vi.fn();
				},
			},
		) as unknown as ExtensionAPI;

		quietTools(api);

		expect(tools.map(({ name }) => name)).toEqual(["codemode", "tool_search"]);
		expect(tools.every(({ renderCall, renderResult }) => renderCall && renderResult)).toBe(true);
		expect(commands).toEqual(["mcp", "quiet"]);
	});
});
