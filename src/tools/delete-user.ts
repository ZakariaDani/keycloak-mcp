import { getKc } from "@/keycloak.js";
import { findUserId } from "@/tools/lookup.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerDeleteUser(server: McpServer) {
  server.registerTool(
    "delete-user",
    {
      description:
        "Permanently delete a user from a realm (by username). This cannot be undone; " +
        "consider set-user-enabled(false) if you only need to block access temporarily.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        username: z.string().describe("Exact username of the user, e.g. jdoe")
      }
    },
    async ({ realm, username }) => {
      const kc = await getKc();
      const userId = await findUserId(kc, realm, username);

      if (!userId) {
        return {
          content: [{ type: "text", text: `User "${username}" not found in realm ${realm}` }],
          isError: true
        };
      }

      await kc.users.del({ realm, id: userId });

      return {
        content: [{ type: "text", text: JSON.stringify({ username, deleted: true }, null, 2) }]
      };
    }
  );
}
