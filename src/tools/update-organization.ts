import { getKc } from "@/keycloak.js";
import { findOrganization, orgNotFound } from "@/tools/org-lookup.js";
import { fail } from "@/tools/result.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerUpdateOrganization(server: McpServer) {
  server.registerTool(
    "update-organization",
    {
      description:
        "Update an organization (by name or alias). Only supplied fields change. domains " +
        "REPLACES the existing list (send every domain you want to keep); attributes entries " +
        "are MERGED into the existing ones. Use enabled=false to suspend an organization " +
        "without deleting it. Requires at least one field.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        organization: z.string().describe("Current organization name or alias"),
        newName: z.string().optional().describe("New name"),
        alias: z.string().optional().describe("New alias"),
        description: z.string().optional().describe("New description"),
        redirectUrl: z.string().optional().describe("New redirect URL"),
        enabled: z.boolean().optional().describe("Enable or disable the organization"),
        domains: z.array(z.string()).optional().describe("Replacement list of email domains"),
        attributes: z.record(z.string(), z.string()).optional().describe("Attributes to set or overwrite")
      }
    },
    async ({ realm, organization, newName, alias, description, redirectUrl, enabled, domains, attributes }) => {
      if (
        [newName, alias, description, redirectUrl, enabled, domains, attributes].every(value => value === undefined)
      ) {
        return fail("No fields to update: supply at least one field");
      }

      const kc = await getKc();
      const found = await findOrganization(kc, realm, organization);

      if (!found) return fail(orgNotFound(organization, realm));

      const existing = await kc.organizations.findOne({ realm, id: found.id });

      // PUT replaces the representation, so start from the existing organization.
      // Members and identity providers have their own tools and are not part of the payload.
      const updated = {
        id: found.id,
        name: newName ?? existing.name,
        alias: alias ?? existing.alias,
        description: description ?? existing.description,
        redirectUrl: redirectUrl ?? existing.redirectUrl,
        enabled: enabled ?? existing.enabled,
        domains: domains ? domains.map(domain => ({ name: domain })) : existing.domains,
        attributes: {
          ...existing.attributes,
          ...Object.fromEntries(Object.entries(attributes ?? {}).map(([key, value]) => [key, [value]]))
        }
      };

      await kc.organizations.updateById({ realm, id: found.id }, updated);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                name: updated.name,
                alias: updated.alias ?? null,
                enabled: updated.enabled ?? false,
                domains: (updated.domains ?? []).map(domain => domain.name)
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
