import { getKc } from "@/keycloak.js";
import { realmArg } from "@/tools/auth-flow-lookup.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerListRequiredActions(server: McpServer) {
  server.registerTool(
    "list-required-actions",
    {
      description:
        "List a realm's required actions (VERIFY_EMAIL, UPDATE_PASSWORD, CONFIGURE_TOTP, " +
        "TERMS_AND_CONDITIONS...): alias, name, enabled, whether it is a default action (applied " +
        "to every new user) and its priority order. Aliases are what send-user-actions-email " +
        "takes.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm")
      }
    },
    async ({ realm }) => {
      const kc = await getKc();
      const actions = await kc.authenticationManagement.getRequiredActions(realmArg(realm));

      const slim = actions.map(action => ({
        alias: action.alias,
        name: action.name,
        enabled: action.enabled ?? false,
        defaultAction: action.defaultAction ?? false,
        priority: action.priority ?? null
      }));

      return {
        content: [{ type: "text", text: JSON.stringify(slim, null, 2) }]
      };
    }
  );
}
