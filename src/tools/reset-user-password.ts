import { getKc } from "@/keycloak.js";
import { findUserId } from "@/tools/lookup.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerResetUserPassword(server: McpServer) {
  server.registerTool(
    "reset-user-password",
    {
      description:
        "Set a new password for a user (by username). When temporary is true, the user must " +
        "change the password at next login.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        username: z.string().describe("Exact username of the user, e.g. jdoe"),
        password: z.string().min(1).describe("The new password value"),
        temporary: z
          .boolean()
          .default(true)
          .describe("Require the user to change it at next login")
      }
    },
    async ({ realm, username, password, temporary }) => {
      const kc = await getKc();
      const userId = await findUserId(kc, realm, username);

      if (!userId) {
        return {
          content: [{ type: "text", text: `User "${username}" not found in realm ${realm}` }],
          isError: true
        };
      }

      await kc.users.resetPassword({
        realm,
        id: userId,
        credential: { type: "password", value: password, temporary }
      });

      return {
        content: [{ type: "text", text: JSON.stringify({ username, temporary, reset: true }, null, 2) }]
      };
    }
  );
}
