import { getKc } from "@/keycloak.js";
import { fail, resolveResourceServer } from "@/tools/authz-lookup.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerListAuthorizationResources(server: McpServer) {
  server.registerTool(
    "list-authorization-resources",
    {
      description:
        "List the protected resources of a resource server (e.g. an API path or a document type): " +
        "name, type, URIs and the authorization scopes attached to each. Filter by name, type, " +
        "URI or owner; paginated.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        clientId: z.string().describe("The resource server's clientId string, e.g. my-backend"),
        name: z.string().optional().describe("Filter on resource name (partial match)"),
        type: z.string().optional().describe("Filter on resource type, e.g. urn:my-backend:resources:invoice"),
        uri: z.string().optional().describe("Filter on a URI the resource covers"),
        owner: z.string().optional().describe("Filter on owner id or name"),
        first: z.number().int().min(0).default(0).describe("Pagination offset"),
        max: z.number().int().min(1).max(200).default(50).describe("Page size")
      }
    },
    async ({ realm, clientId, name, type, uri, owner, first, max }) => {
      const kc = await getKc();
      const resolved = await resolveResourceServer(kc, realm, clientId);

      if ("error" in resolved) return fail(resolved.error);

      const resources = await kc.clients.listResources({
        realm,
        id: resolved.id,
        name,
        type,
        uri,
        owner,
        first,
        max,
        deep: true
      });

      const slim = resources.map(resource => ({
        id: resource._id,
        name: resource.name,
        displayName: resource.displayName ?? null,
        type: resource.type ?? null,
        uris: resource.uris ?? [],
        scopes: (resource.scopes ?? []).map(scope => scope.name),
        ownerManagedAccess: resource.ownerManagedAccess ?? false,
        owner: resource.owner?.name ?? resource.owner?.id ?? null
      }));

      return {
        content: [{ type: "text", text: JSON.stringify(slim, null, 2) }]
      };
    }
  );
}
