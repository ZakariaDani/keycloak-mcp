import { getKc } from "@/keycloak.js";
import { fail, resolveResourceServer } from "@/tools/authz-lookup.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerUpdateAuthorizationSettings(server: McpServer) {
  server.registerTool(
    "update-authorization-settings",
    {
      description:
        "Change a resource server's settings. policyEnforcementMode: ENFORCING (default; deny " +
        "when no policy matches), PERMISSIVE (allow when no policy matches, still logs) or " +
        "DISABLED (allow everything, policies ignored). decisionStrategy decides how the " +
        "permissions of one resource combine: UNANIMOUS (all must permit), AFFIRMATIVE (one " +
        "is enough) or CONSENSUS (majority). Only supplied fields change; needs at least one. " +
        "Careful: DISABLED turns authorization off for the whole resource server.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        clientId: z.string().describe("The resource server's clientId string"),
        policyEnforcementMode: z.enum(["ENFORCING", "PERMISSIVE", "DISABLED"]).optional(),
        decisionStrategy: z.enum(["UNANIMOUS", "AFFIRMATIVE", "CONSENSUS"]).optional(),
        allowRemoteResourceManagement: z
          .boolean()
          .optional()
          .describe("Let the resource server manage its resources through the Protection API")
      }
    },
    async ({ realm, clientId, policyEnforcementMode, decisionStrategy, allowRemoteResourceManagement }) => {
      if (
        policyEnforcementMode === undefined &&
        decisionStrategy === undefined &&
        allowRemoteResourceManagement === undefined
      ) {
        return fail("No fields to update: supply at least one setting");
      }

      const kc = await getKc();
      const resolved = await resolveResourceServer(kc, realm, clientId);

      if ("error" in resolved) return fail(resolved.error);

      const existing = await kc.clients.getResourceServer({ realm, id: resolved.id });

      // Send only the settings, not the resources/policies/scopes arrays.
      const updated = {
        id: existing.id,
        clientId: existing.clientId,
        name: existing.name,
        policyEnforcementMode: policyEnforcementMode ?? existing.policyEnforcementMode,
        decisionStrategy: decisionStrategy ?? existing.decisionStrategy,
        allowRemoteResourceManagement: allowRemoteResourceManagement ?? existing.allowRemoteResourceManagement
      };

      await kc.clients.updateResourceServer({ realm, id: resolved.id }, updated);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                clientId,
                policyEnforcementMode: updated.policyEnforcementMode ?? null,
                decisionStrategy: updated.decisionStrategy ?? null,
                allowRemoteResourceManagement: updated.allowRemoteResourceManagement ?? false
              },
              null,
              2
            )
          }
        ]
      };
    }
  );
}
