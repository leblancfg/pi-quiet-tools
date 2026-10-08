import { readJsonObject } from "./tool-options.ts";

/** pi's replaceable built-in extensions that register tools. */
export const TOOL_BUILTINS = ["codemode", "tool-search", "mcp"] as const;
export type ToolBuiltin = (typeof TOOL_BUILTINS)[number];

/**
 * Read which tool-producing built-ins the user asked this extension to run in
 * place of pi's own copy, from `quietTools.builtins` in pi's settings.
 *
 * This is opt-in: taking over a built-in silently would fight other extensions
 * that replace it, and pi warns when an enabled built-in gets replaced.
 * Later settings files win, as in pi.
 */
export function readReplacedBuiltins(settingsPaths: string[]): Set<ToolBuiltin> {
	let names: unknown;
	for (const path of settingsPaths) {
		const section = readJsonObject(path).quietTools;
		if (section && typeof section === "object" && "builtins" in section) {
			names = (section as { builtins: unknown }).builtins;
		}
	}
	if (!Array.isArray(names)) return new Set();
	return new Set(TOOL_BUILTINS.filter((name) => names.includes(name)));
}
