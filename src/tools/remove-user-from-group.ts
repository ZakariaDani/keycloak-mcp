import { getKc } from "@/keycloak.js";
import { findGroup, findUserId } from "@/tools/lookup.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerRemoveUserFromGroup(server: McpServer) {
  server.registerTool(
    "remove-user-from-group",
    {
      description:
        "Remove a user (by username) from a group (by path or name). Idempotent: removing a " +
        "user not in the group is a no-op.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        username: z.string().describe("Exact username of the user, e.g. jdoe"),
        group: z.string().describe("Group path (e.g. /admins) or group name")
      }
    },
    async ({ realm, username, group }) => {
      const kc = await getKc();
      const userId = await findUserId(kc, realm, username);

      if (!userId) {
        return {
          content: [{ type: "text", text: `User "${username}" not found in realm ${realm}` }],
          isError: true
        };
      }

      const resolved = await findGroup(kc, realm, group);

      if (!resolved?.id) {
        return {
          content: [{ type: "text", text: `Group "${group}" not found in realm ${realm}` }],
          isError: true
        };
      }

      await kc.users.delFromGroup({ realm, id: userId, groupId: resolved.id });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ username, group: resolved.path ?? resolved.name, removed: true }, null, 2)
          }
        ]
      };
    }
  );
}
