import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export interface BuiltInToolOptions {
	read: { autoResizeImages: boolean };
	bash: { commandPrefix: string | undefined; shellPath: string | undefined };
}

/** The settings files pi merges, in the order it merges them. */
export function defaultSettingsPaths(cwd: string): string[] {
	return [join(homedir(), ".pi", "agent", "settings.json"), join(cwd, ".pi", "settings.json")];
}

/**
 * Re-read the few settings pi passes to its built-in tools.
 *
 * This extension rebuilds the built-in tool definitions to attach its own
 * renderers, so it has to pass the same options pi would, or `shellPath`,
 * `shellCommandPrefix`, and `images.autoResize` would silently stop working.
 */
export function readToolOptions(settingsPaths: string[]): BuiltInToolOptions {
	const merged: Record<string, unknown> = {};
	for (const path of settingsPaths) {
		Object.assign(merged, readJsonObject(path));
	}

	const images = merged.images;
	const autoResize =
		images && typeof images === "object" ? (images as { autoResize?: unknown }).autoResize : undefined;

	return {
		read: { autoResizeImages: typeof autoResize === "boolean" ? autoResize : true },
		bash: {
			commandPrefix: asString(merged.shellCommandPrefix),
			shellPath: expandHome(asString(merged.shellPath)),
		},
	};
}

export function readJsonObject(path: string): Record<string, unknown> {
	try {
		const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
		return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
	} catch {
		return {};
	}
}

function asString(value: unknown): string | undefined {
	return typeof value === "string" ? value : undefined;
}

function expandHome(value: string | undefined): string | undefined {
	if (value === undefined) return undefined;
	if (value === "~") return homedir();
	return value.startsWith("~/") ? join(homedir(), value.slice(2)) : value;
}
