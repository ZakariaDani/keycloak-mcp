import { getKc } from "@/keycloak.js";
import { realmArg } from "@/tools/auth-flow-lookup.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerUpdateRequiredAction(server: McpServer) {
  server.registerTool(
    "update-required-action",
    {
      description:
        "Enable/disable a required action (by alias, e.g. CONFIGURE_TOTP) or make it a default " +
        "action. A default action is automatically assigned to every NEW user (existing users " +
        "are not affected), e.g. defaultAction=true on CONFIGURE_TOTP forces OTP setup at first " +
        "login. A disabled action cannot be a default. Only supplied fields change; requires at " +
        "least one.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        alias: z.string().describe("Required action alias, e.g. CONFIGURE_TOTP"),
        enabled: z.boolean().optional().describe("Enable or disable the action"),
        defaultAction: z.boolean().optional().describe("Assign it to every new user"),
        name: z.string().optional().describe("New display name")
      }
    },
    async ({ realm, alias, enabled, defaultAction, name }) => {
      if (enabled === undefined && defaultAction === undefined && name === undefined) {
        return {
          content: [{ type: "text", text: "No fields to update: supply enabled, defaultAction or name" }],
          isError: true
        };
      }

      const kc = await getKc();
      const actions = await kc.authenticationManagement.getRequiredActions(realmArg(realm));
      const existing = actions.find(action => action.alias === alias);

      if (!existing) {
        return {
          content: [
            {
              type: "text",
              text: `Required action "${alias}" not found in realm ${realm}. Available: ${actions.map(a => a.alias).join(", ")}`
            }
          ],
          isError: true
        };
      }

      // PUT replaces the representation, so start from the existing one.
      const updated = {
        ...existing,
        ...(enabled !== undefined ? { enabled } : {}),
        ...(defaultAction !== undefined ? { defaultAction } : {}),
        ...(name !== undefined ? { name } : {})
      };

      await kc.authenticationManagement.updateRequiredAction({ realm, alias }, updated);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              { alias, name: updated.name, enabled: updated.enabled ?? false, defaultAction: updated.defaultAction ?? false },
              null,
              2
            )
          }
        ]
      };
    }
  );
}
