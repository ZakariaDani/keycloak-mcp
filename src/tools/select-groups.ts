/**
 * Turn the raw KEYCLOAK_TOOLS value into the list of groups to expose.
 *
 * - unset, blank or "all" (alone or in a list) -> every group
 * - otherwise a comma-separated list of group names, case-insensitive, duplicates ignored
 * - an unknown name throws, so a typo fails at startup instead of silently hiding tools
 */
export function parseToolGroups(raw: string | undefined, available: readonly string[]): string[] {
  const requested = (raw ?? "")
    .split(",")
    .map(name => name.trim().toLowerCase())
    .filter(name => name.length > 0);

  if (requested.length === 0 || requested.includes("all")) {
    return [...available];
  }

  const unknown = requested.filter(name => !available.includes(name));

  if (unknown.length > 0) {
    throw new Error(
      `Unknown KEYCLOAK_TOOLS group(s): ${[...new Set(unknown)].join(", ")}. ` +
        `Valid groups: ${available.join(", ")} (or "all")`
    );
  }

  return [...new Set(requested)];
}
