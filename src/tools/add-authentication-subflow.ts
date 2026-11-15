import { getKc } from "@/keycloak.js";
import { requirementSchema } from "@/tools/auth-flow-lookup.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerAddAuthenticationSubflow(server: McpServer) {
  server.registerTool(
    "add-authentication-subflow",
    {
      description:
        "Add a nested subflow to a flow (by alias) to group steps, e.g. an ALTERNATIVE subflow " +
        "holding password + OTP. type basic-flow groups ordinary steps; form-flow is for " +
        "registration forms. The subflow's alias must be unique in the realm. Add steps into it " +
        "afterwards with add-flow-execution using the subflow's alias as `flow`.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        flow: z.string().describe("Alias of the parent flow or subflow"),
        alias: z.string().describe("Unique alias for the new subflow, e.g. browser-otp-forms"),
        type: z.enum(["basic-flow", "form-flow"]).default("basic-flow").describe("Subflow type"),
        description: z.string().default("").describe("Optional description"),
        requirement: requirementSchema
          .optional()
          .describe("Requirement to set on the subflow after adding; omit for Keycloak's default (DISABLED)")
      }
    },
    async ({ realm, flow, alias, type, description, requirement }) => {
      const kc = await getKc();
      const mgmt = kc.authenticationManagement;

      // Form subflows need a form provider; registration-page-form is the built-in one.
      const created = await mgmt.addFlowToFlow({
        realm,
        flow,
        alias,
        type,
        provider: type === "form-flow" ? "registration-page-form" : "basic-flow",
        description
      });

      if (requirement) {
        const executions = await mgmt.getExecutions({ realm, flow });
        const execution = executions.find(e => e.flowId === created.id);

        if (!execution) {
          return {
            content: [
              { type: "text", text: `Subflow "${alias}" added but could not set requirement ${requirement}: not found afterwards` }
            ],
            isError: true
          };
        }

        await mgmt.updateExecution({ realm, flow }, { ...execution, requirement });
      }

      return {
        content: [
          { type: "text", text: JSON.stringify({ flow, alias, type, requirement: requirement ?? "DISABLED" }, null, 2) }
        ]
      };
    }
  );
}
