import { getKc } from "@/keycloak.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerSetRealmEnabled(server: McpServer) {
  server.registerTool(
    "set-realm-enabled",
    {
      description:
        "Enable or disable a Keycloak realm (by realm name). Disabling a realm immediately " +
        "prevents all logins to it, regardless of individual user status.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        enabled: z.boolean().describe("true to enable the realm, false to disable it")
      }
    },
    async ({ realm, enabled }) => {
      const kc = await getKc();

      const existing = await kc.realms.findOne({ realm });
      if (!existing) {
        return {
          content: [{ type: "text", text: `Realm "${realm}" not found` }],
          isError: true
        };
      }

      await kc.realms.update({ realm }, { realm, enabled });

      return {
        content: [{ type: "text", text: JSON.stringify({ realm, enabled }, null, 2) }]
      };
    }
  );
}
