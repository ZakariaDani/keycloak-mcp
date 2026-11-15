import { getKc } from "@/keycloak.js";
import { fail, resolveResourceServer } from "@/tools/authz-lookup.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerGetAuthorizationSettings(server: McpServer) {
  server.registerTool(
    "get-authorization-settings",
    {
      description:
        "Get the authorization-services settings of a client (the 'resource server'): policy " +
        "enforcement mode, decision strategy and whether remote resource management is allowed. " +
        "Fails with a hint if authorization services are not enabled on the client.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        clientId: z.string().describe("The resource server's clientId string, e.g. my-backend")
      }
    },
    async ({ realm, clientId }) => {
      const kc = await getKc();
      const resolved = await resolveResourceServer(kc, realm, clientId);

      if ("error" in resolved) return fail(resolved.error);

      const settings = await kc.clients.getResourceServer({ realm, id: resolved.id });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                clientId,
                policyEnforcementMode: settings.policyEnforcementMode ?? null,
                decisionStrategy: settings.decisionStrategy ?? null,
                allowRemoteResourceManagement: settings.allowRemoteResourceManagement ?? false
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
