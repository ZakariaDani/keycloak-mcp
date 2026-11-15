import { getKc } from "@/keycloak.js";
import {
  LDAP_MAPPER_TYPE,
  findFederationProvider,
  notFoundProvider
} from "@/tools/federation-lookup.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerListLdapMapperTypes(server: McpServer) {
  server.registerTool(
    "list-ldap-mapper-types",
    {
      description:
        "List the mapper types an LDAP federation provider supports (user-attribute-ldap-mapper, " +
        "group-ldap-mapper, role-ldap-mapper, full-name-ldap-mapper, ...), with the config " +
        "properties each takes. Call before create-ldap-mapper to get a valid type and config keys.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        provider: z.string().describe("Federation provider name")
      }
    },
    async ({ realm, provider }) => {
      const kc = await getKc();
      const found = await findFederationProvider(kc, realm, provider);

      if (!found) return notFoundProvider(provider, realm);

      const types = await kc.components.listSubComponents({ realm, id: found.id, type: LDAP_MAPPER_TYPE });

      const slim = types.map(type => ({
        id: type.id,
        helpText: type.helpText ?? null,
        properties: (type.properties ?? []).map(prop => ({
          name: prop.name,
          type: prop.type ?? null,
          required: prop.required ?? false,
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
