import { getKc } from "@/keycloak.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerSearchUsersByAttribute(server: McpServer) {
  server.registerTool(
    "search-users-by-attribute",
    {
      description:
        "Find users by a custom attribute key/value pair (exact match on the attribute). " +
        "Returns id, username, email and enabled status. Supports pagination.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        attribute: z.string().describe("Attribute key, e.g. department"),
        value: z.string().describe("Attribute value to match, e.g. finance"),
        first: z.number().int().min(0).default(0).describe("Pagination offset"),
        max: z.number().int().min(1).max(200).default(50).describe("Page size")
      }
    },
    async ({ realm, attribute, value, first, max }) => {
      const kc = await getKc();
      const users = await kc.users.find({ realm, q: `${attribute}:${value}`, first, max });

      const slim = users.map(user => ({
        id: user.id,
        username: user.username,
        email: user.email ?? null,
        enabled: user.enabled ?? false
      }));

      return {
        content: [{ type: "text", text: JSON.stringify(slim, null, 2) }]
      };
    }
  );
}
