import { getKc } from "@/keycloak.js";
import { findUserId } from "@/tools/lookup.js";
import { fail } from "@/tools/result.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerListUserOrganizations(server: McpServer) {
  server.registerTool(
    "list-user-organizations",
    {
      description: "List the organizations a user (by username) belongs to: name, alias and enabled flag.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        username: z.string().describe("Exact username of the user, e.g. jdoe")
      }
    },
    async ({ realm, username }) => {
      const kc = await getKc();
      const userId = await findUserId(kc, realm, username);

      if (!userId) return fail(`User "${username}" not found in realm ${realm}`);

      const orgs = await kc.organizations.memberOrganizations({ realm, userId });

      const slim = orgs.map(org => ({
        id: org.id,
        name: org.name,
        alias: org.alias ?? null,
        enabled: org.enabled ?? false
      }));

      return {
        content: [{ type: "text", text: JSON.stringify(slim, null, 2) }]
      };
    }
  );
}
