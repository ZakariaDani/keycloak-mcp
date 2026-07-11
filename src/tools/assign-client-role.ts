import { getKc } from "@/keycloak.js";
import { findClientUuid, findUserId } from "@/tools/lookup.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerAssignClientRole(server: McpServer) {
  server.registerTool(
    "assign-client-role",
    {
      description:
        "Assign a client-level role to a user (user by username, client by clientId string). " +
        "Idempotent: assigning an already-assigned role is a no-op.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        username: z.string().describe("Exact username of the user, e.g. jdoe"),
        clientId: z.string().describe("The client's clientId string, e.g. account-console"),
        roleName: z.string().describe("Client role name to assign, e.g. manage-account")
      }
    },
    async ({ realm, username, clientId, roleName }) => {
      const kc = await getKc();
      const userId = await findUserId(kc, realm, username);

      if (!userId) {
        return {
          content: [{ type: "text", text: `User "${username}" not found in realm ${realm}` }],
          isError: true
        };
      }

      const clientUuid = await findClientUuid(kc, realm, clientId);

      if (!clientUuid) {
        return {
          content: [{ type: "text", text: `Client "${clientId}" not found in realm ${realm}` }],
          isError: true
        };
      }

      const role = await kc.clients.findRole({ realm, id: clientUuid, roleName });

      if (!role?.id || !role.name) {
        return {
          content: [
            { type: "text", text: `Client role "${roleName}" not found on client ${clientId}` }
          ],
          isError: true
        };
      }

      await kc.users.addClientRoleMappings({
        realm,
        id: userId,
        clientUniqueId: clientUuid,
        roles: [{ id: role.id, name: role.name }]
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ username, clientId, roleName, assigned: true }, null, 2)
          }
        ]
      };
    }
  );
}
