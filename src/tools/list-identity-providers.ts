import { getKc } from "@/keycloak.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerListIdentityProviders(server: McpServer) {
  server.registerTool(
    "list-identity-providers",
    {
      description:
        "List the identity providers (Google, GitHub, SAML, OIDC brokers...) configured in a " +
        "realm: alias, provider type, display name and enabled status. Secrets are not returned.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm")
      }
    },
    async ({ realm }) => {
      const kc = await getKc();
      const providers = await kc.identityProviders.find({ realm });

      const slim = providers.map(idp => ({
        alias: idp.alias,
        providerId: idp.providerId,
        displayName: idp.displayName ?? null,
        enabled: idp.enabled ?? false,
        trustEmail: idp.trustEmail ?? false
      }));

      return {
        content: [{ type: "text", text: JSON.stringify(slim, null, 2) }]
      };
    }
  );
}
