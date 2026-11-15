import { getKc } from "@/keycloak.js";
import { fail, findAuthzResource, resolveResourceServer } from "@/tools/authz-lookup.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerListAuthorizationPermissions(server: McpServer) {
  server.registerTool(
    "list-authorization-permissions",
    {
      description:
        "List the permissions of a resource server: the rules tying resources (or scopes) to " +
        "the policies that must be satisfied to access them. Returns name, type (resource or " +
        "scope) and decision strategy. With details=true also returns, per permission, the " +
        "resources, scopes and policies it links (one extra round of calls per permission, so " +
        "use filters on large servers).",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        clientId: z.string().describe("The resource server's clientId string, e.g. my-backend"),
        name: z.string().optional().describe("Filter on permission name (partial match)"),
        resource: z.string().optional().describe("Only permissions covering this resource name"),
        details: z.boolean().default(false).describe("Include linked resources, scopes and policies"),
        first: z.number().int().min(0).default(0).describe("Pagination offset"),
        max: z.number().int().min(1).max(200).default(50).describe("Page size")
      }
    },
    async ({ realm, clientId, name, resource, details, first, max }) => {
      const kc = await getKc();
      const resolved = await resolveResourceServer(kc, realm, clientId);

      if ("error" in resolved) return fail(resolved.error);

      let resourceId: string | undefined;

      if (resource) {
        const found = await findAuthzResource(kc, realm, resolved.id, resource);
        if (!found?._id) return fail(`Authorization resource "${resource}" not found on client "${clientId}"`);
        resourceId = found._id;
      }

      const permissions = await kc.clients.findPermissions({
        realm,
        id: resolved.id,
        name,
        resource: resourceId,
        first,
        max
      });

      const names = (list: { name?: string }[]) => list.map(item => item.name);

      const slim = await Promise.all(
        permissions.map(async permission => {
          const base = {
            id: permission.id,
            name: permission.name,
            type: permission.type,
            description: permission.description ?? null,
            decisionStrategy: permission.decisionStrategy ?? null
          };

          if (!details || !permission.id) return base;

          const args = { realm, id: resolved.id, permissionId: permission.id };
          const [resources, scopes, policies] = await Promise.all([
            kc.clients.getAssociatedResources(args),
            kc.clients.getAssociatedScopes(args),
            kc.clients.getAssociatedPolicies(args)
          ]);

          return { ...base, resources: names(resources), scopes: names(scopes), policies: names(policies) };
        })
      );

      return {
        content: [{ type: "text", text: JSON.stringify(slim, null, 2) }]
      };
    }
  );
}
