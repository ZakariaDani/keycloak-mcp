import { getKc } from "@/keycloak.js";
import { findUserId } from "@/tools/lookup.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerUpdateUser(server: McpServer) {
  server.registerTool(
    "update-user",
    {
      description:
        "Update profile fields (email, first/last name, email-verified flag) of an existing " +
        "user, identified by username. Only the fields you supply are changed; omitted fields " +
        "are left untouched. Requires at least one field to update.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        username: z.string().describe("Exact username of the user, e.g. jdoe"),
        email: z.string().email().optional().describe("New email address"),
        firstName: z.string().optional().describe("New first name"),
        lastName: z.string().optional().describe("New last name"),
        emailVerified: z
          .boolean()
          .optional()
          .describe("Mark the email as verified (true) or unverified (false)")
      }
    },
    async ({ realm, username, email, firstName, lastName, emailVerified }) => {
      // Build a payload containing only the fields the caller supplied, so
      // omitted fields are never overwritten.
      const payload = {
        ...(email !== undefined ? { email } : {}),
        ...(firstName !== undefined ? { firstName } : {}),
        ...(lastName !== undefined ? { lastName } : {}),
        ...(emailVerified !== undefined ? { emailVerified } : {})
      };

      if (Object.keys(payload).length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "No fields to update: supply at least one of email, firstName, lastName, emailVerified"
            }
          ],
          isError: true
        };
      }

      const kc = await getKc();
      const userId = await findUserId(kc, realm, username);

      if (!userId) {
        return {
          content: [{ type: "text", text: `User "${username}" not found in realm ${realm}` }],
          isError: true
        };
      }

      await kc.users.update({ realm, id: userId }, payload);

      return {
        content: [{ type: "text", text: JSON.stringify({ username, ...payload }, null, 2) }]
      };
    }
  );
}
