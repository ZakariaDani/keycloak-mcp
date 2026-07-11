import { getKc } from "@/keycloak.js";
import { findUserId } from "@/tools/lookup.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerListUserSessions(server: McpServer) {
  server.registerTool(
    "list-user-sessions",
    {
      description:
        "List the active sessions of a user (by username), including start/last-access " +
        "times, IP address and the clients used in each session.",
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

      const sessions = await kc.users.listSessions({ realm, id: userId });

      const slim = sessions.map(session => ({
        id: session.id,
        ipAddress: session.ipAddress ?? null,
        start: session.start ? new Date(session.start).toISOString() : null,
        lastAccess: session.lastAccess ? new Date(session.lastAccess).toISOString() : null,
        clients: session.clients ?? {}
      }));

      return {
        content: [{ type: "text", text: JSON.stringify({ username, sessions: slim }, null, 2) }]
      };
    }
  );
}
