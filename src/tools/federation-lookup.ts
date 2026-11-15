import type KeycloakAdminClient from "@keycloak/keycloak-admin-client";
import type ComponentRepresentation from "@keycloak/keycloak-admin-client/lib/defs/componentRepresentation.js";
import { z } from "zod";

/** Keycloak stores user federation providers as components of this type. */
export const USER_STORAGE_TYPE = "org.keycloak.storage.UserStorageProvider";

/** LDAP attribute/role/group mappers are child components of a federation provider. */
export const LDAP_MAPPER_TYPE = "org.keycloak.storage.ldap.mappers.LDAPStorageMapper";

/** Config values accepted from the caller; Keycloak stores every value as a string list. */
export const configValueSchema = z.union([z.string(), z.number(), z.boolean()]);

export const configRecordSchema = z.record(z.string(), configValueSchema);

const SECRET_KEY = /credential|secret|password|keytab/i;

/** Convert caller-friendly values to the string[] form Keycloak components store. */
export function toConfigArrays(
  config: Record<string, string | number | boolean>
): Record<string, string[]> {
  return Object.fromEntries(Object.entries(config).map(([key, value]) => [key, [String(value)]]));
}

/**
 * Make a component config readable: single-value lists become plain strings, and secret
 * values (bind credentials, keytabs...) are dropped, reporting only which ones are set.
 */
export function flattenConfig(config: ComponentRepresentation["config"]): {
  config: Record<string, string | string[]>;
  secretsSet: string[];
} {
  const visible: Record<string, string | string[]> = {};
  const secretsSet: string[] = [];

  for (const [key, value] of Object.entries(config ?? {})) {
    if (SECRET_KEY.test(key)) {
      secretsSet.push(key);
    } else {
      visible[key] = Array.isArray(value) && value.length === 1 ? (value[0] ?? "") : value;
    }
  }

  return { config: visible, secretsSet };
}

/**
 * Resolve a user federation provider by exact name. Returns null when the realm has none
 * with that name.
 */
export async function findFederationProvider(
  kc: KeycloakAdminClient,
  realm: string,
  name: string
): Promise<(ComponentRepresentation & { id: string }) | null> {
  const providers = await kc.components.find({ realm, type: USER_STORAGE_TYPE });
  const match = providers.find(provider => provider.name === name);
  return match?.id ? { ...match, id: match.id } : null;
}

export const notFoundProvider = (name: string, realm: string) => ({
  content: [{ type: "text" as const, text: `User federation provider "${name}" not found in realm ${realm}` }],
  isError: true
});
