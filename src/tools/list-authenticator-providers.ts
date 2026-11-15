import { getKc } from "@/keycloak.js";
import { realmArg } from "@/tools/auth-flow-lookup.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerListAuthenticatorProviders(server: McpServer) {
  server.registerTool(
    "list-authenticator-providers",
    {
      description:
        "List the step types available to add to a flow, with the id to pass as `provider` to " +
        "add-flow-execution. kind=authenticator (default) lists user-login steps such as " +
        "auth-otp-form or auth-username-password-form; form-action lists steps usable inside " +
        "registration form subflows; client lists client authenticators.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        kind: z
          .enum(["authenticator", "form-action", "client"])
          .default("authenticator")
          .describe("Which family of provider to list")
      }
    },
    async ({ realm, kind }) => {
      const kc = await getKc();
      const mgmt = kc.authenticationManagement;

      const providers =
        kind === "form-action"
          ? await mgmt.getFormActionProviders(realmArg(realm))
          : kind === "client"
            ? await mgmt.getClientAuthenticatorProviders(realmArg(realm))
            : await mgmt.getAuthenticatorProviders(realmArg(realm));

      const slim = providers.map(provider => ({
        id: provider.id,
        displayName: provider.displayName ?? null,
        description: provider.description ?? null
      }));

      return {
        content: [{ type: "text", text: JSON.stringify(slim, null, 2) }]
      };
    }
  );
}
