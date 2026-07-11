import { getKc } from "@/keycloak.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerCountUsers(server: McpServer) {
  server.registerTool(
    "count-users",
    {
      description:
        "Count users in a Keycloak realm, optionally matching a search term " +
        "(username/email/name). Useful before paginating with list-users.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        search: z.string().optional().describe("Optional filter on username/email/name")
      }
    },
    async ({ realm, search }) => {
      const kc = await getKc();
      const count = await kc.users.count({ realm, search });

      return {
        content: [{ type: "text", text: JSON.stringify({ realm, search: search ?? null, count }, null, 2) }]
      };
    }
  );
}
