import { getKc } from "@/keycloak.js";
import { findClientScope } from "@/tools/lookup.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerDeleteClientScope(server: McpServer) {
  server.registerTool(
    "delete-client-scope",
    {
      description:
        "Delete a client scope (by name) from a realm, with its mappers. It is detached from " +
        "every client that used it, so their tokens lose the claims it provided. Cannot be undone.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        name: z.string().describe("Client scope name to delete")
      }
    },
    async ({ realm, name }) => {
      const kc = await getKc();
      const scope = await findClientScope(kc, realm, name);

      if (!scope?.id) {
        return {
          content: [{ type: "text", text: `Client scope "${name}" not found in realm ${realm}` }],
          isError: true
        };
      }

      await kc.clientScopes.del({ realm, id: scope.id });

      return {
        content: [{ type: "text", text: JSON.stringify({ name, deleted: true }, null, 2) }]
      };
    }
  );
}
