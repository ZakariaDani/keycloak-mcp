import { getKc } from "@/keycloak.js";
import { fail, findAuthzScope, resolveResourceServer } from "@/tools/authz-lookup.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerCreateAuthorizationScope(server: McpServer) {
  server.registerTool(
    "create-authorization-scope",
    {
      description:
        "Create an authorization scope on a resource server: an action that can be allowed on " +
        "resources, e.g. view, edit, delete. Attach it to resources with " +
        "create-authorization-resource / update-authorization-resource, and grant it with " +
        "create-authorization-permission. Fails if the name already exists.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        clientId: z.string().describe("The resource server's clientId string, e.g. my-backend"),
        name: z.string().describe("Scope name, e.g. view"),
        displayName: z.string().optional().describe("Optional human-readable name")
      }
    },
    async ({ realm, clientId, name, displayName }) => {
      const kc = await getKc();
      const resolved = await resolveResourceServer(kc, realm, clientId);

      if ("error" in resolved) return fail(resolved.error);

      if (await findAuthzScope(kc, realm, resolved.id, name)) {
        return fail(`Authorization scope "${name}" already exists on client "${clientId}"`);
      }

      const created = await kc.clients.createAuthorizationScope({ realm, id: resolved.id }, { name, displayName });

      return {
        content: [{ type: "text", text: JSON.stringify({ clientId, id: created?.id ?? null, name, created: true }, null, 2) }]
      };
    }
  );
}
