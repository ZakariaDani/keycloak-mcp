import { getKc } from "@/keycloak.js";
import { FLOW_BINDINGS } from "@/tools/auth-flow-lookup.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerListAuthenticationFlows(server: McpServer) {
  server.registerTool(
    "list-authentication-flows",
    {
      description:
        "List a realm's top-level authentication flows (browser, direct grant, registration, " +
        "reset credentials, custom ones...): alias, description, whether built-in, and which " +
        "realm bindings currently use each flow (e.g. boundTo: [\"browser\"]). Use " +
        "get-authentication-flow to see a flow's steps.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm")
      }
    },
    async ({ realm }) => {
      const kc = await getKc();
      const [flows, found] = await Promise.all([
        kc.authenticationManagement.getFlows({ realm }),
        kc.realms.findOne({ realm })
      ]);

      if (!found) {
        return { content: [{ type: "text", text: `Realm "${realm}" not found` }], isError: true };
      }

      const slim = flows.map(flow => ({
        alias: flow.alias,
        id: flow.id,
        description: flow.description ?? null,
        providerId: flow.providerId,
        builtIn: flow.builtIn ?? false,
        boundTo: Object.entries(FLOW_BINDINGS)
          .filter(([, field]) => found[field] === flow.alias)
          .map(([binding]) => binding)
      }));

      return {
        content: [{ type: "text", text: JSON.stringify(slim, null, 2) }]
      };
    }
  );
}
