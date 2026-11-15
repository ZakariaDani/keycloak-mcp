import { getKc } from "@/keycloak.js";
import {
  LDAP_MAPPER_TYPE,
  findFederationProvider,
  notFoundProvider
} from "@/tools/federation-lookup.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerDeleteLdapMapper(server: McpServer) {
  server.registerTool(
    "delete-ldap-mapper",
    {
      description:
        "Remove a mapper (by name) from an LDAP federation provider. Users already imported " +
        "keep the attributes/groups/roles it set; later syncs stop applying it. Cannot be undone.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        provider: z.string().describe("Federation provider name"),
        name: z.string().describe("Name of the mapper to delete")
      }
    },
    async ({ realm, provider, name }) => {
      const kc = await getKc();
      const found = await findFederationProvider(kc, realm, provider);

      if (!found) return notFoundProvider(provider, realm);

      const mappers = await kc.components.find({ realm, parent: found.id, type: LDAP_MAPPER_TYPE });
      const mapper = mappers.find(m => m.name === name);

      if (!mapper?.id) {
        return {
          content: [{ type: "text", text: `Mapper "${name}" not found on provider "${provider}" in realm ${realm}` }],
          isError: true
        };
      }

      await kc.components.del({ realm, id: mapper.id });

      return {
        content: [{ type: "text", text: JSON.stringify({ provider, name, deleted: true }, null, 2) }]
      };
    }
  );
}
