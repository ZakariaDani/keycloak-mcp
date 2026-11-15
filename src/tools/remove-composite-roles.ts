import { getKc } from "@/keycloak.js";
import { describeRole, resolveRole, resolveRoles, roleRefSchema } from "@/tools/role-ref.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerRemoveCompositeRoles(server: McpServer) {
  server.registerTool(
    "remove-composite-roles",
    {
      description:
        "Remove child roles from a composite role (the children themselves are kept). Users " +
        "holding the parent lose the removed children unless they have them another way. The " +
        "parent is a realm role, or a client role when clientId is given. All roles must " +
        "exist, otherwise nothing is changed.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        roleName: z.string().describe("Parent role name, e.g. billing-admin"),
        clientId: z
          .string()
          .optional()
          .describe("clientId owning the parent role. Omit for a realm role"),
        children: z
          .array(roleRefSchema)
          .min(1)
          .describe("Roles to remove, e.g. [{\"roleName\": \"offline_access\"}]")
      }
    },
    async ({ realm, roleName, clientId, children }) => {
      const kc = await getKc();

      const parent = await resolveRole(kc, realm, { roleName, clientId });
      if ("error" in parent) {
        return { content: [{ type: "text", text: parent.error }], isError: true };
      }

      const resolved = await resolveRoles(kc, realm, children);
      if ("errors" in resolved) {
        return { content: [{ type: "text", text: resolved.errors.join("\n") }], isError: true };
      }

      await kc.roles.delCompositeRoles({ realm, id: parent.role.id }, resolved.roles);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              { parent: describeRole({ roleName, clientId }), removed: children.map(describeRole) },
              null,
              2
            )
          }
        ]
      };
    }
  );
}
