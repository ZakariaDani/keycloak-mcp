/** What Keycloak puts in place of a secret value when it exports a realm. */
export const MASK = "**********";

const isMasked = (value: unknown): boolean =>
  value === MASK || (Array.isArray(value) && value.length === 1 && value[0] === MASK);

/**
 * Return a copy of `input` with every property whose value is the secret mask removed.
 * Importing the mask back would store it as the literal secret, so dropping the property
 * lets Keycloak generate a fresh value (or keep none) instead. `removed` counts the drops.
 */
export function stripMaskedSecrets<T>(input: T): { value: T; removed: number } {
  let removed = 0;

  const walk = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(walk);

    if (node !== null && typeof node === "object") {
      const copy: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(node)) {
        if (isMasked(value)) {
          removed += 1;
        } else {
          copy[key] = walk(value);
        }
      }
      return copy;
    }

    return node;
  };

  return { value: walk(input) as T, removed };
}

/** The resource types Keycloak's partial import accepts. */
export const PARTIAL_IMPORT_TYPES = ["users", "clients", "groups", "roles", "identityProviders"] as const;

export type PartialImportType = (typeof PARTIAL_IMPORT_TYPES)[number];

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

/** How many resources of each type a realm JSON document holds. Roles count realm and client roles. */
export function countResources(rep: Record<string, unknown>): Record<PartialImportType, number> {
  const roles = (rep.roles ?? {}) as { realm?: unknown; client?: Record<string, unknown> };
  const clientRoles = Object.values(roles.client ?? {}).reduce<number>((sum, list) => sum + asArray(list).length, 0);

  return {
    users: asArray(rep.users).length,
    clients: asArray(rep.clients).length,
    groups: asArray(rep.groups).length,
    roles: asArray(roles.realm).length + clientRoles,
    identityProviders: asArray(rep.identityProviders).length
  };
}
