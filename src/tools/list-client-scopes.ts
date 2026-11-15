import { getKc } from "@/keycloak.js";
import { findClientUuid } from "@/tools/lookup.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerListClientScopes(server: McpServer) {
  server.registerTool(
    "list-client-scopes",
    {
      description:
        "List client scopes of a realm (id, name, protocol, description). When a clientId is " +
        "supplied, instead list the default and optional scopes assigned to that client.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        clientId: z
          .string()
          .optional()
          .describe("Optional clientId: list the scopes assigned to this client instead")
      }
    },
    async ({ realm, clientId }) => {
      const kc = await getKc();
      const slimScope = (scope: { id?: string; name?: string; protocol?: string; description?: string }) => ({
        id: scope.id,
        name: scope.name,
        protocol: scope.protocol ?? null,
        description: scope.description ?? null
      });

      if (!clientId) {
        const scopes = await kc.clientScopes.find({ realm });
        return { content: [{ type: "text", text: JSON.stringify(scopes.map(slimScope), null, 2) }] };
      }

      const id = await findClientUuid(kc, realm, clientId);

      if (!id) {
        return {
          content: [{ type: "text", text: `Client "${clientId}" not found in realm ${realm}` }],
          isError: true
        };
      }

      const [defaults, optionals] = await Promise.all([
        kc.clients.listDefaultClientScopes({ realm, id }),
        kc.clients.listOptionalClientScopes({ realm, id })
      ]);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              { clientId, default: defaults.map(slimScope), optional: optionals.map(slimScope) },
              null,
              2
            )
          }
        ]
      };
    }
  );
}
