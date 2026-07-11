import { getKc } from "@/keycloak.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerDeleteRealmRole(server: McpServer) {
  server.registerTool(
    "delete-realm-role",
    {
      description:
        "Delete a realm-level role by name. This removes the role from every user and group " +
        "it was mapped to. Cannot be undone.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        name: z.string().describe("Name of the realm role to delete, e.g. billing-admin")
      }
    },
    async ({ realm, name }) => {
      const kc = await getKc();

      const role = await kc.roles.findOneByName({ realm, name });

      if (!role) {
        return {
          content: [{ type: "text", text: `Realm role "${name}" not found in realm ${realm}` }],
          isError: true
        };
      }

      await kc.roles.delByName({ realm, name });

      return {
        content: [{ type: "text", text: JSON.stringify({ realm, name, deleted: true }, null, 2) }]
      };
    }
  );
}
