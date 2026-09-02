import {
	sliceByColumn,
	stripTerminalSequences,
	truncateToWidth,
	visibleWidth,
} from "@earendil-works/pi-tui";

/** Wide enough that a tool call renders on one line before it gets cut down. */
export const UNWRAPPED_WIDTH = 512;

/**
 * Reduce rendered lines to a single line that fits the terminal.
 *
 * Give this the lines a component produced at `UNWRAPPED_WIDTH`, not at the real
 * terminal width. Word wrapping at the real width can push the interesting part
 * of a command onto a dropped line.
 *
 * The ellipsis marks a line that lost content, either to the width limit or to
 * the lines below it.
 */
export function toOneLine(lines: string[], width: number, ellipsis: string): string[] {
	const contentLines = lines.map(trimVisualPadding).filter((line) => line !== undefined);
	const first = contentLines[0];
	if (first === undefined) {
		return [];
	}
	if (contentLines.length === 1 && visibleWidth(first) <= width) {
		return [first];
	}
	return [truncateToWidth(first, Math.max(0, width - 1), "") + ellipsis];
}

/** Remove box padding while preserving the line's ANSI styling. */
function trimVisualPadding(line: string): string | undefined {
	const plain = stripTerminalSequences(line);
	const firstContentIndex = plain.search(/\S/);
	if (firstContentIndex === -1) return undefined;

	const startColumn = visibleWidth(plain.slice(0, firstContentIndex));
	const contentWidth = visibleWidth(plain.trim());
	return sliceByColumn(line, startColumn, contentWidth);
}
