import { getKc } from "@/keycloak.js";
import { findGroup } from "@/tools/lookup.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerCreateGroup(server: McpServer) {
  server.registerTool(
    "create-group",
    {
      description:
        "Create a group in a realm. Creates a top-level group, or a nested child when a " +
        "parent group (by path or name) is supplied. Fails if the group already exists.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        name: z.string().describe("Name of the new group, e.g. admins"),
        parent: z
          .string()
          .optional()
          .describe("Optional parent group path or name to nest under, e.g. /staff")
      }
    },
    async ({ realm, name, parent }) => {
      const kc = await getKc();

      if (parent) {
        const parentGroup = await findGroup(kc, realm, parent);

        if (!parentGroup?.id) {
          return {
            content: [{ type: "text", text: `Parent group "${parent}" not found in realm ${realm}` }],
            isError: true
          };
        }

        const created = await kc.groups.createChildGroup({ realm, id: parentGroup.id }, { name });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ id: created.id, name, parent: parentGroup.path ?? parent }, null, 2)
            }
          ]
        };
      }

      const created = await kc.groups.create({ realm, name });

      return {
        content: [{ type: "text", text: JSON.stringify({ id: created.id, name }, null, 2) }]
      };
    }
  );
}
