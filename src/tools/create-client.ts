import { getKc } from "@/keycloak.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerCreateClient(server: McpServer) {
  server.registerTool(
    "create-client",
    {
      description:
        "Register a new client in a realm. Defaults to a confidential standard-flow client; " +
        "set publicClient for SPAs or serviceAccountsEnabled for machine-to-machine clients. " +
        "Fails if the clientId already exists.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        clientId: z.string().describe("The clientId string for the new client, e.g. my-backend"),
        name: z.string().optional().describe("Optional display name"),
        description: z.string().optional().describe("Optional description"),
        publicClient: z
          .boolean()
          .default(false)
          .describe("true for a public client (no secret), e.g. an SPA"),
        standardFlowEnabled: z
          .boolean()
          .default(true)
          .describe("Enable the authorization code flow"),
        serviceAccountsEnabled: z
          .boolean()
          .default(false)
          .describe("Enable the service account (client_credentials) flow"),
        redirectUris: z
          .array(z.string())
          .optional()
          .describe("Valid redirect URIs, e.g. [\"https://app.example.com/*\"]"),
        webOrigins: z
          .array(z.string())
          .optional()
          .describe("Allowed CORS web origins, e.g. [\"https://app.example.com\"]")
      }
    },
    async ({
      realm,
      clientId,
      name,
      description,
      publicClient,
      standardFlowEnabled,
      serviceAccountsEnabled,
      redirectUris,
      webOrigins
    }) => {
      const kc = await getKc();

      const created = await kc.clients.create({
        realm,
        clientId,
        name,
        description,
        publicClient,
        standardFlowEnabled,
        serviceAccountsEnabled,
        ...(redirectUris ? { redirectUris } : {}),
        ...(webOrigins ? { webOrigins } : {})
      });

      return {
        content: [{ type: "text", text: JSON.stringify({ id: created.id, clientId }, null, 2) }]
      };
    }
  );
}
