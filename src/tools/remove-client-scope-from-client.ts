import { getKc } from "@/keycloak.js";
import { findClientScope, findClientUuid } from "@/tools/lookup.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerRemoveClientScopeFromClient(server: McpServer) {
  server.registerTool(
    "remove-client-scope-from-client",
    {
      description:
        "Detach a client scope (by name) from a client (by clientId). The scope itself is kept. " +
        "type must match how it was assigned: default or optional (see list-client-scopes with " +
        "a clientId). Idempotent.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        clientId: z.string().describe("The client's clientId string, e.g. my-backend"),
        scope: z.string().describe("Client scope name, e.g. profile"),
        type: z
          .enum(["default", "optional"])
          .describe("Whether the scope is assigned as default or optional")
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
        await kc.clients.delDefaultClientScope(args);
      } else {
        await kc.clients.delOptionalClientScope(args);
      }

      return {
        content: [{ type: "text", text: JSON.stringify({ clientId, scope, type, removed: true }, null, 2) }]
      };
    }
  );
}
