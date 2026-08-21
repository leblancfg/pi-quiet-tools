import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { readHidden, writeHidden } from "../src/state.ts";

function tempFile(name = "state.json"): string {
	return join(mkdtempSync(join(tmpdir(), "pi-quiet-tools-")), name);
}

describe("readHidden", () => {
	it("defaults to false when the file is missing", () => {
		expect(readHidden(tempFile())).toBe(false);
	});

	it("defaults to false when the file is not valid JSON", () => {
		const path = tempFile();
		writeFileSync(path, "{ broken");
		expect(readHidden(path)).toBe(false);
	});

	it("defaults to false when the key has the wrong type", () => {
		const path = tempFile();
		writeFileSync(path, JSON.stringify({ hidden: "yes" }));
		expect(readHidden(path)).toBe(false);
	});

	it("reads a stored value", () => {
		const path = tempFile();
		writeFileSync(path, JSON.stringify({ hidden: true }));
		expect(readHidden(path)).toBe(true);
	});
});

describe("writeHidden", () => {
	it("creates missing directories and round-trips the value", () => {
		const path = join(mkdtempSync(join(tmpdir(), "pi-quiet-tools-")), "nested", "state.json");
		writeHidden(path, true);
		expect(JSON.parse(readFileSync(path, "utf8"))).toEqual({ hidden: true });
		expect(readHidden(path)).toBe(true);
	});

	it("never throws when the path cannot be written", () => {
		expect(() => writeHidden("/dev/null/nope/state.json", true)).not.toThrow();
	});
});
