import { getKc } from "@/keycloak.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerCreateIdentityProviderMapper(server: McpServer) {
  server.registerTool(
    "create-identity-provider-mapper",
    {
      description:
        "Add a mapper to an identity provider (by alias). identityProviderMapper is the mapper " +
        "type, e.g. oidc-user-attribute-idp-mapper (claim -> user attribute), " +
        "hardcoded-role-idp-mapper, oidc-role-idp-mapper, hardcoded-attribute-idp-mapper. " +
        "Use list-identity-provider-mapper-types for valid types and config keys. Config should " +
        "include syncMode (INHERIT, IMPORT, FORCE or LEGACY) on current Keycloak versions, e.g. " +
        "{\"syncMode\": \"INHERIT\", \"claim\": \"department\", \"user.attribute\": \"department\"}. " +
        "Fails if a mapper with that name already exists on the provider.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        alias: z.string().describe("Identity provider alias, e.g. google"),
        name: z.string().describe("Name of the mapper, e.g. department-to-attribute"),
        identityProviderMapper: z
          .string()
          .describe("Mapper type id, e.g. oidc-user-attribute-idp-mapper"),
        config: z
          .record(z.string(), z.string())
          .default({})
          .describe("Mapper settings; keys depend on the mapper type")
      }
    },
    async ({ realm, alias, name, identityProviderMapper, config }) => {
      const kc = await getKc();

      if (!(await kc.identityProviders.findOne({ realm, alias }))) {
        return {
          content: [{ type: "text", text: `Identity provider "${alias}" not found in realm ${realm}` }],
          isError: true
        };
      }

      const created = await kc.identityProviders.createMapper({
        realm,
        alias,
        identityProviderMapper: {
          name,
          identityProviderAlias: alias,
          identityProviderMapper,
          config
        }
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ alias, id: created.id, name, identityProviderMapper }, null, 2)
          }
        ]
      };
    }
  );
}
