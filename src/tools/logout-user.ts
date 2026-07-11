import { getKc } from "@/keycloak.js";
import { findUserId } from "@/tools/lookup.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerLogoutUser(server: McpServer) {
  server.registerTool(
    "logout-user",
    {
      description:
        "Revoke all active sessions of a user (by username), forcing re-authentication on " +
        "every device. Useful for security response after a credential compromise.",
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

      await kc.users.logout({ realm, id: userId });

      return {
        content: [{ type: "text", text: JSON.stringify({ username, loggedOut: true }, null, 2) }]
      };
    }
  );
}
