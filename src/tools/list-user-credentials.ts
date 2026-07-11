import { getKc } from "@/keycloak.js";
import { findUserId } from "@/tools/lookup.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerListUserCredentials(server: McpServer) {
  server.registerTool(
    "list-user-credentials",
    {
      description:
        "List a user's stored credentials (by username): id, type (e.g. password, otp), " +
        "label and creation date. Secret values are never returned.",
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

      const credentials = await kc.users.getCredentials({ realm, id: userId });

      const slim = credentials.map(credential => ({
        id: credential.id,
        type: credential.type ?? null,
        userLabel: credential.userLabel ?? null,
        createdDate: credential.createdDate
          ? new Date(credential.createdDate).toISOString()
          : null
      }));

      return {
        content: [{ type: "text", text: JSON.stringify({ username, credentials: slim }, null, 2) }]
      };
    }
  );
}
