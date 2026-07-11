import { getKc } from "@/keycloak.js";
import { findClientUuid } from "@/tools/lookup.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerRegenerateClientSecret(server: McpServer) {
  server.registerTool(
    "regenerate-client-secret",
    {
      description:
        "Rotate the secret of a confidential client (by clientId string) and return the new " +
        "value. The previous secret stops working immediately. Only works for non-public " +
        "clients. Handle the returned value as a sensitive credential.",
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

      const credential = await kc.clients.generateNewClientSecret({ realm, id: clientUuid });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              { clientId, type: credential.type ?? null, value: credential.value ?? null },
              null,
              2
            )
          }
        ]
      };
    }
  );
}
