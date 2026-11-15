import { getKc } from "@/keycloak.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerUpdateIdentityProvider(server: McpServer) {
  server.registerTool(
    "update-identity-provider",
    {
      description:
        "Update an identity provider (by alias). Only supplied fields change. config entries are " +
        "MERGED into the existing config (other keys are kept). Use enabled=false to switch a " +
        "provider off without deleting it. Requires at least one field.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        alias: z.string().describe("Identity provider alias, e.g. google"),
        displayName: z.string().optional().describe("New login-button label"),
        enabled: z.boolean().optional().describe("Enable or disable the provider"),
        trustEmail: z.boolean().optional().describe("Treat emails from this provider as verified"),
        config: z
          .record(z.string(), z.string())
          .optional()
          .describe("Config keys to set or overwrite, e.g. {\"clientId\": \"new-id\"}")
      }
    },
    async ({ realm, alias, displayName, enabled, trustEmail, config }) => {
      if (
        displayName === undefined &&
        enabled === undefined &&
        trustEmail === undefined &&
        config === undefined
      ) {
        return {
          content: [{ type: "text", text: "No fields to update: supply at least one field" }],
          isError: true
        };
      }

      const kc = await getKc();
      const existing = await kc.identityProviders.findOne({ realm, alias });

      if (!existing) {
        return {
          content: [{ type: "text", text: `Identity provider "${alias}" not found in realm ${realm}` }],
          isError: true
        };
      }

      // PUT replaces the whole representation, so start from the existing one.
      // Secrets come back masked and Keycloak keeps the stored value when it sees the mask.
      const updated = {
        ...existing,
        ...(displayName !== undefined ? { displayName } : {}),
        ...(enabled !== undefined ? { enabled } : {}),
        ...(trustEmail !== undefined ? { trustEmail } : {}),
        ...(config ? { config: { ...existing.config, ...config } } : {})
      };

      await kc.identityProviders.update({ realm, alias }, updated);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                alias,
                displayName: updated.displayName ?? null,
                enabled: updated.enabled ?? false,
                trustEmail: updated.trustEmail ?? false,
                configKeysUpdated: config ? Object.keys(config) : []
              },
              null,
              2
            )
          }
        ]
      };
    }
  );
}
