import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { type AnyToolDefinition, quieten } from "./quieten.ts";

/**
 * Give another extension an API that quietens every tool it registers.
 *
 * The proxy stays in the extension's closures, so tools registered later—for
 * example after an MCP server connects—are wrapped too.
 */
export function createQuietToolApi(pi: ExtensionAPI, isHidden: () => boolean): ExtensionAPI {
	return new Proxy(pi, {
		get(target, property, receiver) {
			if (property === "registerTool") {
				return (definition: AnyToolDefinition) => target.registerTool(quieten(definition, isHidden));
			}
			return Reflect.get(target, property, receiver);
		},
	});
}
