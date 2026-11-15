import { getKc } from "@/keycloak.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerCreateRealm(server: McpServer) {
  server.registerTool(
    "create-realm",
    {
      description:
        "Create a new, empty realm. It starts with Keycloak's defaults (no users, no custom " +
        "clients); tune it afterwards with update-realm-settings and update-realm-smtp. The " +
        "service account only gets access to the new realm if it holds realm-management roles " +
        "there or the global admin role. Fails if the realm name already exists.",
      inputSchema: {
        realm: z.string().describe("Realm name used in URLs, e.g. financement-realm"),
        displayName: z.string().optional().describe("Optional human-readable name"),
        enabled: z.boolean().default(true).describe("Enable the realm immediately")
      }
    },
    async ({ realm, displayName, enabled }) => {
      const kc = await getKc();

      await kc.realms.create({ realm, displayName, enabled });

      return {
        content: [{ type: "text", text: JSON.stringify({ realm, enabled, created: true }, null, 2) }]
      };
    }
  );
}
