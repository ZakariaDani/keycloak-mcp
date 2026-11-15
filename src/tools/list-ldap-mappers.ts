import { getKc } from "@/keycloak.js";
import {
  LDAP_MAPPER_TYPE,
  findFederationProvider,
  flattenConfig,
  notFoundProvider
} from "@/tools/federation-lookup.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerListLdapMappers(server: McpServer) {
  server.registerTool(
    "list-ldap-mappers",
    {
      description:
        "List the mappers of an LDAP federation provider: name, mapper type and config. They " +
        "control how LDAP attributes, groups and roles become Keycloak user attributes, groups " +
        "and roles.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        provider: z.string().describe("Federation provider name")
      }
    },
    async ({ realm, provider }) => {
      const kc = await getKc();
      const found = await findFederationProvider(kc, realm, provider);

      if (!found) return notFoundProvider(provider, realm);

      const mappers = await kc.components.find({ realm, parent: found.id, type: LDAP_MAPPER_TYPE });

      const slim = mappers.map(mapper => ({
        id: mapper.id,
        name: mapper.name,
        mapperType: mapper.providerId,
        config: flattenConfig(mapper.config).config
      }));

      return {
        content: [{ type: "text", text: JSON.stringify(slim, null, 2) }]
      };
    }
  );
}
