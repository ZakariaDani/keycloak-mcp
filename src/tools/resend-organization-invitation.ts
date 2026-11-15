import { getKc } from "@/keycloak.js";
import { findOrganization, orgNotFound } from "@/tools/org-lookup.js";
import { fail } from "@/tools/result.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerResendOrganizationInvitation(server: McpServer) {
  server.registerTool(
    "resend-organization-invitation",
    {
      description:
        "Send an organization invitation (identified by the invited email) again, for example " +
        "after it expired or went missing. Needs SMTP configured on the realm.",
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

      await kc.organizations.resendInvitation({ realm, orgId: found.id, invitationId: invitation.id });

      return {
        content: [{ type: "text", text: JSON.stringify({ organization: found.name, email, resent: true }, null, 2) }]
      };
    }
  );
}
