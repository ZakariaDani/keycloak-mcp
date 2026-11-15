import { getKc } from "@/keycloak.js";
import { findFederationProvider, notFoundProvider } from "@/tools/federation-lookup.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerDeleteUserFederationProvider(server: McpServer) {
  server.registerTool(
    "delete-user-federation-provider",
    {
      description:
        "Delete a user federation provider (by name) and its mappers. Keycloak also removes the " +
        "users that were imported from it, with their sessions and role/group mappings, so those " +
        "people can no longer log in. To keep them as ordinary local users, run " +
        "unlink-federated-users first (they will need a password). Cannot be undone; to pause " +
        "instead, use update-user-federation-provider with enabled=false.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        name: z.string().describe("Provider name")
      }
    },
    async ({ realm, name }) => {
      const kc = await getKc();
      const provider = await findFederationProvider(kc, realm, name);

      if (!provider) return notFoundProvider(name, realm);

      await kc.components.del({ realm, id: provider.id });

      return {
        content: [{ type: "text", text: JSON.stringify({ name, deleted: true }, null, 2) }]
      };
    }
  );
}
