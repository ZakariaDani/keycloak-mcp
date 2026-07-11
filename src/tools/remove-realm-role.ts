import { getKc } from "@/keycloak.js";
import { findUserId } from "@/tools/lookup.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerRemoveRealmRole(server: McpServer) {
  server.registerTool(
    "remove-realm-role",
    {
      description:
        "Remove a realm-level role from a user (both identified by name). Idempotent: removing " +
        "a role the user does not have is a no-op.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        username: z.string().describe("Exact username of the user, e.g. jdoe"),
        roleName: z.string().describe("Realm role name to remove, e.g. offline_access")
      }
    },
    async ({ realm, username, roleName }) => {
      const kc = await getKc();
      const userId = await findUserId(kc, realm, username);

      if (!userId) {
        return {
          content: [{ type: "text", text: `User "${username}" not found in realm ${realm}` }],
          isError: true
        };
      }

      const role = await kc.roles.findOneByName({ realm, name: roleName });

      if (!role?.id || !role.name) {
        return {
          content: [{ type: "text", text: `Realm role "${roleName}" not found in realm ${realm}` }],
          isError: true
        };
      }

      await kc.users.delRealmRoleMappings({
        realm,
        id: userId,
        roles: [{ id: role.id, name: role.name }]
      });

      return {
        content: [{ type: "text", text: JSON.stringify({ username, roleName, removed: true }, null, 2) }]
      };
    }
  );
}
