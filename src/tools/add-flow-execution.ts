import { getKc } from "@/keycloak.js";
import { requirementSchema } from "@/tools/auth-flow-lookup.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerAddFlowExecution(server: McpServer) {
  server.registerTool(
    "add-flow-execution",
    {
      description:
        "Add a step to the end of a flow or subflow (by alias). provider is a step type id from " +
        "list-authenticator-providers, e.g. auth-otp-form, auth-cookie, identity-provider-redirector. " +
        "New steps start DISABLED in Keycloak; pass requirement to set it in the same call. " +
        "Only a flow that is a custom copy can be edited, not a built-in.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        flow: z.string().describe("Alias of the flow or subflow to add to"),
        provider: z.string().describe("Step type id, e.g. auth-otp-form"),
        requirement: requirementSchema
          .optional()
          .describe("Requirement to set after adding; omit to leave Keycloak's default (DISABLED)")
      }
    },
    async ({ realm, flow, provider, requirement }) => {
      const kc = await getKc();
      const mgmt = kc.authenticationManagement;

      const created = await mgmt.addExecutionToFlow({ realm, flow, provider });

      if (requirement) {
        const executions = await mgmt.getExecutions({ realm, flow });
        const execution = executions.find(e => e.id === created.id);

        if (!execution) {
          return {
            content: [
              { type: "text", text: `Step added (id ${created.id}) but could not set requirement ${requirement}: not found afterwards` }
            ],
            isError: true
          };
        }

        await mgmt.updateExecution({ realm, flow }, { ...execution, requirement });
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ flow, provider, id: created.id, requirement: requirement ?? "DISABLED" }, null, 2)
          }
        ]
      };
    }
  );
}
