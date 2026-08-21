import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { readToolOptions } from "../src/tool-options.ts";

function settingsFile(contents: unknown): string {
	const path = join(mkdtempSync(join(tmpdir(), "pi-quiet-tools-")), "settings.json");
	writeFileSync(path, JSON.stringify(contents));
	return path;
}

describe("readToolOptions", () => {
	it("matches pi defaults when no settings file exists", () => {
		expect(readToolOptions(["/nope/settings.json"])).toEqual({
			read: { autoResizeImages: true },
			bash: { commandPrefix: undefined, shellPath: undefined },
		});
	});

	it("carries over the shell and image settings pi uses for built-in tools", () => {
		const path = settingsFile({
			shellPath: "/bin/zsh",
			shellCommandPrefix: "source ~/.profile",
			images: { autoResize: false },
		});
		expect(readToolOptions([path])).toEqual({
			read: { autoResizeImages: false },
			bash: { commandPrefix: "source ~/.profile", shellPath: "/bin/zsh" },
		});
	});

	it("lets later files override earlier ones, like project over global settings", () => {
		const global = settingsFile({ shellPath: "/bin/zsh", shellCommandPrefix: "global" });
		const project = settingsFile({ shellCommandPrefix: "project" });
		expect(readToolOptions([global, project])).toEqual({
			read: { autoResizeImages: true },
			bash: { commandPrefix: "project", shellPath: "/bin/zsh" },
		});
	});

	it("ignores values with the wrong type", () => {
		const path = settingsFile({ shellPath: 42, images: { autoResize: "no" } });
		expect(readToolOptions([path])).toEqual({
			read: { autoResizeImages: true },
			bash: { commandPrefix: undefined, shellPath: undefined },
		});
	});
});
