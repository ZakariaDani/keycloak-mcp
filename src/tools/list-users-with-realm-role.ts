import { getKc } from "@/keycloak.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerListUsersWithRealmRole(server: McpServer) {
  server.registerTool(
    "list-users-with-realm-role",
    {
      description:
        "List users that have a given realm-level role assigned. Returns id, username, " +
        "email and enabled status. Supports pagination.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        roleName: z.string().describe("Realm role name, e.g. offline_access"),
        first: z.number().int().min(0).default(0).describe("Pagination offset"),
        max: z.number().int().min(1).max(200).default(50).describe("Page size")
      }
    },
    async ({ realm, roleName, first, max }) => {
      const kc = await getKc();
      const users = await kc.roles.findUsersWithRole({ realm, name: roleName, first, max });

      const slim = users.map(user => ({
        id: user.id,
        username: user.username,
        email: user.email,
        enabled: user.enabled
      }));

      return {
        content: [{ type: "text", text: JSON.stringify({ roleName, users: slim }, null, 2) }]
      };
    }
  );
}
