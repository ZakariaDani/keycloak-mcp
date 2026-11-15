import { getKc } from "@/keycloak.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerListIdentityProviderMapperTypes(server: McpServer) {
  server.registerTool(
    "list-identity-provider-mapper-types",
    {
      description:
        "List the mapper types an identity provider supports (by alias), with the config " +
        "properties each one takes. Call this before create-identity-provider-mapper to get a " +
        "valid identityProviderMapper id and the right config keys.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        alias: z.string().describe("Identity provider alias, e.g. google")
      }
    },
    async ({ realm, alias }) => {
      const kc = await getKc();

      if (!(await kc.identityProviders.findOne({ realm, alias }))) {
        return {
          content: [{ type: "text", text: `Identity provider "${alias}" not found in realm ${realm}` }],
          isError: true
        };
      }

      const types = await kc.identityProviders.findMapperTypes({ realm, alias });

      const slim = Object.values(types).map(type => ({
        id: type.id,
        name: type.name,
        category: type.category ?? null,
        helpText: type.helpText ?? null,
        properties: (type.properties ?? []).map(prop => ({
          name: prop.name,
          type: prop.type ?? null,
          options: prop.options ?? null,
          helpText: prop.helpText ?? null
        }))
      }));

      return {
        content: [{ type: "text", text: JSON.stringify(slim, null, 2) }]
      };
    }
  );
}
