import { getKc } from "@/keycloak.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerCreateUser(server: McpServer) {
  server.registerTool(
    "create-user",
    {
      description:
        "Create a new user in a Keycloak realm. Returns the new user's id. Optionally set an " +
        "initial (non-temporary) password. Fails if the username already exists.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        username: z.string().describe("Username for the new user, e.g. jdoe"),
        email: z.string().email().optional().describe("Email address"),
        firstName: z.string().optional().describe("First name"),
        lastName: z.string().optional().describe("Last name"),
        enabled: z.boolean().default(true).describe("Whether the account is enabled"),
        emailVerified: z.boolean().default(false).describe("Mark the email as already verified"),
        password: z.string().optional().describe("Optional initial password (permanent)")
      }
    },
    async ({ realm, username, email, firstName, lastName, enabled, emailVerified, password }) => {
      const kc = await getKc();

      const created = await kc.users.create({
        realm,
        username,
        email,
        firstName,
        lastName,
        enabled,
        emailVerified,
        ...(password
          ? { credentials: [{ type: "password", value: password, temporary: false }] }
          : {})
      });

      return {
        content: [{ type: "text", text: JSON.stringify({ id: created.id, username }, null, 2) }]
      };
    }
  );
}
