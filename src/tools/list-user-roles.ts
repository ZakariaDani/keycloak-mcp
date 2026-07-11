import { getKc } from "@/keycloak.js";
import { findUserId } from "@/tools/lookup.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import type RoleRepresentation from "@keycloak/keycloak-admin-client/lib/defs/roleRepresentation.js";
import { z } from "zod";

interface ClientRoleMapping {
  client?: string;
  mappings?: RoleRepresentation[];
}


export function registerListUserRoles(server: McpServer) {
  server.registerTool(
    "list-user-roles",
    {
      description:
        "List a user's directly-assigned role mappings (by username): realm roles plus, " +
        "grouped by client, any client roles.",
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

      const mappings = await kc.users.listRoleMappings({ realm, id: userId });

      const realmRoles = (mappings.realmMappings ?? []).map(role => ({
        id: role.id,
        name: role.name
      }));

      const clientMappings: Record<string, ClientRoleMapping> = mappings.clientMappings ?? {};
      const clientRoles = Object.values(clientMappings).map(mapping => ({
        client: mapping.client,
        roles: (mapping.mappings ?? []).map(role => ({ id: role.id, name: role.name }))
      }));

      return {
        content: [
          { type: "text", text: JSON.stringify({ username, realmRoles, clientRoles }, null, 2) }
        ]
      };
    }
  );
}
