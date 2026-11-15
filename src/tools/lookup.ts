import type KeycloakAdminClient from "@keycloak/keycloak-admin-client";
import type ClientScopeRepresentation from "@keycloak/keycloak-admin-client/lib/defs/clientScopeRepresentation.js";
import type GroupRepresentation from "@keycloak/keycloak-admin-client/lib/defs/groupRepresentation.js";
import type IdentityProviderMapperRepresentation from "@keycloak/keycloak-admin-client/lib/defs/identityProviderMapperRepresentation.js";

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
 * Resolve a client scope by exact name. Returns null when the realm has no such scope.
 */
export async function findClientScope(
  kc: KeycloakAdminClient,
  realm: string,
  name: string
): Promise<ClientScopeRepresentation | null> {
  const scopes = await kc.clientScopes.find({ realm });
  return scopes.find(scope => scope.name === name) ?? null;
}

/**
 * Resolve an identity provider mapper by name. Returns null when the provider has
 * no mapper with that name.
 */
export async function findIdpMapper(
  kc: KeycloakAdminClient,
  realm: string,
  alias: string,
  name: string
): Promise<IdentityProviderMapperRepresentation | null> {
  const mappers = await kc.identityProviders.findMappers({ realm, alias });
  return mappers.find(mapper => mapper.name === name) ?? null;
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
