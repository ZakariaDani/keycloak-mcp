import { getKc } from "@/keycloak.js";
import { findUserId } from "@/tools/lookup.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerListUserGroups(server: McpServer) {
  server.registerTool(
    "list-user-groups",
    {
      description:
        "List the groups a user (by username) is a direct member of. Returns id, name and " +
        "full path for each group.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        username: z.string().describe("Exact username of the user, e.g. jdoe")
      }
    },
    async ({ realm, username }) => {
      const kc = await getKc();
      const userId = await findUserId(kc, realm, username);

      if (!userId) {
        return {
          content: [{ type: "text", text: `User "${username}" not found in realm ${realm}` }],
          isError: true
        };
      }

      const groups = await kc.users.listGroups({ realm, id: userId });

      const slim = groups.map(group => ({
        id: group.id,
        name: group.name,
        path: group.path ?? null
      }));

      return {
        content: [{ type: "text", text: JSON.stringify({ username, groups: slim }, null, 2) }]
      };
    }
  );
}
