import { getKc } from "@/keycloak.js";
import { findUserId } from "@/tools/lookup.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerSendUserActionsEmail(server: McpServer) {
  server.registerTool(
    "send-user-actions-email",
    {
      description:
        "Send a user (by username) an email prompting them to perform required actions, e.g. " +
        "VERIFY_EMAIL or UPDATE_PASSWORD. Requires SMTP to be configured on the realm.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        username: z.string().describe("Exact username of the user, e.g. jdoe"),
        actions: z
          .array(z.string())
          .min(1)
          .describe('Required actions, e.g. ["VERIFY_EMAIL", "UPDATE_PASSWORD"]'),
        lifespan: z
          .number()
          .int()
          .min(1)
          .optional()
          .describe("Link validity in seconds (default is the realm setting)")
      }
    },
    async ({ realm, username, actions, lifespan }) => {
      const kc = await getKc();
      const userId = await findUserId(kc, realm, username);

      if (!userId) {
        return {
          content: [{ type: "text", text: `User "${username}" not found in realm ${realm}` }],
          isError: true
        };
      }

      await kc.users.executeActionsEmail({ realm, id: userId, actions, lifespan });

      return {
        content: [{ type: "text", text: JSON.stringify({ username, actions, sent: true }, null, 2) }]
      };
    }
  );
}
