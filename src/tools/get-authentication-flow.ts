import { getKc } from "@/keycloak.js";
import { findFlow } from "@/tools/auth-flow-lookup.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerGetAuthenticationFlow(server: McpServer) {
  server.registerTool(
    "get-authentication-flow",
    {
      description:
        "Show the steps of an authentication flow (by alias) in order, flattened with their " +
        "nesting level: each step's requirement (REQUIRED, ALTERNATIVE, CONDITIONAL, DISABLED), " +
        "provider, whether it is a subflow, and which requirement values it accepts. Use the " +
        "step ids/names with update-flow-execution and delete-flow-execution.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        flow: z.string().describe("Top-level flow alias, e.g. browser")
      }
    },
    async ({ realm, flow }) => {
      const kc = await getKc();
      const found = await findFlow(kc, realm, flow);

      if (!found) {
        return {
          content: [{ type: "text", text: `Authentication flow "${flow}" not found in realm ${realm}` }],
          isError: true
        };
      }

      const executions = await kc.authenticationManagement.getExecutions({ realm, flow });

      const slim = executions.map(e => ({
        id: e.id,
        level: e.level ?? 0,
        index: e.index ?? 0,
        name: e.displayName ?? e.alias ?? e.providerId,
        providerId: e.providerId ?? null,
        requirement: e.requirement,
        requirementChoices: e.requirementChoices ?? [],
        isSubflow: e.authenticationFlow ?? false,
        flowAlias: e.authenticationFlow ? (e.displayName ?? e.alias ?? null) : null,
        configurable: e.configurable ?? false
      }));

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              { alias: found.alias, description: found.description ?? null, builtIn: found.builtIn ?? false, executions: slim },
              null,
              2
            )
          }
        ]
      };
    }
  );
}
