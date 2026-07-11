import { getKc } from "@/keycloak.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerGetUser(server: McpServer) {
  server.registerTool(
    "get-user",
    {
      description:
        "Get a single Keycloak user by username, including profile fields, attributes and " +
        "enabled/email-verified status. Optionally include the user's group memberships " +
        "and effective realm role mappings.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        username: z.string().describe("Exact username of the user, e.g. jdoe"),
        includeGroups: z
          .boolean()
          .default(false)
          .describe("Include the user's group memberships"),
        includeRealmRoles: z
          .boolean()
          .default(false)
          .describe("Include the user's realm role mappings")
      }
    },
    async ({ realm, username, includeGroups, includeRealmRoles }) => {
      const kc = await getKc();
      const matches = await kc.users.find({ realm, username, exact: true });
      const user = matches[0];

      if (!user?.id) {
        return {
          content: [{ type: "text", text: `User "${username}" not found in realm ${realm}` }],
          isError: true
        };
      }

      const userId = user.id;

      const slim: Record<string, unknown> = {
        id: user.id,
        username: user.username,
        email: user.email,
        emailVerified: user.emailVerified ?? false,
        firstName: user.firstName ?? null,
        lastName: user.lastName ?? null,
        enabled: user.enabled,
        federationLink: user.federationLink ?? null,
        attributes: user.attributes ?? {},
        createdAt: user.createdTimestamp ? new Date(user.createdTimestamp).toISOString() : null
      };

      if (includeGroups) {
        const groups = await kc.users.listGroups({ realm, id: userId });
        slim.groups = groups.map(group => ({ id: group.id, name: group.name, path: group.path }));
      }

      if (includeRealmRoles) {
        const roles = await kc.users.listRealmRoleMappings({ realm, id: userId });
        slim.realmRoles = roles.map(role => ({ id: role.id, name: role.name }));
      }

      return {
        content: [{ type: "text", text: JSON.stringify(slim, null, 2) }]
      };
    }
  );
}
