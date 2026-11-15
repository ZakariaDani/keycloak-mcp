import { getKc } from "@/keycloak.js";
import { findFederationProvider, notFoundProvider } from "@/tools/federation-lookup.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerUnlinkFederatedUsers(server: McpServer) {
  server.registerTool(
    "unlink-federated-users",
    {
      description:
        "Detach every user imported from a federation provider (by name) so they become " +
        "ordinary local Keycloak users. They keep their profile but are no longer authenticated " +
        "by the directory, so they need a local password (e.g. reset-user-password or " +
        "send-user-actions-email with UPDATE_PASSWORD). Use before delete-user-federation-provider " +
        "to keep the users. Affects ALL users of that provider.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        name: z.string().describe("Provider name")
      }
    },
    async ({ realm, name }) => {
      const kc = await getKc();
      const provider = await findFederationProvider(kc, realm, name);

      if (!provider) return notFoundProvider(name, realm);

      await kc.userStorageProvider.unlinkUsers({ realm, id: provider.id });

      return {
        content: [{ type: "text", text: JSON.stringify({ name, unlinked: true }, null, 2) }]
      };
    }
  );
}
