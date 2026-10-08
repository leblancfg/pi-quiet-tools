import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { readReplacedBuiltins } from "../src/builtins.ts";

function settings(content: unknown): string {
	const path = join(mkdtempSync(join(tmpdir(), "quiet-builtins-")), "settings.json");
	writeFileSync(path, JSON.stringify(content));
	return path;
}

describe("readReplacedBuiltins", () => {
	it("reads the built-ins the user opted in to", () => {
		const path = settings({ quietTools: { builtins: ["codemode", "mcp", "llama.cpp"] } });
		expect([...readReplacedBuiltins([path])]).toEqual(["codemode", "mcp"]);
	});

	it("lets a later settings file replace the list", () => {
		const user = settings({ quietTools: { builtins: ["codemode", "tool-search"] } });
		const project = settings({ quietTools: { builtins: [] } });
		expect(readReplacedBuiltins([user, project]).size).toBe(0);
	});

	it("takes over nothing by default", () => {
		const path = settings({ extensions: ["-builtin:mcp"] });
		expect(readReplacedBuiltins([path, "/does/not/exist.json"]).size).toBe(0);
	});
});
