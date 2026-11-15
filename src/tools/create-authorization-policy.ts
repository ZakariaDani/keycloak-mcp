import { getKc } from "@/keycloak.js";
import { fail, findAuthzPolicy, resolvePolicyIds, resolveResourceServer } from "@/tools/authz-lookup.js";
import { findClientUuid, findGroup, findUserId } from "@/tools/lookup.js";
import { resolveRoles, roleRefSchema } from "@/tools/role-ref.js";
import type KeycloakAdminClient from "@keycloak/keycloak-admin-client";
import type PolicyRepresentation from "@keycloak/keycloak-admin-client/lib/defs/policyRepresentation.js";
import { DecisionStrategy, Logic } from "@keycloak/keycloak-admin-client/lib/defs/policyRepresentation.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";

const POLICY_TYPES = ["role", "user", "group", "client", "aggregate", "time", "regex"] as const;

const roleMemberSchema = roleRefSchema.extend({
  required: z.boolean().optional().describe("Role is mandatory for the policy to grant access")
});

type PolicyInput = {
  type: (typeof POLICY_TYPES)[number];
  roles?: z.infer<typeof roleMemberSchema>[];
  users?: string[];
  groups?: string[];
  extendChildren: boolean;
  clients?: string[];
  policies?: string[];
  settings?: Record<string, string | number | boolean>;
};

/** Translate the human-readable members of a policy (names) to the ids/fields Keycloak wants. */
async function buildMembers(
  kc: KeycloakAdminClient,
  realm: string,
  serverId: string,
  input: PolicyInput
): Promise<{ fields: Record<string, unknown> } | { errors: string[] }> {
  const missing = (what: string) => ({ errors: [`A ${input.type} policy needs ${what}`] });

  switch (input.type) {
    case "role": {
      if (!input.roles?.length) return missing("roles");
      const resolved = await resolveRoles(kc, realm, input.roles);
      if ("errors" in resolved) return resolved;
      return {
        fields: { roles: resolved.roles.map((role, i) => ({ id: role.id, required: input.roles?.[i]?.required ?? false })) }
      };
    }
    case "user": {
      if (!input.users?.length) return missing("users");
      const ids = await Promise.all(input.users.map(username => findUserId(kc, realm, username)));
      const errors = input.users.flatMap((username, i) => (ids[i] ? [] : [`User "${username}" not found in realm ${realm}`]));
      return errors.length > 0 ? { errors } : { fields: { users: ids } };
    }
    case "group": {
      if (!input.groups?.length) return missing("groups (paths or names)");
      const groups = await Promise.all(input.groups.map(group => findGroup(kc, realm, group)));
      const errors = input.groups.flatMap((group, i) => (groups[i]?.id ? [] : [`Group "${group}" not found in realm ${realm}`]));
      return errors.length > 0
        ? { errors }
        : { fields: { groups: groups.map(group => ({ id: group?.id, extendChildren: input.extendChildren })) } };
    }
    case "client": {
      if (!input.clients?.length) return missing("clients (clientIds)");
      const ids = await Promise.all(input.clients.map(clientId => findClientUuid(kc, realm, clientId)));
      const errors = input.clients.flatMap((clientId, i) => (ids[i] ? [] : [`Client "${clientId}" not found in realm ${realm}`]));
      return errors.length > 0 ? { errors } : { fields: { clients: ids } };
    }
    case "aggregate": {
      if (!input.policies?.length) return missing("policies (names of existing policies)");
      const resolved = await resolvePolicyIds(kc, realm, serverId, input.policies);
      return "errors" in resolved ? resolved : { fields: { policies: resolved.ids } };
    }
    case "time":
    case "regex":
      if (!input.settings || Object.keys(input.settings).length === 0) return missing("settings");
      return { fields: { ...input.settings } };
  }
}

export function registerCreateAuthorizationPolicy(server: McpServer) {
  server.registerTool(
    "create-authorization-policy",
    {
      description:
        "Create a policy on a resource server: a rule saying WHO or WHEN access is allowed. " +
        "Members are given by name: role -> roles ([{roleName, clientId?, required?}], realm role " +
        "when clientId is omitted); user -> users (usernames); group -> groups (paths/names, " +
        "extendChildren to include subgroups); client -> clients (clientIds); aggregate -> " +
        "policies (names of existing policies to combine); time -> settings such as " +
        "{\"notBefore\": \"2026-01-01 00:00:00\", \"notOnOrAfter\": \"2026-12-31 23:59:59\"} or " +
        "{\"hour\": 9, \"hourEnd\": 17}; regex -> settings {\"targetClaim\": \"email\", \"pattern\": \".*@example\\\\.com\"}. " +
        "logic NEGATIVE inverts the result. A policy grants nothing until a permission uses it " +
        "(create-authorization-permission). Fails if the name already exists.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        clientId: z.string().describe("The resource server's clientId string, e.g. my-backend"),
        name: z.string().describe("Unique policy name, e.g. finance-staff-only"),
        type: z.enum(POLICY_TYPES).describe("Policy type"),
        description: z.string().optional().describe("Optional description"),
        logic: z.enum(Logic).default(Logic.POSITIVE).describe("POSITIVE (default) or NEGATIVE to invert"),
        decisionStrategy: z
          .enum(DecisionStrategy)
          .default(DecisionStrategy.UNANIMOUS)
          .describe("How multiple members combine: UNANIMOUS (all), AFFIRMATIVE (any one) or CONSENSUS (majority)"),
        roles: z.array(roleMemberSchema).optional().describe("Members of a role policy"),
        users: z.array(z.string()).optional().describe("Usernames of a user policy"),
        groups: z.array(z.string()).optional().describe("Group paths or names of a group policy"),
        extendChildren: z.boolean().default(false).describe("Group policy: also include subgroups"),
        clients: z.array(z.string()).optional().describe("clientIds of a client policy"),
        policies: z.array(z.string()).optional().describe("Names of existing policies to combine (aggregate)"),
        settings: z
          .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
          .optional()
          .describe("Type-specific settings for time and regex policies")
      }
    },
    async ({ realm, clientId, name, type, description, logic, decisionStrategy, ...members }) => {
      const kc = await getKc();
      const resolved = await resolveResourceServer(kc, realm, clientId);

      if ("error" in resolved) return fail(resolved.error);

      if (await findAuthzPolicy(kc, realm, resolved.id, name)) {
        return fail(`Authorization policy "${name}" already exists on client "${clientId}"`);
      }

      const built = await buildMembers(kc, realm, resolved.id, { type, ...members });
      if ("errors" in built) return fail(built.errors.join("\n"));

      // Members first so a settings key can never override name/type.
      const payload: PolicyRepresentation & Record<string, unknown> = {
        ...built.fields,
        name,
        description,
        type,
        logic,
        decisionStrategy
      };

      const created = await kc.clients.createPolicy({ realm, id: resolved.id, type }, payload);

      return {
        content: [{ type: "text", text: JSON.stringify({ clientId, id: created.id ?? null, name, type, created: true }, null, 2) }]
      };
    }
  );
}
