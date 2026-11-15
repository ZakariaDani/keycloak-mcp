import { getKc } from "@/keycloak.js";
import { findOrganization, orgNotFound } from "@/tools/org-lookup.js";
import { fail } from "@/tools/result.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerListOrganizationMembers(server: McpServer) {
  server.registerTool(
    "list-organization-members",
    {
      description:
        "List the members of an organization (by name or alias): id, username, email, enabled " +
        "and membership type. MANAGED members were created through the organization; " +
        "UNMANAGED are existing users who joined it. Search and pagination supported.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        organization: z.string().describe("Organization name or alias"),
        search: z.string().optional().describe("Match on username, email or name"),
        membershipType: z.enum(["MANAGED", "UNMANAGED"]).optional().describe("Only this membership type"),
        first: z.number().int().min(0).default(0).describe("Pagination offset"),
        max: z.number().int().min(1).max(200).default(50).describe("Page size")
      }
    },
    async ({ realm, organization, search, membershipType, first, max }) => {
      const kc = await getKc();
      const found = await findOrganization(kc, realm, organization);

      if (!found) return fail(orgNotFound(organization, realm));

      const members = await kc.organizations.listMembers({
        realm,
        orgId: found.id,
        search,
        membershipType,
        first,
        max
      });

      const slim = members.map(member => ({
        id: member.id,
        username: member.username,
        email: member.email ?? null,
        enabled: member.enabled,
        membershipType: "membershipType" in member ? (member.membershipType ?? null) : null
      }));

      return {
        content: [{ type: "text", text: JSON.stringify(slim, null, 2) }]
      };
    }
  );
}
