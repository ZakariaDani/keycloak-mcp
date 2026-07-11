import { getKc } from "@/keycloak.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerListUsers(server: McpServer) {
  server.registerTool(
    "list-users",
    {
      description:
        "List users of a Keycloak realm. Returns id, username, email, enabled status " +
        "and federation link. Supports pagination via first/max.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        search: z.string().optional().describe("Optional filter on username/email/name"),
        first: z.number().int().min(0).default(0).describe("Pagination offset"),
        max: z.number().int().min(1).max(200).default(50).describe("Page size")
      }
    },
    async ({ realm, search, first, max }) => {
      const kc = await getKc();
      const users = await kc.users.find({ realm, search, first, max });

      const slim = users.map(user => ({
        id: user.id,
        username: user.username,
        email: user.email,
        enabled: user.enabled,
        federationLink: user.federationLink ?? null,
        createdAt: user.createdTimestamp ? new Date(user.createdTimestamp).toISOString() : null
      }));

      return {
        content: [{ type: "text", text: JSON.stringify(slim, null, 2) }]
      };
    }
  );
}