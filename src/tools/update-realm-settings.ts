import { getKc } from "@/keycloak.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerUpdateRealmSettings(server: McpServer) {
  server.registerTool(
    "update-realm-settings",
    {
      description:
        "Update general realm settings: login options, security, brute-force protection, " +
        "password policy, token/session lifespans (in seconds), locale and theme. Only the " +
        "fields you supply change. Use update-realm-smtp for email, update-realm-events-config " +
        "for event storage and set-realm-enabled to enable/disable. Requires at least one field. " +
        "Careful: sslRequired and passwordPolicy affect every user of the realm.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        displayName: z.string().optional().describe("Human-readable realm name"),
        registrationAllowed: z.boolean().optional().describe("Let users self-register"),
        registrationEmailAsUsername: z.boolean().optional().describe("Use the email as the username"),
        loginWithEmailAllowed: z.boolean().optional().describe("Allow signing in with email"),
        duplicateEmailsAllowed: z.boolean().optional().describe("Allow several users to share an email"),
        resetPasswordAllowed: z.boolean().optional().describe("Show the 'forgot password' link"),
        rememberMe: z.boolean().optional().describe("Show the 'remember me' checkbox"),
        verifyEmail: z.boolean().optional().describe("Require users to verify their email"),
        editUsernameAllowed: z.boolean().optional().describe("Let users change their username"),
        sslRequired: z
          .enum(["all", "external", "none"])
          .optional()
          .describe("Require HTTPS for: all requests, external (non-private) requests, or none"),
        bruteForceProtected: z.boolean().optional().describe("Temporarily lock accounts after repeated failed logins"),
        failureFactor: z.number().int().min(1).optional().describe("Failed logins before a lockout"),
        passwordPolicy: z
          .string()
          .optional()
          .describe("Policy string, e.g. \"length(12) and digits(1) and notUsername\". Empty string clears it"),
        accessTokenLifespan: z.number().int().min(1).optional().describe("Access token lifespan, seconds"),
        ssoSessionIdleTimeout: z.number().int().min(1).optional().describe("SSO session idle timeout, seconds"),
        ssoSessionMaxLifespan: z.number().int().min(1).optional().describe("SSO session max lifespan, seconds"),
        internationalizationEnabled: z.boolean().optional().describe("Enable multiple languages"),
        defaultLocale: z.string().optional().describe("Default locale, e.g. en or fr"),
        supportedLocales: z.array(z.string()).optional().describe("Supported locales, e.g. [\"en\", \"fr\"]"),
        loginTheme: z.string().optional().describe("Login theme name, e.g. keycloak")
      }
    },
    async ({ realm, ...fields }) => {
      // Keycloak applies only the fields present in the PUT body, so send just what was supplied.
      const payload = Object.fromEntries(
        Object.entries(fields).filter(([, value]) => value !== undefined)
      );

      if (Object.keys(payload).length === 0) {
        return {
          content: [{ type: "text", text: "No fields to update: supply at least one setting" }],
          isError: true
        };
      }

      const kc = await getKc();

      if (!(await kc.realms.findOne({ realm }))) {
        return {
          content: [{ type: "text", text: `Realm "${realm}" not found` }],
          isError: true
        };
      }

      await kc.realms.update({ realm }, { realm, ...payload });

      return {
        content: [{ type: "text", text: JSON.stringify({ realm, updated: payload }, null, 2) }]
      };
    }
  );
}
