import { getKc } from "@/keycloak.js";
import { fail, resolveResourceServer } from "@/tools/authz-lookup.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerDeleteAuthorizationPermission(server: McpServer) {
  server.registerTool(
    "delete-authorization-permission",
    {
      description:
        "Delete a permission (by name) from a resource server. The resources and policies it " +
        "linked are kept, but the access it granted is gone. Cannot be undone.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        clientId: z.string().describe("The resource server's clientId string, e.g. my-backend"),
        name: z.string().describe("Permission name to delete")
      }
    },
    async ({ realm, clientId, name }) => {
      const kc = await getKc();
      const resolved = await resolveResourceServer(kc, realm, clientId);

      if ("error" in resolved) return fail(resolved.error);

      const permissions = await kc.clients.findPermissions({ realm, id: resolved.id, name });
      const permission = permissions.find(p => p.name === name);

      if (!permission?.id || !permission.type) {
        return fail(`Authorization permission "${name}" not found on client "${clientId}"`);
      }

      await kc.clients.delPermission({
        realm,
        id: resolved.id,
        type: permission.type,
        permissionId: permission.id
      });

      return {
        content: [{ type: "text", text: JSON.stringify({ clientId, name, deleted: true }, null, 2) }]
      };
    }
  );
}
