import { getKc } from "@/keycloak.js";
import { findClientUuid } from "@/tools/lookup.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerUpdateProtocolMapper(server: McpServer) {
  server.registerTool(
    "update-protocol-mapper",
    {
      description:
        "Change the config of a protocol mapper on a client (mapper looked up by name). config " +
        "entries are MERGED into the existing config; other keys are kept. The mapper's name " +
        "and type cannot be changed: delete and re-add it for that.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        clientId: z.string().describe("The client's clientId string, e.g. my-backend"),
        name: z.string().describe("Name of the existing mapper"),
        config: z
          .record(z.string(), z.string())
          .describe("Config keys to set or overwrite, e.g. {\"claim.name\": \"dept\"}")
      }
    },
    async ({ realm, clientId, name, config }) => {
      if (Object.keys(config).length === 0) {
        return {
          content: [{ type: "text", text: "No fields to update: supply at least one config entry" }],
          isError: true
        };
      }

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

      const merged = { ...mapper.config, ...config };

      await kc.clients.updateProtocolMapper({ realm, id, mapperId: mapper.id }, { ...mapper, config: merged });

      return {
        content: [{ type: "text", text: JSON.stringify({ clientId, name, config: merged }, null, 2) }]
      };
    }
  );
}
