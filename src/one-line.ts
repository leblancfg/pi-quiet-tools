import { truncateToWidth } from "@earendil-works/pi-tui";

/**
 * Reduce the lines of an already rendered component to a single line.
 *
 * A tool call that pi wrapped over several lines gets the ellipsis appended, so
 * the row shows that content was dropped.
 */
export function toOneLine(lines: string[], width: number, ellipsis: string): string[] {
	const first = lines[0];
	if (first === undefined) {
		return [];
	}
	if (lines.length === 1) {
		return [truncateToWidth(first, width)];
	}
	const budget = Math.max(0, width - 1);
	return [truncateToWidth(first, budget, "") + ellipsis];
}
