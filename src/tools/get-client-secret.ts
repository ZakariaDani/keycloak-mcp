import { getKc } from "@/keycloak.js";
import { findClientUuid } from "@/tools/lookup.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerGetClientSecret(server: McpServer) {
  server.registerTool(
    "get-client-secret",
    {
      description:
        "Retrieve the current secret of a confidential Keycloak client, identified by its " +
        "clientId string. Only works for non-public clients. Handle the returned value as a " +
        "sensitive credential.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        clientId: z.string().describe("The client's clientId string, e.g. my-backend")
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

      const credential = await kc.clients.getClientSecret({ realm, id: clientUuid });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ clientId, type: credential.type ?? null, value: credential.value ?? null }, null, 2)
          }
        ]
      };
    }
  );
}
