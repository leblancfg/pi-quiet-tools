import type { ToolDefinition } from "@earendil-works/pi-coding-agent";
import { type Component, Container, Text } from "@earendil-works/pi-tui";
import { toOneLine, UNWRAPPED_WIDTH } from "./one-line.ts";

export type AnyToolDefinition = ToolDefinition<any, any, any>;

/** Per-row scratch space. Keys are prefixed because pi shares this object with the built-in renderers. */
interface RowState {
	quietToolsCall?: Component;
	quietToolsResult?: Component;
	quietToolsOneLine?: OneLine;
	quietToolsEmpty?: Container;
}

/** Renders the first line of another component and nothing else. */
export class OneLine implements Component {
	constructor(
		private inner: Component,
		private ellipsis: string,
	) {}

	update(inner: Component, ellipsis: string): void {
		this.inner = inner;
		this.ellipsis = ellipsis;
	}

	invalidate(): void {
		this.inner.invalidate?.();
	}

	render(width: number): string[] {
		return toOneLine(this.inner.render(UNWRAPPED_WIDTH), width, this.ellipsis);
	}
}

/** Pi's fallback display for tools that do not provide their own renderer. */
function renderGenericCall(
	definition: AnyToolDefinition,
	args: unknown,
	theme: Parameters<NonNullable<AnyToolDefinition["renderCall"]>>[1],
	expanded: boolean,
): Component {
	const title = theme.fg("toolTitle", theme.bold(definition.name));
	if (!args || typeof args !== "object" || Array.isArray(args) || Object.keys(args).length === 0) {
		return new Text(title, 0, 0);
	}

	const entries = Object.entries(args);
	if (expanded) {
		const lines = entries.map(([key, value]) => {
			const text = typeof value === "string" ? value : (JSON.stringify(value, null, 2) ?? String(value));
			return `  ${key}: ${text.replace(/\t/g, "   ").replace(/\r/g, "").split("\n").join("\n    ")}`;
		});
		return new Text(`${title}\n${theme.fg("muted", lines.join("\n"))}`, 0, 0);
	}

	const pairs = entries.map(([key, value]) => `${key}=${JSON.stringify(value) ?? String(value)}`).join(" ");
	return new Text(`${title} ${theme.fg("muted", pairs)}`, 0, 0);
}

function renderGenericResult(
	result: Parameters<NonNullable<AnyToolDefinition["renderResult"]>>[0],
	theme: Parameters<NonNullable<AnyToolDefinition["renderResult"]>>[2],
): Component {
	const output = result.content
		.filter((block): block is Extract<(typeof result.content)[number], { type: "text" }> => block.type === "text")
		.map((block) => block.text.replace(/\r/g, ""))
		.join("\n");
	return new Text(theme.fg("toolOutput", output), 0, 0);
}

/**
 * Wrap a tool definition so its output can be hidden at render time.
 *
 * Rendering is the only reason this extension replaces tools, so `execute` and
 * every other field pass through untouched. Pi's generic display is reproduced
 * for tools without custom renderers, including MCP resource tools.
 */
export function quieten(definition: AnyToolDefinition, isHidden: () => boolean): AnyToolDefinition {
	const renderCall =
		definition.renderCall ??
		((args, theme, context) => renderGenericCall(definition, args, theme, context.expanded));
	const renderResult =
		definition.renderResult ?? ((result, _options, theme) => renderGenericResult(result, theme));

	return {
		...definition,
		renderCall(args, theme, context) {
			const state = context.state as RowState;
			const inner = renderCall(args, theme, { ...context, lastComponent: state.quietToolsCall });
			state.quietToolsCall = inner;
			if (!isHidden()) {
				return inner;
			}
			const ellipsis = theme.fg("dim", "…");
			if (state.quietToolsOneLine) {
				state.quietToolsOneLine.update(inner, ellipsis);
			} else {
				state.quietToolsOneLine = new OneLine(inner, ellipsis);
			}
			return state.quietToolsOneLine;
		},
		renderResult(result, options, theme, context) {
			const state = context.state as RowState;
			// Always call pi's renderer, even when hiding: it owns the elapsed-time
			// timer for this row and has to see the result settle.
			const inner = renderResult(result, options, theme, { ...context, lastComponent: state.quietToolsResult });
			state.quietToolsResult = inner;
			if (!isHidden()) {
				return inner;
			}
			state.quietToolsEmpty ??= new Container();
			return state.quietToolsEmpty;
		},
	};
}
