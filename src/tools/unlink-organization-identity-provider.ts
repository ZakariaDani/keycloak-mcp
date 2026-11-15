import { getKc } from "@/keycloak.js";
import { findOrganization, orgNotFound } from "@/tools/org-lookup.js";
import { fail } from "@/tools/result.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerUnlinkOrganizationIdentityProvider(server: McpServer) {
  server.registerTool(
    "unlink-organization-identity-provider",
    {
      description:
        "Detach an identity provider (by alias) from an organization. The provider itself is " +
        "kept in the realm; members of the organization can no longer use it through the " +
        "organization.",
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

      await kc.organizations.unLinkIdp({ realm, orgId: found.id, alias });

      return {
        content: [{ type: "text", text: JSON.stringify({ organization: found.name, alias, unlinked: true }, null, 2) }]
      };
    }
  );
}
