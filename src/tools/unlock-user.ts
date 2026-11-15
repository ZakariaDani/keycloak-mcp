import { getKc } from "@/keycloak.js";
import { findUserId } from "@/tools/lookup.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerUnlockUser(server: McpServer) {
  server.registerTool(
    "unlock-user",
    {
      description:
        "Clear the brute-force lockout for a user (by username), resetting their failed-login " +
        "counter so they can sign in again. Does not change their password.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        username: z.string().describe("Exact username of the user, e.g. jdoe")
      }
    },
    async ({ realm, username }) => {
      const kc = await getKc();
      const id = await findUserId(kc, realm, username);

      if (!id) {
        return {
          content: [{ type: "text", text: `User "${username}" not found in realm ${realm}` }],
          isError: true
        };
      }

      await kc.attackDetection.del({ realm, id });

      return {
        content: [{ type: "text", text: JSON.stringify({ username, unlocked: true }, null, 2) }]
      };
    }
  );
}
