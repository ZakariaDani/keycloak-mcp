import { getKc } from "@/keycloak.js";
import { findGroup } from "@/tools/lookup.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerListGroupMembers(server: McpServer) {
  server.registerTool(
    "list-group-members",
    {
      description:
        "List the members of a Keycloak group, identified by its full path (e.g. /parent/child) " +
        "or by name. Returns id, username, email and enabled status. Supports pagination.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        group: z.string().describe("Group path (e.g. /admins) or group name"),
        first: z.number().int().min(0).default(0).describe("Pagination offset"),
        max: z.number().int().min(1).max(200).default(50).describe("Page size")
      }
    },
    async ({ realm, group, first, max }) => {
      const kc = await getKc();
      const resolved = await findGroup(kc, realm, group);

      if (!resolved?.id) {
        return {
          content: [{ type: "text", text: `Group "${group}" not found in realm ${realm}` }],
          isError: true
        };
      }

      const members = await kc.groups.listMembers({ realm, id: resolved.id, first, max });

      const slim = members.map(user => ({
        id: user.id,
        username: user.username,
        email: user.email,
        enabled: user.enabled
      }));

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ group: resolved.path ?? resolved.name, members: slim }, null, 2)
          }
        ]
      };
    }
  );
}
