import { findClientUuid } from "@/tools/lookup.js";
import type KeycloakAdminClient from "@keycloak/keycloak-admin-client";
import type RoleRepresentation from "@keycloak/keycloak-admin-client/lib/defs/roleRepresentation.js";
import { z } from "zod";

/** A role addressed by name: a realm role, or a client role when clientId is given. */
export const roleRefSchema = z.object({
  roleName: z.string().describe("Role name, e.g. billing-admin"),
  clientId: z
    .string()
    .optional()
    .describe("clientId owning the role. Omit for a realm role")
});

export type RoleRef = z.infer<typeof roleRefSchema>;

export function describeRole({ roleName, clientId }: RoleRef): string {
  return clientId ? `${clientId}/${roleName}` : roleName;
}

/**
 * Resolve a realm or client role to its representation (the id is needed for composite
 * operations). Returns an error message instead of throwing so tools can report it.
 */
export async function resolveRole(
  kc: KeycloakAdminClient,
  realm: string,
  { roleName, clientId }: RoleRef
): Promise<{ role: RoleRepresentation & { id: string; name: string } } | { error: string }> {
  let found: RoleRepresentation | null | undefined;

  if (clientId) {
    const clientUuid = await findClientUuid(kc, realm, clientId);
    if (!clientUuid) return { error: `Client "${clientId}" not found in realm ${realm}` };
    found = await kc.clients.findRole({ realm, id: clientUuid, roleName });
  } else {
    found = await kc.roles.findOneByName({ realm, name: roleName });
  }

  if (!found?.id || !found.name) {
    const where = clientId ? `client "${clientId}"` : `realm ${realm}`;
    return { error: `Role "${roleName}" not found on ${where}` };
  }

  return { role: { ...found, id: found.id, name: found.name } };
}

/**
 * Resolve several roles at once. If any fail, returns all the errors so nothing is
 * written on a partial match.
 */
export async function resolveRoles(
  kc: KeycloakAdminClient,
  realm: string,
  refs: readonly RoleRef[]
): Promise<{ roles: Array<RoleRepresentation & { id: string; name: string }> } | { errors: string[] }> {
  const results = await Promise.all(refs.map(ref => resolveRole(kc, realm, ref)));

  const errors = results.flatMap(result => ("error" in result ? [result.error] : []));
  if (errors.length > 0) return { errors };

  return { roles: results.flatMap(result => ("role" in result ? [result.role] : [])) };
}
