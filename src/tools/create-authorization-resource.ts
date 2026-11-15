import { getKc } from "@/keycloak.js";
import { fail, findAuthzResource, resolveResourceServer, resolveScopeIds } from "@/tools/authz-lookup.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerCreateAuthorizationResource(server: McpServer) {
  server.registerTool(
    "create-authorization-resource",
    {
      description:
        "Create a protected resource on a resource server, e.g. an API path or a type of " +
        "document. scopes lists the actions that can be allowed on it by name; they must " +
        "already exist (see create-authorization-scope). A resource does nothing on its own: " +
        "grant access with create-authorization-permission. Fails if the name already exists.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        clientId: z.string().describe("The resource server's clientId string, e.g. my-backend"),
        name: z.string().describe("Unique resource name, e.g. invoices"),
        displayName: z.string().optional().describe("Optional human-readable name"),
        type: z
          .string()
          .optional()
          .describe("Resource type, used to group resources, e.g. urn:my-backend:resources:invoice"),
        uris: z.array(z.string()).optional().describe("URIs the resource covers, e.g. [\"/api/invoices/*\"]"),
        scopes: z.array(z.string()).optional().describe("Names of existing authorization scopes, e.g. [\"view\", \"edit\"]"),
        ownerManagedAccess: z
          .boolean()
          .default(false)
          .describe("Let the owner manage access to the resource (user-managed access)")
      }
    },
    async ({ realm, clientId, name, displayName, type, uris, scopes, ownerManagedAccess }) => {
      const kc = await getKc();
      const resolved = await resolveResourceServer(kc, realm, clientId);

      if ("error" in resolved) return fail(resolved.error);

      if (await findAuthzResource(kc, realm, resolved.id, name)) {
        return fail(`Authorization resource "${name}" already exists on client "${clientId}"`);
      }

      const scopeRefs: { id: string; name: string }[] = [];

      if (scopes && scopes.length > 0) {
        const ids = await resolveScopeIds(kc, realm, resolved.id, scopes);
        if ("errors" in ids) return fail(ids.errors.join("\n"));
        scopes.forEach((scopeName, index) => scopeRefs.push({ id: ids.ids[index] ?? "", name: scopeName }));
      }

      const created = await kc.clients.createResource(
        { realm, id: resolved.id },
        { name, displayName, type, uris, ownerManagedAccess, scopes: scopeRefs }
      );

      return {
        content: [{ type: "text", text: JSON.stringify({ clientId, id: created._id ?? null, name, created: true }, null, 2) }]
      };
    }
  );
}
