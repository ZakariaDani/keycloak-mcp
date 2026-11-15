import { getKc } from "@/keycloak.js";
import { findClientScope } from "@/tools/lookup.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerGetClientScope(server: McpServer) {
  server.registerTool(
    "get-client-scope",
    {
      description:
        "Get one client scope by name: protocol, description, attributes and its protocol " +
        "mappers (the claims the scope adds to tokens).",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        name: z.string().describe("Client scope name, e.g. profile or my-scope")
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

      const mappers = await kc.clientScopes.listProtocolMappers({ realm, id: scope.id });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                id: scope.id,
                name: scope.name,
                protocol: scope.protocol ?? null,
                description: scope.description ?? null,
                attributes: scope.attributes ?? {},
                protocolMappers: mappers.map(mapper => ({
                  id: mapper.id,
                  name: mapper.name,
                  protocolMapper: mapper.protocolMapper,
                  config: mapper.config ?? {}
                }))
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
