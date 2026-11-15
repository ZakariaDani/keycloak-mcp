import { getKc } from "@/keycloak.js";
import { findOrganization, orgNotFound } from "@/tools/org-lookup.js";
import { fail } from "@/tools/result.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerDeleteOrganizationInvitation(server: McpServer) {
  server.registerTool(
    "delete-organization-invitation",
    {
      description:
        "Cancel an organization invitation (identified by the invited email) so its link no " +
        "longer works. Does not affect anyone who already accepted it. Cannot be undone.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        organization: z.string().describe("Organization name or alias"),
        email: z.string().describe("Email the invitation was sent to")
      }
    },
    async ({ realm, organization, email }) => {
      const kc = await getKc();
      const found = await findOrganization(kc, realm, organization);

      if (!found) return fail(orgNotFound(organization, realm));

      const invitations = await kc.organizations.listInvitations({ realm, orgId: found.id, email });
      const invitation = invitations.find(item => item.email?.toLowerCase() === email.toLowerCase());

      if (!invitation?.id) return fail(`No invitation for "${email}" found in organization "${found.name}"`);

      await kc.organizations.deleteInvitation({ realm, orgId: found.id, invitationId: invitation.id });

      return {
        content: [{ type: "text", text: JSON.stringify({ organization: found.name, email, deleted: true }, null, 2) }]
      };
    }
  );
}
