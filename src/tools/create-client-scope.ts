import { getKc } from "@/keycloak.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerCreateClientScope(server: McpServer) {
  server.registerTool(
    "create-client-scope",
    {
      description:
        "Create a client scope: a reusable bundle of protocol mappers and role scope that can be " +
        "assigned to many clients (see assign-client-scope-to-client). Add mappers afterwards " +
        "with add-client-scope-protocol-mapper. Optional attributes include " +
        "\"include.in.token.scope\", \"display.on.consent.screen\" and \"consent.screen.text\". " +
        "Fails if the name already exists.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        name: z.string().describe("Scope name, e.g. billing"),
        description: z.string().optional().describe("Optional description"),
        protocol: z
          .string()
          .default("openid-connect")
          .describe("Protocol: openid-connect (default) or saml"),
        attributes: z
          .record(z.string(), z.string())
          .optional()
          .describe("Optional attributes, e.g. {\"include.in.token.scope\": \"true\"}")
      }
    },
    async ({ realm, name, description, protocol, attributes }) => {
      const kc = await getKc();

      const created = await kc.clientScopes.create({
        realm,
        name,
        description,
        protocol,
        ...(attributes ? { attributes } : {})
      });

      return {
        content: [{ type: "text", text: JSON.stringify({ id: created.id, name, protocol }, null, 2) }]
      };
    }
  );
}
