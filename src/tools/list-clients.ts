import { getKc } from "@/keycloak.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerListClients(server: McpServer) {
  server.registerTool(
    "list-clients",
    {
      description:
        "List clients of a Keycloak realm. Returns id, clientId, name, enabled status, " +
        "protocol and whether the client is public. Supports filtering by clientId and pagination.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        clientId: z
          .string()
          .optional()
          .describe("Optional exact clientId to filter on, e.g. account-console"),
        first: z.number().int().min(0).default(0).describe("Pagination offset"),
        max: z.number().int().min(1).max(200).default(50).describe("Page size")
      }
    },
    async ({ realm, clientId, first, max }) => {
      const kc = await getKc();
      const clients = await kc.clients.find({ realm, clientId, first, max });

      const slim = clients.map(client => ({
        id: client.id,
        clientId: client.clientId,
        name: client.name ?? null,
        enabled: client.enabled,
        protocol: client.protocol ?? null,
        publicClient: client.publicClient ?? false,
        serviceAccountsEnabled: client.serviceAccountsEnabled ?? false
      }));

      return {
        content: [{ type: "text", text: JSON.stringify(slim, null, 2) }]
      };
    }
  );
}
