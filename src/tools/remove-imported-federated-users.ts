import { getKc } from "@/keycloak.js";
import { findFederationProvider, notFoundProvider } from "@/tools/federation-lookup.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerRemoveImportedFederatedUsers(server: McpServer) {
  server.registerTool(
    "remove-imported-federated-users",
    {
      description:
        "Delete the Keycloak copies of all users imported from a federation provider (by name). " +
        "The users remain in the external directory and are re-imported the next time they log " +
        "in or a sync runs, but anything stored only in Keycloak for them (role/group mappings, " +
        "attributes, sessions) is lost. Affects ALL users of that provider. Cannot be undone.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        name: z.string().describe("Provider name")
      }
    },
    async ({ realm, name }) => {
      const kc = await getKc();
      const provider = await findFederationProvider(kc, realm, name);

      if (!provider) return notFoundProvider(name, realm);

      await kc.userStorageProvider.removeImportedUsers({ realm, id: provider.id });

      return {
        content: [{ type: "text", text: JSON.stringify({ name, importedUsersRemoved: true }, null, 2) }]
      };
    }
  );
}
