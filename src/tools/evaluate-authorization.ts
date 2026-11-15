import { getKc } from "@/keycloak.js";
import { fail, findAuthzResource, resolveResourceServer } from "@/tools/authz-lookup.js";
import { findUserId } from "@/tools/lookup.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerEvaluateAuthorization(server: McpServer) {
  server.registerTool(
    "evaluate-authorization",
    {
      description:
        "Dry-run the authorization policies for a user: would `username` be permitted to access " +
        "a resource and/or scopes of this resource server, and which policies decided it? " +
        "Nothing is changed. Name a resource, scopes, or both; with neither, every resource is " +
        "evaluated. attributes sets extra context for time/attribute-based policies. Ideal for " +
        "debugging 'why can/can't this user access X'.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        clientId: z.string().describe("The resource server's clientId string, e.g. my-backend"),
        username: z.string().describe("Exact username to evaluate for, e.g. jdoe"),
        resource: z.string().optional().describe("Resource name to evaluate, e.g. invoices"),
        scopes: z.array(z.string()).optional().describe("Scope names to evaluate, e.g. [\"view\"]"),
        attributes: z
          .record(z.string(), z.string())
          .optional()
          .describe("Extra evaluation context attributes, e.g. {\"kc.client.network.ip_address\": \"10.0.0.1\"}")
      }
    },
    async ({ realm, clientId, username, resource, scopes, attributes }) => {
      const kc = await getKc();
      const resolved = await resolveResourceServer(kc, realm, clientId);

      if ("error" in resolved) return fail(resolved.error);

      const userId = await findUserId(kc, realm, username);
      if (!userId) return fail(`User "${username}" not found in realm ${realm}`);

      let target: { _id?: string; name?: string; scopes?: { name: string }[] } | undefined;

      if (resource) {
        const found = await findAuthzResource(kc, realm, resolved.id, resource);
        if (!found?._id) return fail(`Authorization resource "${resource}" not found on client "${clientId}"`);
        target = { _id: found._id, name: found.name };
      }

      if (scopes && scopes.length > 0) {
        target = { ...target, scopes: scopes.map(name => ({ name })) };
      }

      const response = await kc.clients.evaluateResource(
        { realm, id: resolved.id },
        {
          userId,
          clientId: resolved.id,
          entitlements: false,
          resources: target ? [target] : [],
          context: { attributes: attributes ?? {} }
        }
      );

      const names = (list: { name?: string }[] | undefined) => (list ?? []).map(item => item.name);

      const slim = {
        username,
        status: response.status ?? null,
        results: (response.results ?? []).map(result => ({
          resource: result.resource?.name ?? null,
          status: result.status ?? null,
          allowedScopes: names(result.allowedScopes),
          deniedScopes: names(result.deniedScopes),
          policies: (result.policies ?? []).map(entry => ({
            policy: entry.policy?.name ?? null,
            type: entry.policy?.type ?? null,
            status: entry.status ?? null
          }))
        }))
      };

      return {
        content: [{ type: "text", text: JSON.stringify(slim, null, 2) }]
      };
    }
  );
}
