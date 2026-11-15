import { getKc } from "@/keycloak.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerGetIdentityProvider(server: McpServer) {
  server.registerTool(
    "get-identity-provider",
    {
      description:
        "Get one identity provider by alias, including its settings and config (endpoints, " +
        "client id, etc). Keycloak masks secret values such as clientSecret.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        alias: z.string().describe("Identity provider alias, e.g. google")
      }
    },
    async ({ realm, alias }) => {
      const kc = await getKc();
      const idp = await kc.identityProviders.findOne({ realm, alias });

      if (!idp) {
        return {
          content: [{ type: "text", text: `Identity provider "${alias}" not found in realm ${realm}` }],
          isError: true
        };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                alias: idp.alias,
                providerId: idp.providerId,
                displayName: idp.displayName ?? null,
                enabled: idp.enabled ?? false,
                trustEmail: idp.trustEmail ?? false,
                storeToken: idp.storeToken ?? false,
                linkOnly: idp.linkOnly ?? false,
                hideOnLogin: idp.hideOnLogin ?? false,
                firstBrokerLoginFlowAlias: idp.firstBrokerLoginFlowAlias ?? null,
                config: idp.config ?? {}
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
