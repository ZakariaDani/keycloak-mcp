import { TOOL_GROUPS, type ToolGroupName } from "@/tools/groups.js";
import { parseToolGroups } from "@/tools/select-groups.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";

/**
 * Register the tools of the selected groups. `selection` is the raw KEYCLOAK_TOOLS value:
 * a comma-separated list of group names, or unset/"all" for everything.
 * Throws on an unknown group name.
 */
export function registerTools(server: McpServer, selection: string | undefined = process.env.KEYCLOAK_TOOLS) {
  const names = parseToolGroups(selection, Object.keys(TOOL_GROUPS)) as ToolGroupName[];

  let count = 0;
  for (const name of names) {
    for (const register of TOOL_GROUPS[name]) {
      register(server);
      count += 1;
    }
  }

  console.error(`keycloak-mcp: ${count} tools registered (groups: ${names.join(", ")})`);
}
