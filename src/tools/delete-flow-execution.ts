import { getKc } from "@/keycloak.js";
import { resolveExecution } from "@/tools/auth-flow-lookup.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerDeleteFlowExecution(server: McpServer) {
  server.registerTool(
    "delete-flow-execution",
    {
      description:
        "Remove a step from a flow (by alias). Identify it by id, or by provider id / display " +
        "name when unambiguous (see get-authentication-flow). Deleting a subflow step also " +
        "deletes the subflow and everything inside it. Cannot be undone.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        flow: z.string().describe("Alias of the flow or subflow containing the step"),
        execution: z.string().describe("Step id, provider id (e.g. auth-otp-form) or display name")
      }
    },
    async ({ realm, flow, execution }) => {
      const kc = await getKc();
      const resolved = await resolveExecution(kc, realm, flow, execution);

      if ("error" in resolved) {
        return { content: [{ type: "text", text: resolved.error }], isError: true };
      }

      await kc.authenticationManagement.delExecution({ realm, id: resolved.execution.id });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                flow,
                id: resolved.execution.id,
                name: resolved.execution.displayName ?? resolved.execution.providerId,
                deleted: true
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
