import { getKc } from "@/keycloak.js";
import {
  configRecordSchema,
  findFederationProvider,
  notFoundProvider,
  toConfigArrays
} from "@/tools/federation-lookup.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerUpdateUserFederationProvider(server: McpServer) {
  server.registerTool(
    "update-user-federation-provider",
    {
      description:
        "Change settings of a user federation provider (by name). config entries are MERGED into " +
        "the existing config; other keys are kept, and a stored bind credential is preserved " +
        "unless you send a new bindCredential. Common keys: enabled, priority, editMode " +
        "(READ_ONLY, WRITABLE, UNSYNCED), connectionUrl, usersDn, bindDn, bindCredential, " +
        "importEnabled, syncRegistrations, fullSyncPeriod and changedSyncPeriod (seconds, -1 " +
        "disables). Set enabled=false to pause the provider without deleting it. The provider's " +
        "name and type cannot be changed.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        name: z.string().describe("Provider name"),
        config: configRecordSchema.describe("Settings to set or overwrite, e.g. {\"fullSyncPeriod\": 86400}")
      }
    },
    async ({ realm, name, config }) => {
      if (Object.keys(config).length === 0) {
        return {
          content: [{ type: "text", text: "No fields to update: supply at least one config entry" }],
          isError: true
        };
      }

      const kc = await getKc();
      const provider = await findFederationProvider(kc, realm, name);

      if (!provider) return notFoundProvider(name, realm);

      // PUT replaces the whole component. The stored secret comes back masked and Keycloak
      // keeps the real value when it receives the mask.
      await kc.components.update(
        { realm, id: provider.id },
        { ...provider, config: { ...provider.config, ...toConfigArrays(config) } }
      );

      // Report which keys changed but never their values: they may be secrets.
      return {
        content: [{ type: "text", text: JSON.stringify({ name, updatedKeys: Object.keys(config) }, null, 2) }]
      };
    }
  );
}
