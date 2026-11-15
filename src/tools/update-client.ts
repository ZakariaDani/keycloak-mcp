import { getKc } from "@/keycloak.js";
import { findClientUuid } from "@/tools/lookup.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerUpdateClient(server: McpServer) {
  server.registerTool(
    "update-client",
    {
      description:
        "Update settings of an existing client (by clientId). Only the fields you supply are " +
        "changed; omitted fields are left untouched. Note redirectUris and webOrigins REPLACE " +
        "the existing lists. Requires at least one field to update.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        clientId: z.string().describe("The client's clientId string, e.g. my-backend"),
        name: z.string().optional().describe("New display name"),
        description: z.string().optional().describe("New description"),
        enabled: z.boolean().optional().describe("Enable or disable the client"),
        publicClient: z.boolean().optional().describe("true for a public client (no secret)"),
        standardFlowEnabled: z.boolean().optional().describe("Enable the authorization code flow"),
        serviceAccountsEnabled: z
          .boolean()
          .optional()
          .describe("Enable the service account (client_credentials) flow"),
        authorizationServicesEnabled: z
          .boolean()
          .optional()
          .describe(
            "Turn authorization services (fine-grained resource permissions) on or off. Needs a " +
              "confidential client; once on, manage it with the authorization-* tools. Turning it off may delete its resources, policies and permissions"
          ),
        redirectUris: z.array(z.string()).optional().describe("Replacement list of valid redirect URIs"),
        webOrigins: z.array(z.string()).optional().describe("Replacement list of allowed CORS origins")
      }
    },
    async ({ realm, clientId, ...fields }) => {
      // Only send the fields the caller supplied so nothing else is overwritten.
      const payload = Object.fromEntries(
        Object.entries(fields).filter(([, value]) => value !== undefined)
      );

      if (Object.keys(payload).length === 0) {
        return {
          content: [{ type: "text", text: "No fields to update: supply at least one field" }],
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

      await kc.clients.update({ realm, id }, payload);

      return {
        content: [{ type: "text", text: JSON.stringify({ clientId, ...payload }, null, 2) }]
      };
    }
  );
}
