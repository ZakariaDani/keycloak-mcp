import { getKc } from "@/keycloak.js";
import { findClientUuid } from "@/tools/lookup.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerAddProtocolMapper(server: McpServer) {
  server.registerTool(
    "add-protocol-mapper",
    {
      description:
        "Add a protocol mapper to a client (by clientId) to put extra claims in its tokens. " +
        "protocolMapper is the mapper type, e.g. oidc-usermodel-attribute-mapper, " +
        "oidc-usermodel-realm-role-mapper, oidc-audience-mapper, oidc-hardcoded-claim-mapper. " +
        "Typical config for a user-attribute mapper: {\"user.attribute\": \"department\", " +
        "\"claim.name\": \"department\", \"jsonType.label\": \"String\", \"id.token.claim\": \"true\", " +
        "\"access.token.claim\": \"true\"}. Fails if a mapper with that name already exists.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        clientId: z.string().describe("The client's clientId string, e.g. my-backend"),
        name: z.string().describe("Name of the mapper, e.g. department-claim"),
        protocolMapper: z
          .string()
          .describe("Mapper type id, e.g. oidc-usermodel-attribute-mapper"),
        protocol: z
          .string()
          .default("openid-connect")
          .describe("Protocol: openid-connect (default) or saml"),
        config: z
          .record(z.string(), z.string())
          .default({})
          .describe("Mapper settings; keys depend on the mapper type")
      }
    },
    async ({ realm, clientId, name, protocolMapper, protocol, config }) => {
      const kc = await getKc();
      const id = await findClientUuid(kc, realm, clientId);

      if (!id) {
        return {
          content: [{ type: "text", text: `Client "${clientId}" not found in realm ${realm}` }],
          isError: true
        };
      }

      await kc.clients.addProtocolMapper(
        { realm, id },
        { name, protocol, protocolMapper, config }
      );

      return {
        content: [
          { type: "text", text: JSON.stringify({ clientId, name, protocolMapper, created: true }, null, 2) }
        ]
      };
    }
  );
}
