import type KeycloakAdminClient from "@keycloak/keycloak-admin-client";
import type AuthenticationExecutionInfoRepresentation from "@keycloak/keycloak-admin-client/lib/defs/authenticationExecutionInfoRepresentation.js";
import type AuthenticationFlowRepresentation from "@keycloak/keycloak-admin-client/lib/defs/authenticationFlowRepresentation.js";
import { z } from "zod";

export const flowBindingSchema = z.enum([
  "browser",
  "registration",
  "directGrant",
  "resetCredentials",
  "clientAuthentication",
  "dockerAuthentication"
]);

export type FlowBinding = z.infer<typeof flowBindingSchema>;

/** Realm-level flow bindings: the name we expose -> the field on the realm representation. */
export const FLOW_BINDINGS = {
  browser: "browserFlow",
  registration: "registrationFlow",
  directGrant: "directGrantFlow",
  resetCredentials: "resetCredentialsFlow",
  clientAuthentication: "clientAuthenticationFlow",
  dockerAuthentication: "dockerAuthenticationFlow"
} as const satisfies Record<FlowBinding, string>;

/**
 * Payload for authenticationManagement list calls (required actions, provider lists).
 * The SDK types their argument as `void & { realm?: string }`, which rejects a realm even
 * though the runtime honours it, so the realm has to be smuggled past the typings here.
 */
export const realmArg = (realm: string) => ({ realm }) as unknown as void & { realm?: string };

export const requirementSchema = z.enum(["REQUIRED", "ALTERNATIVE", "CONDITIONAL", "DISABLED"]);

/**
 * Resolve a top-level flow by alias. Returns null when the realm has no such flow.
 * Subflows are not top-level and are not returned here.
 */
export async function findFlow(
  kc: KeycloakAdminClient,
  realm: string,
  alias: string
): Promise<AuthenticationFlowRepresentation | null> {
  const flows = await kc.authenticationManagement.getFlows({ realm });
  return flows.find(flow => flow.alias === alias) ?? null;
}

/**
 * Resolve one execution of a flow from an id, or from a provider id / display name / alias
 * when that matches exactly one execution. Returns an error message when it matches none or
 * several, listing candidates so the caller can retry with an id.
 */
export async function resolveExecution(
  kc: KeycloakAdminClient,
  realm: string,
  flow: string,
  ref: string
): Promise<{ execution: AuthenticationExecutionInfoRepresentation & { id: string } } | { error: string }> {
  const executions = await kc.authenticationManagement.getExecutions({ realm, flow });

  const matches = executions.filter(
    e => e.id === ref || e.providerId === ref || e.displayName === ref || e.alias === ref
  );

  const describe = (e: AuthenticationExecutionInfoRepresentation) =>
    `${e.displayName ?? e.alias ?? e.providerId} (id ${e.id}, level ${e.level ?? 0})`;

  const [match] = matches;

  if (!match?.id) {
    return {
      error: `Execution "${ref}" not found in flow "${flow}". Available: ${executions.map(describe).join("; ")}`
    };
  }

  if (matches.length > 1) {
    return {
      error: `"${ref}" matches ${matches.length} executions in flow "${flow}"; use an id instead: ${matches.map(describe).join("; ")}`
    };
  }

  return { execution: { ...match, id: match.id } };
}
