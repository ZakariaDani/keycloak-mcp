import { getKc } from "@/keycloak.js";
import {
  LDAP_MAPPER_TYPE,
  configRecordSchema,
  findFederationProvider,
  notFoundProvider,
  toConfigArrays
} from "@/tools/federation-lookup.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerCreateLdapMapper(server: McpServer) {
  server.registerTool(
    "create-ldap-mapper",
    {
      description:
        "Add a mapper to an LDAP federation provider. mapperType is e.g. " +
        "user-attribute-ldap-mapper, group-ldap-mapper, role-ldap-mapper or " +
        "hardcoded-ldap-role-mapper; use list-ldap-mapper-types for valid types and config keys. " +
        "Example user-attribute-ldap-mapper config: {\"ldap.attribute\": \"department\", " +
        "\"user.model.attribute\": \"department\", \"read.only\": true, " +
        "\"always.read.value.from.ldap\": false, \"is.mandatory.in.ldap\": false}.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        provider: z.string().describe("Federation provider name"),
        name: z.string().describe("Name of the mapper, e.g. department"),
        mapperType: z.string().describe("Mapper type id, e.g. user-attribute-ldap-mapper"),
        config: configRecordSchema.default({}).describe("Mapper settings; keys depend on the mapper type")
      }
    },
    async ({ realm, provider, name, mapperType, config }) => {
      const kc = await getKc();
      const found = await findFederationProvider(kc, realm, provider);

      if (!found) return notFoundProvider(provider, realm);

      const created = await kc.components.create({
        realm,
        name,
        providerId: mapperType,
        providerType: LDAP_MAPPER_TYPE,
        parentId: found.id,
        config: toConfigArrays(config)
      });

      return {
        content: [{ type: "text", text: JSON.stringify({ provider, id: created.id, name, mapperType }, null, 2) }]
      };
    }
  );
}
