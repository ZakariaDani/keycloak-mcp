import { getKc } from "@/keycloak.js";
import { fail, resolveResourceServer } from "@/tools/authz-lookup.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerExportAuthorizationSettings(server: McpServer) {
  server.registerTool(
    "export-authorization-settings",
    {
      description:
        "Export the complete authorization configuration of a resource server as JSON: " +
        "settings, scopes, resources, policies and permissions, with roles/users/groups " +
        "referenced by name rather than id. The best way to see how everything fits together " +
        "(e.g. which roles a role policy contains) or to back it up. Can be large.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        clientId: z.string().describe("The resource server's clientId string, e.g. my-backend")
      }
    },
    async ({ realm, clientId }) => {
      const kc = await getKc();
      const resolved = await resolveResourceServer(kc, realm, clientId);

      if ("error" in resolved) return fail(resolved.error);

      const exported = await kc.clients.exportResource({ realm, id: resolved.id });

      return {
        content: [{ type: "text", text: JSON.stringify(exported, null, 2) }]
      };
    }
  );
}
