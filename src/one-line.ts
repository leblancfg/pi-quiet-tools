import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";

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
	const first = lines[0];
	if (first === undefined) {
		return [];
	}
	const trimmed = trimTrailingSpaces(first);
	if (lines.length === 1 && visibleWidth(trimmed) <= width) {
		return [trimmed];
	}
	return [truncateToWidth(trimmed, Math.max(0, width - 1), "") + ellipsis];
}

/** Components pad their lines out to the render width. Those spaces are not content. */
function trimTrailingSpaces(line: string): string {
	return line.replace(/[ \t]+$/, "");
}
