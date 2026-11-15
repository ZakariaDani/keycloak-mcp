import { getKc } from "@/keycloak.js";
import { findGroup } from "@/tools/lookup.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerUpdateGroup(server: McpServer) {
  server.registerTool(
    "update-group",
    {
      description:
        "Rename a group (by path or name). Its members, subgroups and role mappings are kept; " +
        "the group path changes to reflect the new name.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        group: z.string().describe("Group path (e.g. /staff/admins) or group name"),
        newName: z.string().describe("New name for the group")
      }
    },
    async ({ realm, group, newName }) => {
      const kc = await getKc();
      const resolved = await findGroup(kc, realm, group);

      if (!resolved?.id) {
        return {
          content: [{ type: "text", text: `Group "${group}" not found in realm ${realm}` }],
          isError: true
        };
      }

      // Pass attributes through: the PUT would otherwise clear them.
      await kc.groups.update(
        { realm, id: resolved.id },
        { name: newName, attributes: resolved.attributes }
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ from: resolved.path ?? resolved.name, name: newName }, null, 2)
          }
        ]
      };
    }
  );
}
