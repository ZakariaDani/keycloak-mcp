import { getKc } from "@/keycloak.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerCreateIdentityProvider(server: McpServer) {
  server.registerTool(
    "create-identity-provider",
    {
      description:
        "Add an identity provider (social login or external broker) to a realm. providerId is " +
        "the provider type: google, github, facebook, microsoft, oidc, keycloak-oidc, saml, ... " +
        "Put provider settings in config, e.g. {clientId, clientSecret} for social providers, or " +
        "{authorizationUrl, tokenUrl, clientId, clientSecret} for a generic oidc provider. " +
        "config may contain secrets. Fails if the alias already exists.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        alias: z.string().describe("Unique alias used in login URLs, e.g. google"),
        providerId: z.string().describe("Provider type, e.g. google, github, oidc, saml"),
        displayName: z.string().optional().describe("Label shown on the login button"),
        enabled: z.boolean().default(true).describe("Enable the provider immediately"),
        trustEmail: z
          .boolean()
          .default(false)
          .describe("Treat emails from this provider as verified"),
        config: z
          .record(z.string(), z.string())
          .optional()
          .describe("Provider-specific settings, e.g. {\"clientId\": \"...\", \"clientSecret\": \"...\"}")
      }
    },
    async ({ realm, alias, providerId, displayName, enabled, trustEmail, config }) => {
      const kc = await getKc();

      await kc.identityProviders.create({
        realm,
        alias,
        providerId,
        displayName,
        enabled,
        trustEmail,
        ...(config ? { config } : {})
      });

      // Deliberately do not echo config back: it may hold the client secret.
      return {
        content: [
          { type: "text", text: JSON.stringify({ alias, providerId, enabled, created: true }, null, 2) }
        ]
      };
    }
  );
}
