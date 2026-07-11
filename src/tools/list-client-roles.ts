import { getKc } from "@/keycloak.js";
import { findClientUuid } from "@/tools/lookup.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerListClientRoles(server: McpServer) {
  server.registerTool(
    "list-client-roles",
    {
      description:
        "List the roles defined by a specific client in a Keycloak realm, identified by " +
        "its clientId (the human-readable string, e.g. account-console).",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        clientId: z
          .string()
          .describe("The client's clientId string, e.g. account-console")
      }
    },
    async ({ realm, clientId }) => {
      const kc = await getKc();
      const clientUuid = await findClientUuid(kc, realm, clientId);

      if (!clientUuid) {
        return {
          content: [{ type: "text", text: `Client "${clientId}" not found in realm ${realm}` }],
          isError: true
        };
      }

      const roles = await kc.clients.listRoles({ realm, id: clientUuid });

      const slim = roles.map(role => ({
        id: role.id,
        name: role.name,
        description: role.description ?? null,
        composite: role.composite ?? false
      }));

      return {
        content: [{ type: "text", text: JSON.stringify(slim, null, 2) }]
      };
    }
  );
}
