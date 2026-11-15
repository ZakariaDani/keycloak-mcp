import { getKc } from "@/keycloak.js";
import { findOrganization, orgNotFound } from "@/tools/org-lookup.js";
import { fail } from "@/tools/result.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerInviteOrganizationUser(server: McpServer) {
  server.registerTool(
    "invite-organization-user",
    {
      description:
        "Email an invitation to join an organization (by name or alias). If a user with that " +
        "email already exists in the realm they are invited as an existing user; otherwise the " +
        "invitation lets them register. Needs SMTP configured on the realm " +
        "(update-realm-smtp). Track it with list-organization-invitations.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        organization: z.string().describe("Organization name or alias"),
        email: z.string().email().describe("Email address to invite"),
        firstName: z.string().optional().describe("First name, for a new user"),
        lastName: z.string().optional().describe("Last name, for a new user")
      }
    },
    async ({ realm, organization, email, firstName, lastName }) => {
      const kc = await getKc();
      const found = await findOrganization(kc, realm, organization);

      if (!found) return fail(orgNotFound(organization, realm));

      const existing = (await kc.users.find({ realm, email, exact: true }))[0];
      const form = new FormData();

      if (existing?.id) {
        form.set("id", existing.id);
        await kc.organizations.inviteExistingUser({ realm, orgId: found.id }, form);
      } else {
        form.set("email", email);
        if (firstName) form.set("firstName", firstName);
        if (lastName) form.set("lastName", lastName);
        await kc.organizations.invite({ realm, orgId: found.id }, form);
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ organization: found.name, email, existingUser: Boolean(existing?.id), invited: true }, null, 2)
          }
        ]
      };
    }
  );
}
