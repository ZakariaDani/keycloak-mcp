import { getKc } from "@/keycloak.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerListRealmRoles(server: McpServer) {
  server.registerTool(
    "list-realm-roles",
    {
      description:
        "List realm-level roles of a Keycloak realm. Returns id, name, description, " +
        "and whether the role is composite. Supports search and pagination.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        search: z.string().optional().describe("Optional filter on role name"),
        first: z.number().int().min(0).default(0).describe("Pagination offset"),
        max: z.number().int().min(1).max(200).default(50).describe("Page size")
      }
    },
    async ({ realm, search, first, max }) => {
      const kc = await getKc();
      const roles = await kc.roles.find({ realm, search, first, max });

      const slim = roles.map(role => ({
        id: role.id,
        name: role.name,
        description: role.description ?? null,
        composite: role.composite ?? false,
        clientRole: role.clientRole ?? false
      }));

      return {
        content: [{ type: "text", text: JSON.stringify(slim, null, 2) }]
      };
    }
  );
}
