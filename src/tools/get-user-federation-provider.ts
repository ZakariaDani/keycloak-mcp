import { getKc } from "@/keycloak.js";
import { findFederationProvider, flattenConfig, notFoundProvider } from "@/tools/federation-lookup.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerGetUserFederationProvider(server: McpServer) {
  server.registerTool(
    "get-user-federation-provider",
    {
      description:
        "Get one user federation provider by name with its full config (connection URL, users " +
        "DN, attribute names, edit mode, sync periods...). Secrets such as the bind credential " +
        "are never returned; secretsSet lists which ones are configured.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        name: z.string().describe("Provider name as shown in list-user-federation-providers")
      }
    },
    async ({ realm, name }) => {
      const kc = await getKc();
      const provider = await findFederationProvider(kc, realm, name);

      if (!provider) return notFoundProvider(name, realm);

      const { config, secretsSet } = flattenConfig(provider.config);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              { id: provider.id, name: provider.name, providerId: provider.providerId, config, secretsSet },
              null,
              2
            )
          }
        ]
      };
    }
  );
}
