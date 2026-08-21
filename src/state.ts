import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

/** Where the toggle is stored, so it survives restarts. */
export function defaultStatePath(): string {
	return process.env.PI_QUIET_TOOLS_STATE ?? join(homedir(), ".pi", "agent", "quiet-tools.json");
}

/** Read the stored toggle. Any unreadable or malformed state means "show output". */
export function readHidden(path: string): boolean {
	try {
		const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
		if (parsed && typeof parsed === "object" && typeof (parsed as { hidden?: unknown }).hidden === "boolean") {
			return (parsed as { hidden: boolean }).hidden;
		}
	} catch {
		// Fall through to the default.
	}
	return false;
}

/** Store the toggle. Failures are ignored: the session still works, it just forgets. */
export function writeHidden(path: string, hidden: boolean): void {
	try {
		mkdirSync(dirname(path), { recursive: true });
		writeFileSync(path, `${JSON.stringify({ hidden }, null, 2)}\n`);
	} catch {
		// Ignore.
	}
}
