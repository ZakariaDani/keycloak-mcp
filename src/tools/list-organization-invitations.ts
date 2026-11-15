import { getKc } from "@/keycloak.js";
import { findOrganization, orgNotFound } from "@/tools/org-lookup.js";
import { fail } from "@/tools/result.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerListOrganizationInvitations(server: McpServer) {
  server.registerTool(
    "list-organization-invitations",
    {
      description:
        "List the invitations of an organization (by name or alias): email, name, status " +
        "(PENDING or EXPIRED) and when each was sent and expires. Invite links are not returned.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        organization: z.string().describe("Organization name or alias"),
        status: z.enum(["PENDING", "EXPIRED"]).optional().describe("Only this status"),
        email: z.string().optional().describe("Filter on email"),
        first: z.number().int().min(0).default(0).describe("Pagination offset"),
        max: z.number().int().min(1).max(200).default(50).describe("Page size")
      }
    },
    async ({ realm, organization, status, email, first, max }) => {
      const kc = await getKc();
      const found = await findOrganization(kc, realm, organization);

      if (!found) return fail(orgNotFound(organization, realm));

      const invitations = await kc.organizations.listInvitations({
        realm,
        orgId: found.id,
        status,
        email,
        first,
        max
      });

      // Keycloak reports these as seconds since the epoch.
      const iso = (seconds: number | undefined) => (seconds ? new Date(seconds * 1000).toISOString() : null);

      const slim = invitations.map(invitation => ({
        id: invitation.id,
        email: invitation.email,
        firstName: invitation.firstName ?? null,
        lastName: invitation.lastName ?? null,
        status: invitation.status ?? null,
        sent: iso(invitation.sentDate),
        expires: iso(invitation.expiresAt)
      }));

      return {
        content: [{ type: "text", text: JSON.stringify(slim, null, 2) }]
      };
    }
  );
}
