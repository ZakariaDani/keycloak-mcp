import { getKc } from "@/keycloak.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerUpdateRealmRole(server: McpServer) {
  server.registerTool(
    "update-realm-role",
    {
      description:
        "Rename a realm role and/or change its description. Only supplied fields change. " +
        "Requires at least one of newName or description.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        name: z.string().describe("Current name of the realm role"),
        newName: z.string().optional().describe("New name for the role"),
        description: z.string().optional().describe("New description")
      }
    },
    async ({ realm, name, newName, description }) => {
      if (newName === undefined && description === undefined) {
        return {
          content: [{ type: "text", text: "No fields to update: supply newName or description" }],
          isError: true
        };
      }

      const kc = await getKc();
      const role = await kc.roles.findOneByName({ realm, name });

      if (!role) {
        return {
          content: [{ type: "text", text: `Realm role "${name}" not found in realm ${realm}` }],
          isError: true
        };
      }

      // PUT replaces the representation, so start from the existing role.
      const updated = {
        ...role,
        ...(newName !== undefined ? { name: newName } : {}),
        ...(description !== undefined ? { description } : {})
      };

      await kc.roles.updateByName({ realm, name }, updated);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ name: updated.name, description: updated.description ?? null }, null, 2)
          }
        ]
      };
    }
  );
}
