import { getKc } from "@/keycloak.js";
import { findUserId } from "@/tools/lookup.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerAssignRealmRole(server: McpServer) {
  server.registerTool(
    "assign-realm-role",
    {
      description:
        "Assign a realm-level role to a user (both identified by name). Idempotent: assigning " +
        "an already-assigned role is a no-op.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        username: z.string().describe("Exact username of the user, e.g. jdoe"),
        roleName: z.string().describe("Realm role name to assign, e.g. offline_access")
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

      await kc.users.addRealmRoleMappings({
        realm,
        id: userId,
        roles: [{ id: role.id, name: role.name }]
      });

      return {
        content: [{ type: "text", text: JSON.stringify({ username, roleName, assigned: true }, null, 2) }]
      };
    }
  );
}
