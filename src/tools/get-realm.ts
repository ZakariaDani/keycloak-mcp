import { getKc } from "@/keycloak.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerGetRealm(server: McpServer) {
  server.registerTool(
    "get-realm",
    {
      description:
        "Get a realm's key settings: enabled status, login flags (registration, reset " +
        "password, email verification), security (SSL, brute force, password policy), " +
        "token/session lifespans, locale/theme, event storage and whether SMTP is configured. " +
        "Use get-realm-smtp for the SMTP details.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm")
      }
    },
    async ({ realm }) => {
      const kc = await getKc();
      const found = await kc.realms.findOne({ realm });

      if (!found) {
        return {
          content: [{ type: "text", text: `Realm "${realm}" not found` }],
          isError: true
        };
      }

      const slim = {
        id: found.id,
        realm: found.realm,
        enabled: found.enabled ?? false,
        displayName: found.displayName ?? null,
        registrationAllowed: found.registrationAllowed ?? false,
        resetPasswordAllowed: found.resetPasswordAllowed ?? false,
        verifyEmail: found.verifyEmail ?? false,
        loginWithEmailAllowed: found.loginWithEmailAllowed ?? false,
        sslRequired: found.sslRequired ?? null,
        accessTokenLifespan: found.accessTokenLifespan ?? null,
        ssoSessionIdleTimeout: found.ssoSessionIdleTimeout ?? null,
        ssoSessionMaxLifespan: found.ssoSessionMaxLifespan ?? null,
        registrationEmailAsUsername: found.registrationEmailAsUsername ?? false,
        duplicateEmailsAllowed: found.duplicateEmailsAllowed ?? false,
        editUsernameAllowed: found.editUsernameAllowed ?? false,
        rememberMe: found.rememberMe ?? false,
        bruteForceProtected: found.bruteForceProtected ?? false,
        failureFactor: found.failureFactor ?? null,
        passwordPolicy: found.passwordPolicy ?? null,
        internationalizationEnabled: found.internationalizationEnabled ?? false,
        defaultLocale: found.defaultLocale ?? null,
        loginTheme: found.loginTheme ?? null,
        organizationsEnabled: found.organizationsEnabled ?? false,
        eventsEnabled: found.eventsEnabled ?? false,
        adminEventsEnabled: found.adminEventsEnabled ?? false,
        smtpConfigured: Boolean(found.smtpServer && Object.keys(found.smtpServer).length > 0)
      };

      return {
        content: [{ type: "text", text: JSON.stringify(slim, null, 2) }]
      };
    }
  );
}
