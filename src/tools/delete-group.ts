import { getKc } from "@/keycloak.js";
import { findGroup } from "@/tools/lookup.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerDeleteGroup(server: McpServer) {
  server.registerTool(
    "delete-group",
    {
      description:
        "Delete a group (by path or name) from a realm. This also removes all of its " +
        "subgroups and their memberships. Cannot be undone.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        group: z.string().describe("Group path (e.g. /admins) or group name")
      }
    },
    async ({ realm, group }) => {
      const kc = await getKc();
      const resolved = await findGroup(kc, realm, group);

      if (!resolved?.id) {
        return {
          content: [{ type: "text", text: `Group "${group}" not found in realm ${realm}` }],
          isError: true
        };
      }

      await kc.groups.del({ realm, id: resolved.id });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ group: resolved.path ?? resolved.name, deleted: true }, null, 2)
          }
        ]
      };
    }
  );
}
