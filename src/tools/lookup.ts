import type KeycloakAdminClient from "@keycloak/keycloak-admin-client";
import type GroupRepresentation from "@keycloak/keycloak-admin-client/lib/defs/groupRepresentation.js";

/**
 * Resolve a user's internal id from an exact username.
 * Returns null when no such user exists in the realm.
 */
export async function findUserId(
  kc: KeycloakAdminClient,
  realm: string,
  username: string
): Promise<string | null> {
  const matches = await kc.users.find({ realm, username, exact: true });
  return matches[0]?.id ?? null;
}

/**
 * Resolve a client's internal id (uuid) from its clientId string.
 * Returns null when no such client exists in the realm.
 */
export async function findClientUuid(
  kc: KeycloakAdminClient,
  realm: string,
  clientId: string
): Promise<string | null> {
  const clients = await kc.clients.find({ realm, clientId });
  return clients[0]?.id ?? null;
}

/**
 * Resolve a group by its full path (e.g. /parent/child) or, failing that, by
 * name, searching the whole group tree. Returns null when not found.
 */
export async function findGroup(
  kc: KeycloakAdminClient,
  realm: string,
  pathOrName: string
): Promise<GroupRepresentation | null> {
  const groups = await kc.groups.find({ realm, search: pathOrName });

  const target = pathOrName.startsWith("/") ? pathOrName : `/${pathOrName}`;

  const walk = (nodes: GroupRepresentation[]): GroupRepresentation | null => {
    for (const node of nodes) {
      if (node.path === target || node.name === pathOrName) return node;
      const found = walk(node.subGroups ?? []);
      if (found) return found;
    }
    return null;
  };

  return walk(groups);
}
