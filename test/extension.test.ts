import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ExtensionAPI, ToolRendererResolver } from "@earendil-works/pi-coding-agent";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import quietTools from "../extensions/quiet-tools.ts";
import type { AnyToolDefinition } from "../src/quieten.ts";

interface FakePi {
	api: ExtensionAPI;
	tools: AnyToolDefinition[];
	commands: string[];
	resolvers: ToolRendererResolver[];
	sessionStart: Array<(event: unknown, ctx: unknown) => void>;
}

function fakePi(options: { rendererHook: boolean }): FakePi {
	const fake: FakePi = { api: undefined as never, tools: [], commands: [], resolvers: [], sessionStart: [] };
	const methods: Record<string, unknown> = {
		registerTool: (definition: AnyToolDefinition) => fake.tools.push(definition),
		registerCommand: (name: string) => fake.commands.push(name),
		on: (event: string, handler: (event: unknown, ctx: unknown) => void) => {
			if (event === "session_start") fake.sessionStart.push(handler);
		},
		getAllTools: () => ["read", "bash"].map((name) => ({ name, sourceInfo: { source: "builtin" } })),
		getFlag: () => undefined,
	};
	if (options.rendererHook) {
		methods.registerToolRenderer = (resolver: ToolRendererResolver) => fake.resolvers.push(resolver);
	}
	fake.api = new Proxy(methods, {
		get: (target, property) => Reflect.get(target, property) ?? vi.fn(),
		has: (target, property) => Reflect.has(target, property),
	}) as unknown as ExtensionAPI;
	return fake;
}

function startSession(fake: FakePi, cwd: string): void {
	const ctx = { cwd, hasUI: false, mode: "print", ui: { notify: vi.fn() } };
	for (const handler of fake.sessionStart) handler({}, ctx);
}

describe("quiet-tools extension", () => {
	let home: string;
	let project: string;
	const originalHome = process.env.HOME;

	beforeEach(() => {
		home = mkdtempSync(join(tmpdir(), "quiet-home-"));
		project = mkdtempSync(join(tmpdir(), "quiet-project-"));
		process.env.HOME = home;
		process.env.PI_QUIET_TOOLS_STATE = join(home, "state.json");
		vi.spyOn(process, "cwd").mockReturnValue(project);
	});

	afterEach(() => {
		process.env.HOME = originalHome;
		delete process.env.PI_QUIET_TOOLS_STATE;
		vi.restoreAllMocks();
	});

	function userSettings(content: unknown): void {
		mkdirSync(join(home, ".pi", "agent"), { recursive: true });
		writeFileSync(join(home, ".pi", "agent", "settings.json"), JSON.stringify(content));
	}

	it("leaves pi's built-in extensions alone by default", () => {
		const fake = fakePi({ rendererHook: false });
		quietTools(fake.api);

		expect(fake.tools).toEqual([]);
		expect(fake.commands).toEqual(["quiet"]);
	});

	it("wraps the core tools at session start when pi has no renderer hook", () => {
		const fake = fakePi({ rendererHook: false });
		quietTools(fake.api);
		startSession(fake, project);

		expect(fake.tools.map(({ name }) => name)).toEqual(["read", "bash"]);
		expect(fake.tools.every(({ renderCall, renderResult }) => renderCall && renderResult)).toBe(true);
	});

	it("uses pi's renderer hook instead of replacing tools when it exists", () => {
		const fake = fakePi({ rendererHook: true });
		quietTools(fake.api);
		startSession(fake, project);

		expect(fake.tools).toEqual([]);
		expect(fake.resolvers).toHaveLength(1);
		const renderers = fake.resolvers[0]("mcp__docs__search", () => undefined);
		expect(renderers?.renderCall).toBeTypeOf("function");
		expect(renderers?.renderResult).toBeTypeOf("function");
	});

	it("runs the built-ins the user opted in to, quietened", () => {
		userSettings({ quietTools: { builtins: ["codemode", "tool-search", "mcp"] } });
		const fake = fakePi({ rendererHook: false });
		quietTools(fake.api);

		expect(fake.tools.map(({ name }) => name)).toEqual(["codemode", "tool_search"]);
		expect(fake.tools.every(({ renderCall, renderResult }) => renderCall && renderResult)).toBe(true);
		expect(fake.commands).toEqual(["mcp", "quiet"]);
	});
});
