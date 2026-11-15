import { getKc } from "@/keycloak.js";
import {
  fail,
  findAuthzPolicy,
  resolvePolicyIds,
  resolveResourceIds,
  resolveResourceServer,
  resolveScopeIds
} from "@/tools/authz-lookup.js";
import { DecisionStrategy } from "@keycloak/keycloak-admin-client/lib/defs/policyRepresentation.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerCreateAuthorizationPermission(server: McpServer) {
  server.registerTool(
    "create-authorization-permission",
    {
      description:
        "Create a permission that grants access: it ties resources (and/or scopes) to the " +
        "policies that must be satisfied. type=resource protects whole resources, naming " +
        "either resources or a resourceType (all resources of that type). type=scope protects " +
        "specific actions: scopes are required, and resources/resourceType optionally narrow " +
        "it. Everything is given by name and must exist already; policies must list at least " +
        "one. decisionStrategy says how several policies combine. Fails if the name exists.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        clientId: z.string().describe("The resource server's clientId string, e.g. my-backend"),
        name: z.string().describe("Unique permission name, e.g. finance-can-view-invoices"),
        type: z.enum(["resource", "scope"]).describe("Resource-based or scope-based permission"),
        description: z.string().optional().describe("Optional description"),
        resources: z.array(z.string()).optional().describe("Resource names, e.g. [\"invoices\"]"),
        resourceType: z
          .string()
          .optional()
          .describe("Apply to all resources of this type instead of naming resources"),
        scopes: z.array(z.string()).optional().describe("Authorization scope names (required for scope permissions)"),
        policies: z.array(z.string()).min(1).describe("Names of the policies to apply, e.g. [\"finance-staff-only\"]"),
        decisionStrategy: z
          .enum(DecisionStrategy)
          .default(DecisionStrategy.UNANIMOUS)
          .describe("UNANIMOUS (all policies), AFFIRMATIVE (any one) or CONSENSUS (majority)")
      }
    },
    async ({ realm, clientId, name, type, description, resources, resourceType, scopes, policies, decisionStrategy }) => {
      if (resources?.length && resourceType) {
        return fail("Give either resources or resourceType, not both");
      }
      if (type === "resource" && !resources?.length && !resourceType) {
        return fail("A resource permission needs resources or a resourceType");
      }
      if (type === "scope" && !scopes?.length) {
        return fail("A scope permission needs at least one scope");
      }

      const kc = await getKc();
      const resourceServer = await resolveResourceServer(kc, realm, clientId);

      if ("error" in resourceServer) return fail(resourceServer.error);

      if (await findAuthzPolicy(kc, realm, resourceServer.id, name)) {
        return fail(`"${name}" already exists on client "${clientId}" as a policy or permission`);
      }

      const [policyIds, resourceIds, scopeIds] = await Promise.all([
        resolvePolicyIds(kc, realm, resourceServer.id, policies),
        resolveResourceIds(kc, realm, resourceServer.id, resources ?? []),
        resolveScopeIds(kc, realm, resourceServer.id, scopes ?? [])
      ]);

      const errors = [policyIds, resourceIds, scopeIds].flatMap(result => ("errors" in result ? result.errors : []));
      if (errors.length > 0) return fail(errors.join("\n"));

      const created = await kc.clients.createPermission(
        { realm, id: resourceServer.id, type },
        {
          name,
          description,
          type,
          decisionStrategy,
          policies: "ids" in policyIds ? policyIds.ids : [],
          ...("ids" in resourceIds && resourceIds.ids.length > 0 ? { resources: resourceIds.ids } : {}),
          ...("ids" in scopeIds && scopeIds.ids.length > 0 ? { scopes: scopeIds.ids } : {}),
          ...(resourceType ? { resourceType } : {})
        }
      );

      return {
        content: [{ type: "text", text: JSON.stringify({ clientId, id: created.id ?? null, name, type, created: true }, null, 2) }]
      };
    }
  );
}
