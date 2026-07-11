import { getKc } from "@/keycloak.js";
import { findUserId } from "@/tools/lookup.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerSetUserEnabled(server: McpServer) {
  server.registerTool(
    "set-user-enabled",
    {
      description:
        "Enable or disable a user account (by username). Disabling immediately prevents the " +
        "user from logging in.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        username: z.string().describe("Exact username of the user, e.g. jdoe"),
        enabled: z.boolean().describe("true to enable the account, false to disable it")
      }
    },
    async ({ realm, username, enabled }) => {
      const kc = await getKc();
      const userId = await findUserId(kc, realm, username);

      if (!userId) {
        return {
          content: [{ type: "text", text: `User "${username}" not found in realm ${realm}` }],
          isError: true
        };
      }

      await kc.users.update({ realm, id: userId }, { enabled });

      return {
        content: [{ type: "text", text: JSON.stringify({ username, enabled }, null, 2) }]
      };
    }
  );
}
