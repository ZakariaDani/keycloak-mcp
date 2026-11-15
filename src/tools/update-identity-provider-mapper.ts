import { getKc } from "@/keycloak.js";
import { findIdpMapper } from "@/tools/lookup.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerUpdateIdentityProviderMapper(server: McpServer) {
  server.registerTool(
    "update-identity-provider-mapper",
    {
      description:
        "Change the config of an identity provider mapper (mapper looked up by name). config " +
        "entries are MERGED into the existing config; other keys are kept. The mapper's name " +
        "and type cannot be changed: delete and re-create it for that.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        alias: z.string().describe("Identity provider alias, e.g. google"),
        name: z.string().describe("Name of the existing mapper"),
        config: z
          .record(z.string(), z.string())
          .describe("Config keys to set or overwrite, e.g. {\"claim\": \"dept\"}")
      }
    },
    async ({ realm, alias, name, config }) => {
      if (Object.keys(config).length === 0) {
        return {
          content: [{ type: "text", text: "No fields to update: supply at least one config entry" }],
          isError: true
        };
      }

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

      const merged = { ...mapper.config, ...config };

      await kc.identityProviders.updateMapper({ realm, alias, id: mapper.id }, { ...mapper, config: merged });

      return {
        content: [{ type: "text", text: JSON.stringify({ alias, name, config: merged }, null, 2) }]
      };
    }
  );
}
