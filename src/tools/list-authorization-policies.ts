import { getKc } from "@/keycloak.js";
import { fail, resolveResourceServer } from "@/tools/authz-lookup.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerListAuthorizationPolicies(server: McpServer) {
  server.registerTool(
    "list-authorization-policies",
    {
      description:
        "List the policies of a resource server: the rules that say WHO or WHEN (role, user, " +
        "group, client, time, regex, aggregate...). Returns name, type, logic and decision " +
        "strategy. Permissions (list-authorization-permissions) tie policies to resources. For " +
        "the members of a policy (which roles, users...) use export-authorization-settings.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        clientId: z.string().describe("The resource server's clientId string, e.g. my-backend"),
        name: z.string().optional().describe("Filter on policy name (partial match)"),
        type: z.string().optional().describe("Filter on policy type, e.g. role"),
        first: z.number().int().min(0).default(0).describe("Pagination offset"),
        max: z.number().int().min(1).max(200).default(50).describe("Page size")
      }
    },
    async ({ realm, clientId, name, type, first, max }) => {
      const kc = await getKc();
      const resolved = await resolveResourceServer(kc, realm, clientId);

      if ("error" in resolved) return fail(resolved.error);

      const result = await kc.clients.listPolicies({ realm, id: resolved.id, name, type, first, max });
      // The SDK types an empty result as "" rather than [].
      const policies = result === "" ? [] : result;

      const slim = policies.map(policy => ({
        id: policy.id,
        name: policy.name,
        type: policy.type,
        description: policy.description ?? null,
        logic: policy.logic ?? null,
        decisionStrategy: policy.decisionStrategy ?? null
      }));

      return {
        content: [{ type: "text", text: JSON.stringify(slim, null, 2) }]
      };
    }
  );
}
