import { getKc } from "@/keycloak.js";
import { USER_STORAGE_TYPE } from "@/tools/federation-lookup.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerListUserFederationProviders(server: McpServer) {
  server.registerTool(
    "list-user-federation-providers",
    {
      description:
        "List a realm's user federation providers (LDAP, Active Directory, Kerberos, custom): " +
        "name, provider type, whether enabled, priority, edit mode and, for LDAP, the " +
        "connection URL. Use get-user-federation-provider for the full config.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm")
      }
    },
    async ({ realm }) => {
      const kc = await getKc();
      const providers = await kc.components.find({ realm, type: USER_STORAGE_TYPE });

      const first = (value: string | string[] | undefined) => (Array.isArray(value) ? (value[0] ?? null) : (value ?? null));

      const slim = providers.map(provider => ({
        id: provider.id,
        name: provider.name,
        providerId: provider.providerId,
        enabled: first(provider.config?.enabled) !== "false",
        priority: first(provider.config?.priority),
        editMode: first(provider.config?.editMode),
        connectionUrl: first(provider.config?.connectionUrl)
      }));

      return {
        content: [{ type: "text", text: JSON.stringify(slim, null, 2) }]
      };
    }
  );
}
