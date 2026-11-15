import { getKc } from "@/keycloak.js";
import { findUserId } from "@/tools/lookup.js";
import { findOrganization, orgNotFound } from "@/tools/org-lookup.js";
import { fail } from "@/tools/result.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerAddOrganizationMember(server: McpServer) {
  server.registerTool(
    "add-organization-member",
    {
      description:
        "Add an existing user (by username) to an organization (by name or alias) as an " +
        "unmanaged member. To bring in someone without an account, or to let them accept " +
        "first, use invite-organization-user instead. Fails if they are already a member.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        organization: z.string().describe("Organization name or alias"),
        username: z.string().describe("Exact username of the user, e.g. jdoe")
      }
    },
    async ({ realm, organization, username }) => {
      const kc = await getKc();
      const found = await findOrganization(kc, realm, organization);

      if (!found) return fail(orgNotFound(organization, realm));

      const userId = await findUserId(kc, realm, username);
      if (!userId) return fail(`User "${username}" not found in realm ${realm}`);

      await kc.organizations.addMember({ realm, orgId: found.id, userId });

      return {
        content: [{ type: "text", text: JSON.stringify({ organization: found.name, username, added: true }, null, 2) }]
      };
    }
  );
}
