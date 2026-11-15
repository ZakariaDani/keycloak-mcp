import { getKc } from "@/keycloak.js";
import { fail, resolveResourceServer } from "@/tools/authz-lookup.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerListAuthorizationScopes(server: McpServer) {
  server.registerTool(
    "list-authorization-scopes",
    {
      description:
        "List the authorization scopes of a resource server (the actions that can be allowed on " +
        "a resource, e.g. view, edit, delete). These are not OAuth client scopes. Optional name " +
        "filter, paginated.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        clientId: z.string().describe("The resource server's clientId string, e.g. my-backend"),
        name: z.string().optional().describe("Filter on scope name (partial match)"),
        first: z.number().int().min(0).default(0).describe("Pagination offset"),
        max: z.number().int().min(1).max(200).default(50).describe("Page size")
      }
    },
    async ({ realm, clientId, name, first, max }) => {
      const kc = await getKc();
      const resolved = await resolveResourceServer(kc, realm, clientId);

      if ("error" in resolved) return fail(resolved.error);

      const scopes = await kc.clients.listAllScopes({ realm, id: resolved.id, name, first, max });

      const slim = scopes.map(scope => ({
        id: scope.id,
        name: scope.name,
        displayName: scope.displayName ?? null
      }));

      return {
        content: [{ type: "text", text: JSON.stringify(slim, null, 2) }]
      };
    }
  );
}
