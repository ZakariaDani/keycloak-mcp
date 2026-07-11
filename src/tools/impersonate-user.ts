import { getKc } from "@/keycloak.js";
import { findUserId } from "@/tools/lookup.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerImpersonateUser(server: McpServer) {
  server.registerTool(
    "impersonate-user",
    {
      description:
        "Start an impersonation session for a user (by username) via the admin account. " +
        "SENSITIVE: this grants the ability to act as the user; the response may contain " +
        "session/redirect data that should be handled as a credential.",
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

      const result = await kc.users.impersonation(
        { realm, id: userId },
        { user: userId, realm }
      );

      return {
        content: [{ type: "text", text: JSON.stringify({ username, impersonation: result }, null, 2) }]
      };
    }
  );
}
