import { getKc } from "@/keycloak.js";
import { findClientScope } from "@/tools/lookup.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerDeleteClientScopeProtocolMapper(server: McpServer) {
  server.registerTool(
    "delete-client-scope-protocol-mapper",
    {
      description:
        "Remove a protocol mapper (by name) from a client scope. Every client using the scope " +
        "stops getting that claim in newly issued tokens. Cannot be undone.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        scope: z.string().describe("Client scope name, e.g. billing"),
        name: z.string().describe("Name of the mapper to delete")
      }
    },
    async ({ realm, scope, name }) => {
      const kc = await getKc();
      const clientScope = await findClientScope(kc, realm, scope);

      if (!clientScope?.id) {
        return {
          content: [{ type: "text", text: `Client scope "${scope}" not found in realm ${realm}` }],
          isError: true
        };
      }

      const mappers = await kc.clientScopes.listProtocolMappers({ realm, id: clientScope.id });
      const mapper = mappers.find(m => m.name === name);

      if (!mapper?.id) {
        return {
          content: [{ type: "text", text: `Protocol mapper "${name}" not found on client scope "${scope}"` }],
          isError: true
        };
      }

      await kc.clientScopes.delProtocolMapper({ realm, id: clientScope.id, mapperId: mapper.id });

      return {
        content: [{ type: "text", text: JSON.stringify({ scope, name, deleted: true }, null, 2) }]
      };
    }
  );
}
