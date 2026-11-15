import { getKc } from "@/keycloak.js";
import { findOrganization, orgNotFound } from "@/tools/org-lookup.js";
import { fail } from "@/tools/result.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerGetOrganization(server: McpServer) {
  server.registerTool(
    "get-organization",
    {
      description:
        "Get one organization (by name or alias) with its description, redirect URL, email " +
        "domains, attributes and linked identity providers. Use list-organization-members for " +
        "its members.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        organization: z.string().describe("Organization name or alias, e.g. acme")
      }
    },
    async ({ realm, organization }) => {
      const kc = await getKc();
      const found = await findOrganization(kc, realm, organization);

      if (!found) return fail(orgNotFound(organization, realm));

      const [org, idps] = await Promise.all([
        kc.organizations.findOne({ realm, id: found.id }),
        kc.organizations.listIdentityProviders({ realm, orgId: found.id })
      ]);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                id: found.id,
                name: org.name,
                alias: org.alias ?? null,
                enabled: org.enabled ?? false,
                description: org.description ?? null,
                redirectUrl: org.redirectUrl ?? null,
                domains: (org.domains ?? []).map(domain => ({ name: domain.name, verified: domain.verified ?? false })),
                attributes: org.attributes ?? {},
                identityProviders: idps.map(idp => idp.alias)
              },
              null,
              2
            )
          }
        ]
      };
    }
  );
}
