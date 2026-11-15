import { getKc } from "@/keycloak.js";
import { findClientScope } from "@/tools/lookup.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerUpdateClientScope(server: McpServer) {
  server.registerTool(
    "update-client-scope",
    {
      description:
        "Update a client scope (by name): description and/or attributes. attributes entries are " +
        "MERGED into the existing ones. Use delete-client-scope + create-client-scope to rename " +
        "or change protocol. Requires at least one field.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        name: z.string().describe("Current scope name"),
        description: z.string().optional().describe("New description"),
        attributes: z
          .record(z.string(), z.string())
          .optional()
          .describe("Attributes to set or overwrite, e.g. {\"display.on.consent.screen\": \"false\"}")
      }
    },
    async ({ realm, name, description, attributes }) => {
      if (description === undefined && attributes === undefined) {
        return {
          content: [{ type: "text", text: "No fields to update: supply description or attributes" }],
          isError: true
        };
      }

      const kc = await getKc();
      const scope = await findClientScope(kc, realm, name);

      if (!scope?.id) {
        return {
          content: [{ type: "text", text: `Client scope "${name}" not found in realm ${realm}` }],
          isError: true
        };
      }

      // PUT replaces the representation, so carry over the fields we are not changing.
      // Mappers are managed through their own tools and are not part of this payload.
      const merged = { ...scope.attributes, ...attributes };

      await kc.clientScopes.update(
        { realm, id: scope.id },
        {
          name: scope.name,
          protocol: scope.protocol,
          description: description !== undefined ? description : scope.description,
          attributes: merged
        }
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              { name, description: description ?? scope.description ?? null, attributes: merged },
              null,
              2
            )
          }
        ]
      };
    }
  );
}
