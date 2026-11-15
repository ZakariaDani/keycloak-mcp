import type KeycloakAdminClient from "@keycloak/keycloak-admin-client";
import type PolicyRepresentation from "@keycloak/keycloak-admin-client/lib/defs/policyRepresentation.js";
import type ResourceRepresentation from "@keycloak/keycloak-admin-client/lib/defs/resourceRepresentation.js";
import type ScopeRepresentation from "@keycloak/keycloak-admin-client/lib/defs/scopeRepresentation.js";

// Re-exported so the authorization tools keep importing it from here.
export { fail } from "@/tools/result.js";

/**
 * Authorization services hang off a client (the "resource server"). Resolve it from its
 * clientId and check the feature is switched on, with a hint on how to enable it.
 */
export async function resolveResourceServer(
  kc: KeycloakAdminClient,
  realm: string,
  clientId: string
): Promise<{ id: string } | { error: string }> {
  const clients = await kc.clients.find({ realm, clientId });
  const client = clients.find(c => c.clientId === clientId);

  if (!client?.id) {
    return { error: `Client "${clientId}" not found in realm ${realm}` };
  }

  if (!client.authorizationServicesEnabled) {
    return {
      error:
        `Authorization services are not enabled on client "${clientId}". Enable them with ` +
        "update-client (authorizationServicesEnabled=true); the client must be confidential"
    };
  }

  return { id: client.id };
}

export async function findAuthzScope(
  kc: KeycloakAdminClient,
  realm: string,
  id: string,
  name: string
): Promise<ScopeRepresentation | null> {
  const scopes = await kc.clients.listAllScopes({ realm, id, name });
  return scopes.find(scope => scope.name === name) ?? null;
}

export async function findAuthzResource(
  kc: KeycloakAdminClient,
  realm: string,
  id: string,
  name: string
): Promise<ResourceRepresentation | null> {
  const resources = await kc.clients.listResources({ realm, id, name, deep: true });
  return resources.find(resource => resource.name === name) ?? null;
}

export async function findAuthzPolicy(
  kc: KeycloakAdminClient,
  realm: string,
  id: string,
  name: string
): Promise<PolicyRepresentation | null> {
  const policies = await kc.clients.listPolicies({ realm, id, name });
  // The SDK types an empty result as "" rather than [].
  return (policies === "" ? [] : policies).find(policy => policy.name === name) ?? null;
}

type Resolved = { ids: string[] } | { errors: string[] };

async function resolveNames(
  kind: string,
  names: readonly string[],
  lookup: (name: string) => Promise<string | null | undefined>
): Promise<Resolved> {
  const found = await Promise.all(names.map(async name => ({ name, id: await lookup(name) })));

  const errors = found.filter(entry => !entry.id).map(entry => `${kind} "${entry.name}" not found`);
  if (errors.length > 0) return { errors };

  return { ids: found.flatMap(entry => (entry.id ? [entry.id] : [])) };
}

/** Resolve scope names to ids. All must exist, otherwise nothing is returned but errors. */
export const resolveScopeIds = (kc: KeycloakAdminClient, realm: string, id: string, names: readonly string[]) =>
  resolveNames("Authorization scope", names, async name => (await findAuthzScope(kc, realm, id, name))?.id);

export const resolveResourceIds = (kc: KeycloakAdminClient, realm: string, id: string, names: readonly string[]) =>
  resolveNames("Authorization resource", names, async name => (await findAuthzResource(kc, realm, id, name))?._id);

export const resolvePolicyIds = (kc: KeycloakAdminClient, realm: string, id: string, names: readonly string[]) =>
  resolveNames("Authorization policy", names, async name => (await findAuthzPolicy(kc, realm, id, name))?.id);
