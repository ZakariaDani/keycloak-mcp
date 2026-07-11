import { getKc } from "@/keycloak.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerGetClient(server: McpServer) {
  server.registerTool(
    "get-client",
    {
      description:
        "Get a single Keycloak client by its clientId string, including protocol, flow " +
        "settings, redirect URIs and web origins. Does not return the client secret " +
        "(use get-client-secret for that).",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        clientId: z.string().describe("The client's clientId string, e.g. account-console")
      }
    },
    async ({ realm, clientId }) => {
      const kc = await getKc();
      const clients = await kc.clients.find({ realm, clientId });
      const client = clients[0];

      if (!client) {
        return {
          content: [{ type: "text", text: `Client "${clientId}" not found in realm ${realm}` }],
          isError: true
        };
      }

      const slim = {
        id: client.id,
        clientId: client.clientId,
        name: client.name ?? null,
        description: client.description ?? null,
        enabled: client.enabled,
        protocol: client.protocol ?? null,
        publicClient: client.publicClient ?? false,
        bearerOnly: client.bearerOnly ?? false,
        standardFlowEnabled: client.standardFlowEnabled ?? false,
        directAccessGrantsEnabled: client.directAccessGrantsEnabled ?? false,
        serviceAccountsEnabled: client.serviceAccountsEnabled ?? false,
        rootUrl: client.rootUrl ?? null,
        baseUrl: client.baseUrl ?? null,
        redirectUris: client.redirectUris ?? [],
        webOrigins: client.webOrigins ?? []
      };

      return {
        content: [{ type: "text", text: JSON.stringify(slim, null, 2) }]
      };
    }
  );
}
