import { getKc } from "@/keycloak.js";
import { findClientUuid } from "@/tools/lookup.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerListProtocolMappers(server: McpServer) {
  server.registerTool(
    "list-protocol-mappers",
    {
      description:
        "List the protocol mappers defined directly on a client (by clientId): name, mapper " +
        "type and config. These control which claims end up in its tokens.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        clientId: z.string().describe("The client's clientId string, e.g. my-backend")
      }
    },
    async ({ realm, clientId }) => {
      const kc = await getKc();
      const id = await findClientUuid(kc, realm, clientId);

      if (!id) {
        return {
          content: [{ type: "text", text: `Client "${clientId}" not found in realm ${realm}` }],
          isError: true
        };
      }

      const mappers = await kc.clients.listProtocolMappers({ realm, id });

      const slim = mappers.map(mapper => ({
        id: mapper.id,
        name: mapper.name,
        protocol: mapper.protocol ?? null,
        protocolMapper: mapper.protocolMapper,
        config: mapper.config ?? {}
      }));

      return {
        content: [{ type: "text", text: JSON.stringify(slim, null, 2) }]
      };
    }
  );
}
