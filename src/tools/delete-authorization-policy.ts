import { getKc } from "@/keycloak.js";
import { fail, findAuthzPolicy, resolveResourceServer } from "@/tools/authz-lookup.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerDeleteAuthorizationPolicy(server: McpServer) {
  server.registerTool(
    "delete-authorization-policy",
    {
      description:
        "Delete a policy (by name) from a resource server. Permissions that used it lose that " +
        "policy, which can silently widen or narrow access: with enforcing mode and no policy " +
        "left, a permission denies everyone. Check what depends on it first with " +
        "export-authorization-settings. Cannot be undone.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        clientId: z.string().describe("The resource server's clientId string, e.g. my-backend"),
        name: z.string().describe("Policy name to delete")
      }
    },
    async ({ realm, clientId, name }) => {
      const kc = await getKc();
      const resolved = await resolveResourceServer(kc, realm, clientId);

      if ("error" in resolved) return fail(resolved.error);

      const policy = await findAuthzPolicy(kc, realm, resolved.id, name);
      if (!policy?.id) return fail(`Authorization policy "${name}" not found on client "${clientId}"`);

      await kc.clients.delPolicy({ realm, id: resolved.id, policyId: policy.id });

      return {
        content: [{ type: "text", text: JSON.stringify({ clientId, name, deleted: true }, null, 2) }]
      };
    }
  );
}
