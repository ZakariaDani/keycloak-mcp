import { getKc } from "@/keycloak.js";
import { findFederationProvider, notFoundProvider } from "@/tools/federation-lookup.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerSyncUserFederationProvider(server: McpServer) {
  server.registerTool(
    "sync-user-federation-provider",
    {
      description:
        "Import users from the external directory now. full re-imports every user and updates " +
        "existing ones; changed only picks up users created or modified since the last sync. " +
        "Returns how many users were added, updated, removed and failed. A full sync of a large " +
        "directory can take a while.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        name: z.string().describe("Provider name"),
        mode: z.enum(["full", "changed"]).default("changed").describe("full or changed-users sync")
      }
    },
    async ({ realm, name, mode }) => {
      const kc = await getKc();
      const provider = await findFederationProvider(kc, realm, name);

      if (!provider) return notFoundProvider(name, realm);

      const result = await kc.userStorageProvider.sync({
        realm,
        id: provider.id,
        action: mode === "full" ? "triggerFullSync" : "triggerChangedUsersSync"
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                name,
                mode,
                added: result.added ?? 0,
                updated: result.updated ?? 0,
                removed: result.removed ?? 0,
                failed: result.failed ?? 0,
                status: result.status ?? null,
                ignored: result.ignored ?? false
              },
              null,
              2
            )
          }
        ]
      };
    }
  );
}
