import { getKc } from "@/keycloak.js";
import { findClientScope } from "@/tools/lookup.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerAddClientScopeProtocolMapper(server: McpServer) {
  server.registerTool(
    "add-client-scope-protocol-mapper",
    {
      description:
        "Add a protocol mapper to a client scope (by name), so every client using the scope " +
        "gets the claim. protocolMapper is the mapper type, e.g. oidc-usermodel-attribute-mapper, " +
        "oidc-audience-mapper, oidc-hardcoded-claim-mapper. Typical config for a user-attribute " +
        "mapper: {\"user.attribute\": \"department\", \"claim.name\": \"department\", " +
        "\"jsonType.label\": \"String\", \"id.token.claim\": \"true\", \"access.token.claim\": \"true\"}. " +
        "Fails if the scope already has a mapper with that name.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        scope: z.string().describe("Client scope name, e.g. billing"),
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
    async ({ realm, scope, name, protocolMapper, protocol, config }) => {
      const kc = await getKc();
      const clientScope = await findClientScope(kc, realm, scope);

      if (!clientScope?.id) {
        return {
          content: [{ type: "text", text: `Client scope "${scope}" not found in realm ${realm}` }],
          isError: true
        };
      }

      await kc.clientScopes.addProtocolMapper(
        { realm, id: clientScope.id },
        { name, protocol, protocolMapper, config }
      );

      return {
        content: [
          { type: "text", text: JSON.stringify({ scope, name, protocolMapper, created: true }, null, 2) }
        ]
      };
    }
  );
}
