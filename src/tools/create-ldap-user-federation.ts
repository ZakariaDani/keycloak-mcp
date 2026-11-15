import { getKc } from "@/keycloak.js";
import {
  USER_STORAGE_TYPE,
  configRecordSchema,
  findFederationProvider,
  toConfigArrays
} from "@/tools/federation-lookup.js";
import { ldapDefaults, ldapVendorSchema } from "@/tools/ldap-defaults.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerCreateLdapUserFederation(server: McpServer) {
  server.registerTool(
    "create-ldap-user-federation",
    {
      description:
        "Connect a realm to an LDAP or Active Directory server so its users can log in. vendor " +
        "(ad, rhds, tivoli, edirectory, other) selects the right attribute names and object " +
        "classes automatically. Defaults: editMode READ_ONLY, users imported on login, no " +
        "periodic sync. Override or extend any setting through config (keys as in " +
        "get-user-federation-provider, e.g. {\"editMode\": \"WRITABLE\", \"fullSyncPeriod\": 86400}). " +
        "Keycloak normally adds the default attribute mappers itself; check with " +
        "list-ldap-mappers. Run sync-user-federation-provider to import users up front. " +
        "Fails if a provider with that name exists.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        name: z.string().describe("Provider name, e.g. corporate-ad"),
        vendor: ldapVendorSchema.describe("Directory vendor: ad, rhds, tivoli, edirectory or other (e.g. OpenLDAP)"),
        connectionUrl: z.string().describe("LDAP URL, e.g. ldaps://ldap.example.com:636"),
        usersDn: z.string().describe("DN under which users live, e.g. ou=people,dc=example,dc=com"),
        authType: z
          .enum(["simple", "none"])
          .default("simple")
          .describe("simple (bind with bindDn/bindCredential) or none (anonymous)"),
        bindDn: z.string().optional().describe("Bind DN of the service account (required for simple auth)"),
        bindCredential: z.string().optional().describe("Bind password (required for simple auth). Write-only"),
        config: configRecordSchema
          .optional()
          .describe("Extra or overriding settings, e.g. {\"editMode\": \"WRITABLE\", \"enabled\": false}")
      }
    },
    async ({ realm, name, vendor, connectionUrl, usersDn, authType, bindDn, bindCredential, config }) => {
      if (authType === "simple" && (!bindDn || !bindCredential)) {
        return {
          content: [{ type: "text", text: "authType simple requires both bindDn and bindCredential" }],
          isError: true
        };
      }

      const kc = await getKc();

      if (await findFederationProvider(kc, realm, name)) {
        return {
          content: [{ type: "text", text: `A user federation provider named "${name}" already exists in realm ${realm}` }],
          isError: true
        };
      }

      const realmRep = await kc.realms.findOne({ realm });

      if (!realmRep?.id) {
        return { content: [{ type: "text", text: `Realm "${realm}" not found` }], isError: true };
      }

      const merged = {
        ...ldapDefaults(vendor),
        ...config,
        connectionUrl,
        usersDn,
        authType,
        ...(bindDn ? { bindDn } : {}),
        ...(bindCredential ? { bindCredential } : {})
      };

      const created = await kc.components.create({
        realm,
        name,
        providerId: "ldap",
        providerType: USER_STORAGE_TYPE,
        parentId: realmRep.id,
        config: toConfigArrays(merged)
      });

      // Never echo the bind credential back.
      return {
        content: [
          { type: "text", text: JSON.stringify({ id: created.id, name, vendor, connectionUrl, usersDn, created: true }, null, 2) }
        ]
      };
    }
  );
}
