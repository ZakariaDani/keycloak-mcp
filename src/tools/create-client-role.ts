import { getKc } from "@/keycloak.js";
import { findClientUuid } from "@/tools/lookup.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerCreateClientRole(server: McpServer) {
  server.registerTool(
    "create-client-role",
    {
      description:
        "Create a role owned by a client (by clientId). Fails if the client already has a " +
        "role with that name.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        clientId: z.string().describe("The client's clientId string, e.g. my-backend"),
        name: z.string().describe("Name of the new client role, e.g. invoice-approver"),
        description: z.string().optional().describe("Optional human-readable description")
      }
    },
    async ({ realm, clientId, name, description }) => {
      const kc = await getKc();
      const id = await findClientUuid(kc, realm, clientId);

      if (!id) {
        return {
          content: [{ type: "text", text: `Client "${clientId}" not found in realm ${realm}` }],
          isError: true
        };
      }

      await kc.clients.createRole({ realm, id, name, description });

      return {
        content: [{ type: "text", text: JSON.stringify({ clientId, name, created: true }, null, 2) }]
      };
    }
  );
}
