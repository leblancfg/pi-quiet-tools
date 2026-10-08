import {
	createBashToolDefinition,
	createCodemodeExtension,
	createEditToolDefinition,
	createFindToolDefinition,
	createGrepToolDefinition,
	createLsToolDefinition,
	createMcpExtension,
	createPowerShellToolDefinition,
	createReadToolDefinition,
	createToolSearchExtension,
	createWriteToolDefinition,
	type ExtensionAPI,
	type ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import { Key } from "@earendil-works/pi-tui";
import { readReplacedBuiltins, type ToolBuiltin } from "../src/builtins.ts";
import { createQuietToolApi } from "../src/quiet-api.ts";
import { type AnyToolDefinition, quieten, quietRenderers } from "../src/quieten.ts";
import { defaultStatePath, readHidden, writeHidden } from "../src/state.ts";
import { type BuiltInToolOptions, defaultSettingsPaths, readToolOptions } from "../src/tool-options.ts";

export default function (pi: ExtensionAPI) {
	const statePath = defaultStatePath();
	let hidden = readHidden(statePath);
	let installed = false;

	// pi 1.0.1 and newer let an extension choose the renderers of any tool,
	// including core, codemode, and MCP tools, without replacing the tool.
	const rendererHook = "registerToolRenderer" in pi && typeof pi.registerToolRenderer === "function";
	if (rendererHook) {
		pi.registerToolRenderer((toolName, next) => quietRenderers(toolName, next(), () => hidden));
	}

	// On pi 1.0.0 the only way to wrap codemode and MCP tools is to run pi's
	// built-in extensions here. That is opt-in: pi warns when an enabled
	// built-in gets replaced, and another extension may replace it too.
	const replacedBuiltins = readReplacedBuiltins(defaultSettingsPaths(process.cwd()));
	const hostPi = rendererHook ? pi : createQuietToolApi(pi, () => hidden);
	const builtinFactories: Record<ToolBuiltin, () => (pi: ExtensionAPI) => unknown> = {
		codemode: createCodemodeExtension,
		"tool-search": createToolSearchExtension,
		mcp: createMcpExtension,
	};
	for (const name of replacedBuiltins) {
		void builtinFactories[name]()(hostPi);
	}

	pi.registerFlag("quiet-tools", {
		type: "boolean",
		description: "Start with tool output hidden",
	});

	function builtInDefinitions(cwd: string, options: BuiltInToolOptions): AnyToolDefinition[] {
		return [
			createReadToolDefinition(cwd, options.read),
			createBashToolDefinition(cwd, options.bash),
			createEditToolDefinition(cwd),
			createWriteToolDefinition(cwd),
			createGrepToolDefinition(cwd),
			createFindToolDefinition(cwd),
			createLsToolDefinition(cwd),
			createPowerShellToolDefinition(cwd),
		];
	}

	function install(ctx: ExtensionContext): void {
		if (installed || rendererHook) {
			return;
		}
		installed = true;

		const options = readToolOptions(defaultSettingsPaths(ctx.cwd));
		const owners = new Map(pi.getAllTools().map((tool) => [tool.name, tool.sourceInfo.source]));
		const skipped: string[] = [];

		for (const definition of builtInDefinitions(ctx.cwd, options)) {
			// Leave the tool alone when something else already replaced it, such as a
			// sandbox or remote-execution extension.
			if (owners.get(definition.name) !== "builtin") {
				if (owners.has(definition.name)) {
					skipped.push(definition.name);
				}
				continue;
			}
			pi.registerTool(quieten(definition, () => hidden));
		}

		if (skipped.length > 0 && ctx.hasUI) {
			ctx.ui.notify(`quiet-tools: another extension owns ${skipped.join(", ")}; output stays visible`, "warning");
		}
	}

	/**
	 * Redraw the tool rows that are already on screen, so the new mode applies to
	 * the whole transcript and not only to the next tool call.
	 *
	 * pi pushes an expansion change into existing rows only when the value
	 * changes, so flip it and flip it back. Each flip re-runs the renderers of
	 * every row.
	 */
	function redrawRows(ctx: ExtensionContext): void {
		if (ctx.mode !== "tui") {
			return;
		}
		const expanded = ctx.ui.getToolsExpanded();
		ctx.ui.setToolsExpanded(!expanded);
		ctx.ui.setToolsExpanded(expanded);
	}

	function setHidden(ctx: ExtensionContext, next: boolean): void {
		hidden = next;
		writeHidden(statePath, hidden);
		redrawRows(ctx);
		if (ctx.hasUI) {
			// Report after the redraw: pi reports its own expansion change during it.
			ctx.ui.notify(`Tool output: ${hidden ? "hidden" : "visible"}`, "info");
		}
	}

	pi.on("session_start", (_event, ctx) => {
		if (pi.getFlag("quiet-tools") === true) {
			hidden = true;
		}
		install(ctx);
	});

	pi.registerShortcut(Key.ctrlAlt("o"), {
		description: "Hide or show tool output",
		handler: (ctx) => setHidden(ctx, !hidden),
	});

	pi.registerCommand("quiet", {
		description: "Hide or show tool output: /quiet [on|off|status]",
		handler: async (args, ctx) => {
			const argument = (args ?? "").trim().toLowerCase();
			if (argument === "status") {
				ctx.ui.notify(`Tool output: ${hidden ? "hidden" : "visible"}`, "info");
				return;
			}
			if (argument === "" || argument === "toggle") {
				setHidden(ctx, !hidden);
				return;
			}
			if (argument === "on" || argument === "hide") {
				setHidden(ctx, true);
				return;
			}
			if (argument === "off" || argument === "show") {
				setHidden(ctx, false);
				return;
			}
			ctx.ui.notify(`quiet: unknown option "${argument}". Use on, off, or status.`, "warning");
		},
	});
}
