import type KeycloakAdminClient from "@keycloak/keycloak-admin-client";
import type OrganizationRepresentation from "@keycloak/keycloak-admin-client/lib/defs/organizationRepresentation.js";

/**
 * Resolve an organization by exact name or alias. Returns null when the realm has none.
 * Name search is done server-side; an alias that differs from the name falls back to
 * scanning the organizations of the realm.
 */
export async function findOrganization(
  kc: KeycloakAdminClient,
  realm: string,
  ref: string
): Promise<(OrganizationRepresentation & { id: string }) | null> {
  const matches = (org: OrganizationRepresentation) => org.name === ref || org.alias === ref;

  const byName = await kc.organizations.find({ realm, search: ref, exact: true });
  const found = byName.find(matches) ?? (await kc.organizations.find({ realm, first: 0, max: 500 })).find(matches);

  return found?.id ? { ...found, id: found.id } : null;
}

/**
 * Explain why the organizations feature cannot be used in a realm, or return null when it
 * is on. Saves the caller a cryptic server error.
 */
export async function organizationsUnavailable(kc: KeycloakAdminClient, realm: string): Promise<string | null> {
  const found = await kc.realms.findOne({ realm });

  if (!found) return `Realm "${realm}" not found`;

  return found.organizationsEnabled
    ? null
    : `Organizations are not enabled in realm ${realm}. Enable them with update-realm-settings (organizationsEnabled=true)`;
}

export const orgNotFound = (ref: string, realm: string) => `Organization "${ref}" not found in realm ${realm}`;
