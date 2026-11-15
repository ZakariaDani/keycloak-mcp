import { getKc } from "@/keycloak.js";
import { findOrganization, orgNotFound } from "@/tools/org-lookup.js";
import { fail } from "@/tools/result.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerDeleteOrganization(server: McpServer) {
  server.registerTool(
    "delete-organization",
    {
      description:
        "Delete an organization (by name or alias) with its memberships, invitations and " +
        "identity-provider links. Users who merely joined keep their accounts, but users the " +
        "organization manages (created through it) may be deleted with it. Cannot be undone; to " +
        "suspend instead, use update-organization with enabled=false.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        organization: z.string().describe("Organization name or alias")
      }
    },
    async ({ realm, organization }) => {
      const kc = await getKc();
      const found = await findOrganization(kc, realm, organization);

      if (!found) return fail(orgNotFound(organization, realm));

      await kc.organizations.delById({ realm, id: found.id });

      return {
        content: [{ type: "text", text: JSON.stringify({ organization: found.name, deleted: true }, null, 2) }]
      };
    }
  );
}
