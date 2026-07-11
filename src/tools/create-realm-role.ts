import { getKc } from "@/keycloak.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerCreateRealmRole(server: McpServer) {
  server.registerTool(
    "create-realm-role",
    {
      description:
        "Create a realm-level role. Optionally set a description. Fails if a role with the " +
        "same name already exists.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        name: z.string().describe("Name of the new realm role, e.g. billing-admin"),
        description: z.string().optional().describe("Optional human-readable description")
      }
    },
    async ({ realm, name, description }) => {
      const kc = await getKc();

      await kc.roles.create({ realm, name, description });

      return {
        content: [{ type: "text", text: JSON.stringify({ realm, name, created: true }, null, 2) }]
      };
    }
  );
}
