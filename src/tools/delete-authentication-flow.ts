import { getKc } from "@/keycloak.js";
import { FLOW_BINDINGS, findFlow } from "@/tools/auth-flow-lookup.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerDeleteAuthenticationFlow(server: McpServer) {
  server.registerTool(
    "delete-authentication-flow",
    {
      description:
        "Delete a custom top-level authentication flow (by alias) with all its steps and " +
        "subflows. Built-in flows and flows currently bound to the realm are refused; re-bind " +
        "the realm first with set-realm-flow-binding. Cannot be undone.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        flow: z.string().describe("Flow alias to delete, e.g. browser-with-otp")
      }
    },
    async ({ realm, flow }) => {
      const kc = await getKc();
      const [found, realmRep] = await Promise.all([findFlow(kc, realm, flow), kc.realms.findOne({ realm })]);

      if (!found?.id || !realmRep) {
        return {
          content: [{ type: "text", text: `Authentication flow "${flow}" not found in realm ${realm}` }],
          isError: true
        };
      }

      if (found.builtIn) {
        return {
          content: [{ type: "text", text: `Flow "${flow}" is built-in and cannot be deleted` }],
          isError: true
        };
      }

      const boundTo = Object.entries(FLOW_BINDINGS)
        .filter(([, field]) => realmRep[field] === flow)
        .map(([binding]) => binding);

      if (boundTo.length > 0) {
        return {
          content: [
            {
              type: "text",
              text: `Flow "${flow}" is still bound to the realm (${boundTo.join(", ")}); bind another flow first`
            }
          ],
          isError: true
        };
      }

      await kc.authenticationManagement.deleteFlow({ realm, flowId: found.id });

      return {
        content: [{ type: "text", text: JSON.stringify({ flow, deleted: true }, null, 2) }]
      };
    }
  );
}
