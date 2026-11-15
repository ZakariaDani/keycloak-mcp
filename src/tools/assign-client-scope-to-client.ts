import { getKc } from "@/keycloak.js";
import { findClientScope, findClientUuid } from "@/tools/lookup.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerAssignClientScopeToClient(server: McpServer) {
  server.registerTool(
    "assign-client-scope-to-client",
    {
      description:
        "Assign a client scope (by name) to a client (by clientId). A default scope is always " +
        "applied to the client's tokens; an optional scope only when the client requests it via " +
        "the scope parameter. Idempotent.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        clientId: z.string().describe("The client's clientId string, e.g. my-backend"),
        scope: z.string().describe("Client scope name, e.g. profile"),
        type: z
          .enum(["default", "optional"])
          .default("default")
          .describe("Assign as a default (always applied) or optional scope")
      }
    },
    async ({ realm, clientId, scope, type }) => {
      const kc = await getKc();
      const id = await findClientUuid(kc, realm, clientId);

      if (!id) {
        return {
          content: [{ type: "text", text: `Client "${clientId}" not found in realm ${realm}` }],
          isError: true
        };
      }

      const clientScope = await findClientScope(kc, realm, scope);

      if (!clientScope?.id) {
        return {
          content: [{ type: "text", text: `Client scope "${scope}" not found in realm ${realm}` }],
          isError: true
        };
      }

      const args = { realm, id, clientScopeId: clientScope.id };

      if (type === "default") {
        await kc.clients.addDefaultClientScope(args);
      } else {
        await kc.clients.addOptionalClientScope(args);
      }

      return {
        content: [{ type: "text", text: JSON.stringify({ clientId, scope, type, assigned: true }, null, 2) }]
      };
    }
  );
}
