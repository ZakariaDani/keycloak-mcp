import { getKc } from "@/keycloak.js";
import { fail, findAuthzScope, resolveResourceServer } from "@/tools/authz-lookup.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerDeleteAuthorizationScope(server: McpServer) {
  server.registerTool(
    "delete-authorization-scope",
    {
      description:
        "Delete an authorization scope (by name) from a resource server. It is removed from " +
        "every resource that had it and from scope permissions that referenced it, so access " +
        "rules built on it stop applying. Cannot be undone.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        clientId: z.string().describe("The resource server's clientId string, e.g. my-backend"),
        name: z.string().describe("Scope name to delete")
      }
    },
    async ({ realm, clientId, name }) => {
      const kc = await getKc();
      const resolved = await resolveResourceServer(kc, realm, clientId);

      if ("error" in resolved) return fail(resolved.error);

      const scope = await findAuthzScope(kc, realm, resolved.id, name);
      if (!scope?.id) return fail(`Authorization scope "${name}" not found on client "${clientId}"`);

      await kc.clients.delAuthorizationScope({ realm, id: resolved.id, scopeId: scope.id });

      return {
        content: [{ type: "text", text: JSON.stringify({ clientId, name, deleted: true }, null, 2) }]
      };
    }
  );
}
