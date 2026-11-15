import { getKc } from "@/keycloak.js";
import { describeRole, resolveRole, resolveRoles, roleRefSchema } from "@/tools/role-ref.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerAddCompositeRoles(server: McpServer) {
  server.registerTool(
    "add-composite-roles",
    {
      description:
        "Make a role composite by adding child roles to it: anyone holding the parent also gets " +
        "every child. The parent is a realm role, or a client role when clientId is given. " +
        "Children can be realm roles and/or client roles (give clientId per child). All roles " +
        "must exist, otherwise nothing is changed. Idempotent for children already present.",
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
          .describe("Roles to add, e.g. [{\"roleName\": \"offline_access\"}, {\"roleName\": \"view-users\", \"clientId\": \"realm-management\"}]")
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

      await kc.roles.createComposite({ realm, roleId: parent.role.id }, resolved.roles);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              { parent: describeRole({ roleName, clientId }), added: children.map(describeRole) },
              null,
              2
            )
          }
        ]
      };
    }
  );
}
