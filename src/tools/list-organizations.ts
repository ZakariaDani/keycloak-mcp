import { getKc } from "@/keycloak.js";
import { organizationsUnavailable } from "@/tools/org-lookup.js";
import { fail } from "@/tools/result.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerListOrganizations(server: McpServer) {
  server.registerTool(
    "list-organizations",
    {
      description:
        "List the organizations of a realm (the B2B 'customer' or 'tenant' groupings of users): " +
        "name, alias, enabled flag and email domains. search matches an organization name or " +
        "domain. Needs the Organizations feature enabled in the realm.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        search: z.string().optional().describe("Organization name or domain to search for"),
        first: z.number().int().min(0).default(0).describe("Pagination offset"),
        max: z.number().int().min(1).max(200).default(50).describe("Page size")
      }
    },
    async ({ realm, search, first, max }) => {
      const kc = await getKc();

      const unavailable = await organizationsUnavailable(kc, realm);
      if (unavailable) return fail(unavailable);

      const orgs = await kc.organizations.find({ realm, search, first, max });

      const slim = orgs.map(org => ({
        id: org.id,
        name: org.name,
        alias: org.alias ?? null,
        enabled: org.enabled ?? false,
        description: org.description ?? null,
        domains: (org.domains ?? []).map(domain => ({ name: domain.name, verified: domain.verified ?? false }))
      }));

      return {
        content: [{ type: "text", text: JSON.stringify(slim, null, 2) }]
      };
    }
  );
}
