import { getKc } from "@/keycloak.js";
import { resolveRole } from "@/tools/role-ref.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerListCompositeRoles(server: McpServer) {
  server.registerTool(
    "list-composite-roles",
    {
      description:
        "List the child roles bundled inside a composite role. The parent is a realm role, or a " +
        "client role when clientId is given. Each child shows whether it is a realm role " +
        "(clientId null) or a client role (with its clientId). Returns an empty list when the " +
        "role is not composite.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        roleName: z.string().describe("Parent role name, e.g. billing-admin"),
        clientId: z
          .string()
          .optional()
          .describe("clientId owning the parent role. Omit for a realm role")
      }
    },
    async ({ realm, roleName, clientId }) => {
      const kc = await getKc();
      const resolved = await resolveRole(kc, realm, { roleName, clientId });

      if ("error" in resolved) {
        return { content: [{ type: "text", text: resolved.error }], isError: true };
      }

      const children = await kc.roles.getCompositeRoles({ realm, id: resolved.role.id });

      // Client roles carry the client's internal uuid; translate to the readable clientId.
      const uuids = [...new Set(children.filter(c => c.clientRole).map(c => c.containerId))];
      const clients = await Promise.all(
        uuids.flatMap(id => (id ? [kc.clients.findOne({ realm, id })] : []))
      );
      const clientIdByUuid = new Map(clients.map(client => [client?.id, client?.clientId]));

      const slim = children.map(child => ({
        name: child.name,
        description: child.description ?? null,
        clientId: child.clientRole ? (clientIdByUuid.get(child.containerId) ?? null) : null,
        composite: child.composite ?? false
      }));

      return {
        content: [{ type: "text", text: JSON.stringify(slim, null, 2) }]
      };
    }
  );
}
