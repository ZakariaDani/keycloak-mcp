import { getKc } from "@/keycloak.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";

interface SlimGroup {
  id: string | undefined;
  name: string | undefined;
  path: string | undefined;
  subGroups: SlimGroup[];
}

function slimGroup(group: {
  id?: string;
  name?: string;
  path?: string;
  subGroups?: unknown[];
}): SlimGroup {
  return {
    id: group.id,
    name: group.name,
    path: group.path,
    subGroups: (group.subGroups ?? []).map(sub => slimGroup(sub as Parameters<typeof slimGroup>[0]))
  };
}

export function registerListGroups(server: McpServer) {
  server.registerTool(
    "list-groups",
    {
      description:
        "List groups of a Keycloak realm as a tree (id, name, path and nested subGroups). " +
        "Supports search and pagination over top-level groups.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        search: z.string().optional().describe("Optional filter on group name"),
        first: z.number().int().min(0).default(0).describe("Pagination offset"),
        max: z.number().int().min(1).max(200).default(50).describe("Page size")
      }
    },
    async ({ realm, search, first, max }) => {
      const kc = await getKc();
      const groups = await kc.groups.find({ realm, search, first, max });

      const slim = groups.map(slimGroup);

      return {
        content: [{ type: "text", text: JSON.stringify(slim, null, 2) }]
      };
    }
  );
}
