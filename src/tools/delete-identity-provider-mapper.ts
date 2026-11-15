import { getKc } from "@/keycloak.js";
import { findIdpMapper } from "@/tools/lookup.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerDeleteIdentityProviderMapper(server: McpServer) {
  server.registerTool(
    "delete-identity-provider-mapper",
    {
      description:
        "Remove a mapper (by name) from an identity provider. Users already imported keep the " +
        "attributes/roles it set; future logins just stop applying it. Cannot be undone.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        alias: z.string().describe("Identity provider alias, e.g. google"),
        name: z.string().describe("Name of the mapper to delete")
      }
    },
    async ({ realm, alias, name }) => {
      const kc = await getKc();
      const mapper = await findIdpMapper(kc, realm, alias, name);

      if (!mapper?.id) {
        return {
          content: [
            { type: "text", text: `Mapper "${name}" not found on identity provider "${alias}" in realm ${realm}` }
          ],
          isError: true
        };
      }

      await kc.identityProviders.delMapper({ realm, alias, id: mapper.id });

      return {
        content: [{ type: "text", text: JSON.stringify({ alias, name, deleted: true }, null, 2) }]
      };
    }
  );
}
