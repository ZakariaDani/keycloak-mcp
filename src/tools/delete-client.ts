import { getKc } from "@/keycloak.js";
import { findClientUuid } from "@/tools/lookup.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerDeleteClient(server: McpServer) {
  server.registerTool(
    "delete-client",
    {
      description:
        "Delete a client (by clientId) from a realm, including its roles, secret and service " +
        "account. Cannot be undone.",
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

      await kc.clients.del({ realm, id });

      return {
        content: [{ type: "text", text: JSON.stringify({ clientId, deleted: true }, null, 2) }]
      };
    }
  );
}
