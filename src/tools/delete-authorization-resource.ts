import { getKc } from "@/keycloak.js";
import { fail, findAuthzResource, resolveResourceServer } from "@/tools/authz-lookup.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerDeleteAuthorizationResource(server: McpServer) {
  server.registerTool(
    "delete-authorization-resource",
    {
      description:
        "Delete a protected resource (by name) from a resource server. Permissions that only " +
        "covered this resource are left without a target. Cannot be undone.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        clientId: z.string().describe("The resource server's clientId string, e.g. my-backend"),
        name: z.string().describe("Resource name to delete")
      }
    },
    async ({ realm, clientId, name }) => {
      const kc = await getKc();
      const resolved = await resolveResourceServer(kc, realm, clientId);

      if ("error" in resolved) return fail(resolved.error);

      const resource = await findAuthzResource(kc, realm, resolved.id, name);
      if (!resource?._id) return fail(`Authorization resource "${name}" not found on client "${clientId}"`);

      await kc.clients.delResource({ realm, id: resolved.id, resourceId: resource._id });

      return {
        content: [{ type: "text", text: JSON.stringify({ clientId, name, deleted: true }, null, 2) }]
      };
    }
  );
}
