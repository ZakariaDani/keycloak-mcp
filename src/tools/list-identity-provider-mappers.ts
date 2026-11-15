import { getKc } from "@/keycloak.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerListIdentityProviderMappers(server: McpServer) {
  server.registerTool(
    "list-identity-provider-mappers",
    {
      description:
        "List the mappers of an identity provider (by alias): name, mapper type and config. " +
        "They control how claims from the external provider become user attributes, roles or " +
        "group memberships on first/every login.",
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

      const mappers = await kc.identityProviders.findMappers({ realm, alias });

      const slim = mappers.map(mapper => ({
        id: mapper.id,
        name: mapper.name,
        identityProviderMapper: mapper.identityProviderMapper,
        config: mapper.config ?? {}
      }));

      return {
        content: [{ type: "text", text: JSON.stringify(slim, null, 2) }]
      };
    }
  );
}
