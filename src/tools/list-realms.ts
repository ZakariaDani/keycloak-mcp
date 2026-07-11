import { getKc } from "@/keycloak.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerListRealms(server: McpServer) {
  server.registerTool(
    "list-realms",
    {
      description:
        "List the realms visible to the admin service account. Returns id, realm name and " +
        "enabled status. Requires the service account to have realm-view permissions.",
      inputSchema: {}
    },
    async () => {
      const kc = await getKc();
      const realms = await kc.realms.find();

      const slim = realms.map(realm => ({
        id: realm.id,
        realm: realm.realm,
        enabled: realm.enabled ?? false
      }));

      return {
        content: [{ type: "text", text: JSON.stringify(slim, null, 2) }]
      };
    }
  );
}
