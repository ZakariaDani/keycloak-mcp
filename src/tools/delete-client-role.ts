import { getKc } from "@/keycloak.js";
import { findClientUuid } from "@/tools/lookup.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerDeleteClientRole(server: McpServer) {
  server.registerTool(
    "delete-client-role",
    {
      description:
        "Delete a role owned by a client (by clientId and role name). It is also removed from " +
        "every user, group and composite role that had it. Cannot be undone.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        clientId: z.string().describe("The client's clientId string, e.g. my-backend"),
        name: z.string().describe("Name of the client role to delete")
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

      const role = await kc.clients.findRole({ realm, id, roleName: name });

      if (!role) {
        return {
          content: [{ type: "text", text: `Role "${name}" not found on client "${clientId}"` }],
          isError: true
        };
      }

      await kc.clients.delRole({ realm, id, roleName: name });

      return {
        content: [{ type: "text", text: JSON.stringify({ clientId, name, deleted: true }, null, 2) }]
      };
    }
  );
}
