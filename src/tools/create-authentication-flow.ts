import { getKc } from "@/keycloak.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerCreateAuthenticationFlow(server: McpServer) {
  server.registerTool(
    "create-authentication-flow",
    {
      description:
        "Create an empty top-level authentication flow. It does nothing until you add steps " +
        "(add-flow-execution / add-authentication-subflow) and bind it (set-realm-flow-binding). " +
        "To start from a working flow instead, use copy-authentication-flow. Fails if the alias " +
        "already exists.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        alias: z.string().describe("Unique flow alias, e.g. browser-with-otp"),
        description: z.string().optional().describe("Optional description"),
        providerId: z
          .enum(["basic-flow", "client-flow"])
          .default("basic-flow")
          .describe("basic-flow for user logins (default), client-flow for client authentication")
      }
    },
    async ({ realm, alias, description, providerId }) => {
      const kc = await getKc();

      const created = await kc.authenticationManagement.createFlow({
        realm,
        alias,
        description,
        providerId,
        topLevel: true,
        builtIn: false
      });

      return {
        content: [{ type: "text", text: JSON.stringify({ alias, id: created.id, providerId }, null, 2) }]
      };
    }
  );
}
