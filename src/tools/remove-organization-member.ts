import { getKc } from "@/keycloak.js";
import { findUserId } from "@/tools/lookup.js";
import { findOrganization, orgNotFound } from "@/tools/org-lookup.js";
import { fail } from "@/tools/result.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerRemoveOrganizationMember(server: McpServer) {
  server.registerTool(
    "remove-organization-member",
    {
      description:
        "Remove a user (by username) from an organization (by name or alias). Their account is " +
        "kept, but a MANAGED member (created through the organization) may be deleted along " +
        "with the membership. Check list-organization-members for the membership type first.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        organization: z.string().describe("Organization name or alias"),
        username: z.string().describe("Exact username of the member")
      }
    },
    async ({ realm, organization, username }) => {
      const kc = await getKc();
      const found = await findOrganization(kc, realm, organization);

      if (!found) return fail(orgNotFound(organization, realm));

      const userId = await findUserId(kc, realm, username);
      if (!userId) return fail(`User "${username}" not found in realm ${realm}`);

      await kc.organizations.delMember({ realm, orgId: found.id, userId });

      return {
        content: [{ type: "text", text: JSON.stringify({ organization: found.name, username, removed: true }, null, 2) }]
      };
    }
  );
}
