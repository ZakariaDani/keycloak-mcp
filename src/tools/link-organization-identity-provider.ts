import { getKc } from "@/keycloak.js";
import { findOrganization, orgNotFound } from "@/tools/org-lookup.js";
import { fail } from "@/tools/result.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerLinkOrganizationIdentityProvider(server: McpServer) {
  server.registerTool(
    "link-organization-identity-provider",
    {
      description:
        "Link an existing identity provider (by alias, see list-identity-providers) to an " +
        "organization, so its members can sign in through it. An identity provider can belong " +
        "to only one organization. Fails if it is already linked elsewhere.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        organization: z.string().describe("Organization name or alias"),
        alias: z.string().describe("Identity provider alias, e.g. acme-oidc")
      }
    },
    async ({ realm, organization, alias }) => {
      const kc = await getKc();
      const found = await findOrganization(kc, realm, organization);

      if (!found) return fail(orgNotFound(organization, realm));

      if (!(await kc.identityProviders.findOne({ realm, alias }))) {
        return fail(`Identity provider "${alias}" not found in realm ${realm}`);
      }

      await kc.organizations.linkIdp({ realm, orgId: found.id, alias });

      return {
        content: [{ type: "text", text: JSON.stringify({ organization: found.name, alias, linked: true }, null, 2) }]
      };
    }
  );
}
