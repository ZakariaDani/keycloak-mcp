import { getKc } from "@/keycloak.js";
import { fail, findAuthzResource, resolveResourceServer, resolveScopeIds } from "@/tools/authz-lookup.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerUpdateAuthorizationResource(server: McpServer) {
  server.registerTool(
    "update-authorization-resource",
    {
      description:
        "Update a protected resource (by name). Only supplied fields change, but uris and " +
        "scopes REPLACE the existing lists (send the full list you want). scopes are names of " +
        "existing authorization scopes. The resource's name cannot be changed. Requires at " +
        "least one field.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        clientId: z.string().describe("The resource server's clientId string, e.g. my-backend"),
        name: z.string().describe("Name of the existing resource"),
        displayName: z.string().optional().describe("New display name"),
        type: z.string().optional().describe("New resource type"),
        uris: z.array(z.string()).optional().describe("Replacement list of URIs"),
        scopes: z.array(z.string()).optional().describe("Replacement list of authorization scope names"),
        ownerManagedAccess: z.boolean().optional().describe("Enable or disable user-managed access")
      }
    },
    async ({ realm, clientId, name, displayName, type, uris, scopes, ownerManagedAccess }) => {
      if (
        displayName === undefined &&
        type === undefined &&
        uris === undefined &&
        scopes === undefined &&
        ownerManagedAccess === undefined
      ) {
        return fail("No fields to update: supply at least one field");
      }

      const kc = await getKc();
      const resolved = await resolveResourceServer(kc, realm, clientId);

      if ("error" in resolved) return fail(resolved.error);

      const existing = await findAuthzResource(kc, realm, resolved.id, name);
      if (!existing?._id) return fail(`Authorization resource "${name}" not found on client "${clientId}"`);

      let scopeRefs = existing.scopes;

      if (scopes) {
        const ids = await resolveScopeIds(kc, realm, resolved.id, scopes);
        if ("errors" in ids) return fail(ids.errors.join("\n"));
        scopeRefs = scopes.map((scopeName, index) => ({ id: ids.ids[index], name: scopeName }));
      }

      // PUT replaces the representation, so start from the existing resource.
      const updated = {
        ...existing,
        ...(displayName !== undefined ? { displayName } : {}),
        ...(type !== undefined ? { type } : {}),
        ...(uris !== undefined ? { uris } : {}),
        ...(ownerManagedAccess !== undefined ? { ownerManagedAccess } : {}),
        scopes: scopeRefs
      };

      await kc.clients.updateResource({ realm, id: resolved.id, resourceId: existing._id }, updated);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                clientId,
                name,
                displayName: updated.displayName ?? null,
                type: updated.type ?? null,
                uris: updated.uris ?? [],
                scopes: (updated.scopes ?? []).map(scope => scope.name)
              },
              null,
              2
            )
          }
        ]
      };
    }
  );
}
