import { getKc } from "@/keycloak.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerDeleteIdentityProvider(server: McpServer) {
  server.registerTool(
    "delete-identity-provider",
    {
      description:
        "Delete an identity provider (by alias) from a realm, along with its mappers and the " +
        "links between it and users. Users who only signed in through it lose that login method. " +
        "Cannot be undone; prefer update-identity-provider with enabled=false to switch it off.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        alias: z.string().describe("Identity provider alias, e.g. google")
      }
    },
    async ({ realm, alias }) => {
      const kc = await getKc();
      const existing = await kc.identityProviders.findOne({ realm, alias });

      if (!existing) {
        return {
          content: [{ type: "text", text: `Identity provider "${alias}" not found in realm ${realm}` }],
          isError: true
        };
      }

      await kc.identityProviders.del({ realm, alias });

      return {
        content: [{ type: "text", text: JSON.stringify({ alias, deleted: true }, null, 2) }]
      };
    }
  );
}
