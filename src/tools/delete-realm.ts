import { getKc } from "@/keycloak.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerDeleteRealm(server: McpServer) {
  server.registerTool(
    "delete-realm",
    {
      description:
        "Permanently delete a realm and EVERYTHING in it: users, credentials, clients, roles, " +
        "groups, sessions and settings. Cannot be undone. To guard against mistakes, confirm " +
        "must repeat the realm name exactly. The master realm and the realm the service " +
        "account authenticates in (KEYCLOAK_REALM) are refused. Prefer set-realm-enabled " +
        "with enabled=false for a reversible shutdown.",
      inputSchema: {
        realm: z.string().describe("Realm name to delete, e.g. staging-realm"),
        confirm: z.string().describe("Must equal the realm name exactly")
      }
    },
    async ({ realm, confirm }) => {
      if (confirm !== realm) {
        return {
          content: [{ type: "text", text: `Not deleted: confirm must equal the realm name "${realm}"` }],
          isError: true
        };
      }

      const authRealm = process.env.KEYCLOAK_REALM ?? "master";

      if (realm === "master" || realm === authRealm) {
        return {
          content: [
            {
              type: "text",
              text: `Refusing to delete "${realm}": it is the master realm or the realm this server authenticates in`
            }
          ],
          isError: true
        };
      }

      const kc = await getKc();

      if (!(await kc.realms.findOne({ realm }))) {
        return {
          content: [{ type: "text", text: `Realm "${realm}" not found` }],
          isError: true
        };
      }

      await kc.realms.del({ realm });

      return {
        content: [{ type: "text", text: JSON.stringify({ realm, deleted: true }, null, 2) }]
      };
    }
  );
}
