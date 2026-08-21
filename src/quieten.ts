import type { ToolDefinition } from "@earendil-works/pi-coding-agent";
import { type Component, Container } from "@earendil-works/pi-tui";
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

/**
 * Wrap a tool definition so its output can be hidden at render time.
 *
 * Rendering is the only reason this extension replaces built-in tools, so
 * `execute` and every other field pass through untouched. Definitions without
 * both renderers are returned as they are.
 */
export function quieten(definition: AnyToolDefinition, isHidden: () => boolean): AnyToolDefinition {
	const renderCall = definition.renderCall;
	const renderResult = definition.renderResult;
	if (!renderCall || !renderResult) {
		return definition;
	}

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
