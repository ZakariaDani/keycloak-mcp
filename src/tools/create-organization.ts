import { getKc } from "@/keycloak.js";
import { findOrganization, organizationsUnavailable } from "@/tools/org-lookup.js";
import { fail } from "@/tools/result.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerCreateOrganization(server: McpServer) {
  server.registerTool(
    "create-organization",
    {
      description:
        "Create an organization: a customer/tenant grouping of users with its own email " +
        "domains and optionally its own identity providers. Add people with " +
        "add-organization-member or invite-organization-user. alias defaults to the name. " +
        "Needs the Organizations feature enabled in the realm. Fails if the name or alias exists.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        name: z.string().describe("Organization name, e.g. Acme Corp"),
        alias: z.string().optional().describe("URL-safe unique alias, e.g. acme (defaults to the name)"),
        description: z.string().optional().describe("Optional description"),
        domains: z
          .array(z.string())
          .optional()
          .describe("Email domains belonging to the organization, e.g. [\"acme.com\"]"),
        redirectUrl: z.string().optional().describe("URL to send members to after they join or log in"),
        enabled: z.boolean().default(true).describe("Enable the organization immediately"),
        attributes: z.record(z.string(), z.string()).optional().describe("Optional custom attributes")
      }
    },
    async ({ realm, name, alias, description, domains, redirectUrl, enabled, attributes }) => {
      const kc = await getKc();

      const unavailable = await organizationsUnavailable(kc, realm);
      if (unavailable) return fail(unavailable);

      if (await findOrganization(kc, realm, alias ?? name)) {
        return fail(`An organization named or aliased "${alias ?? name}" already exists in realm ${realm}`);
      }

      const created = await kc.organizations.create({
        realm,
        name,
        description,
        redirectUrl,
        enabled,
        ...(alias ? { alias } : {}),
        ...(domains ? { domains: domains.map(domain => ({ name: domain })) } : {}),
        ...(attributes
          ? { attributes: Object.fromEntries(Object.entries(attributes).map(([key, value]) => [key, [value]])) }
          : {})
      });

      return {
        content: [{ type: "text", text: JSON.stringify({ id: created.id, name, created: true }, null, 2) }]
      };
    }
  );
}
