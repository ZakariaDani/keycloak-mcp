import { getKc } from "@/keycloak.js";
import { requirementSchema, resolveExecution } from "@/tools/auth-flow-lookup.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerUpdateFlowExecution(server: McpServer) {
  server.registerTool(
    "update-flow-execution",
    {
      description:
        "Change the requirement of a step in a flow (by alias): REQUIRED, ALTERNATIVE, " +
        "CONDITIONAL or DISABLED. Identify the step by id, or by provider id / display name when " +
        "that is unambiguous (see get-authentication-flow). Each step only accepts the values " +
        "listed in its requirementChoices. Careful: disabling a core step on the flow bound to " +
        "browser login can lock users out.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        flow: z.string().describe("Alias of the flow or subflow containing the step"),
        execution: z.string().describe("Step id, provider id (e.g. auth-otp-form) or display name"),
        requirement: requirementSchema.describe("New requirement")
      }
    },
    async ({ realm, flow, execution, requirement }) => {
      const kc = await getKc();
      const resolved = await resolveExecution(kc, realm, flow, execution);

      if ("error" in resolved) {
        return { content: [{ type: "text", text: resolved.error }], isError: true };
      }

      await kc.authenticationManagement.updateExecution({ realm, flow }, { ...resolved.execution, requirement });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                flow,
                id: resolved.execution.id,
                name: resolved.execution.displayName ?? resolved.execution.providerId,
                from: resolved.execution.requirement,
                requirement
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
