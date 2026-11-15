import { getKc } from "@/keycloak.js";
import { findClientUuid } from "@/tools/lookup.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerDeleteProtocolMapper(server: McpServer) {
  server.registerTool(
    "delete-protocol-mapper",
    {
      description:
        "Remove a protocol mapper (by name) from a client. The claims it produced disappear " +
        "from newly issued tokens. Cannot be undone.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        clientId: z.string().describe("The client's clientId string, e.g. my-backend"),
        name: z.string().describe("Name of the mapper to delete")
      }
    },
    async ({ realm, clientId, name }) => {
      const kc = await getKc();
      const id = await findClientUuid(kc, realm, clientId);

      if (!id) {
        return {
          content: [{ type: "text", text: `Client "${clientId}" not found in realm ${realm}` }],
          isError: true
        };
      }

      const mapper = await kc.clients.findProtocolMapperByName({ realm, id, name });

      if (!mapper?.id) {
        return {
          content: [{ type: "text", text: `Protocol mapper "${name}" not found on client "${clientId}"` }],
          isError: true
        };
      }

      await kc.clients.delProtocolMapper({ realm, id, mapperId: mapper.id });

      return {
        content: [{ type: "text", text: JSON.stringify({ clientId, name, deleted: true }, null, 2) }]
      };
    }
  );
}
