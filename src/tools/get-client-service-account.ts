import { getKc } from "@/keycloak.js";
import { findClientUuid } from "@/tools/lookup.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerGetClientServiceAccount(server: McpServer) {
  server.registerTool(
    "get-client-service-account",
    {
      description:
        "Get the service-account user behind a client (by clientId). Use the returned username " +
        "with assign-realm-role / assign-client-role to give the client permissions. Fails if " +
        "serviceAccountsEnabled is off for that client.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        clientId: z.string().describe("The client's clientId string, e.g. my-backend")
      }
    },
    async ({ realm, clientId }) => {
      const kc = await getKc();
      const id = await findClientUuid(kc, realm, clientId);

      if (!id) {
        return {
          content: [{ type: "text", text: `Client "${clientId}" not found in realm ${realm}` }],
          isError: true
        };
      }

      const user = await kc.clients.getServiceAccountUser({ realm, id });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              { id: user.id, username: user.username, enabled: user.enabled },
              null,
              2
            )
          }
        ]
      };
    }
  );
}
