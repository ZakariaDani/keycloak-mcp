import { getKc } from "@/keycloak.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerUpdateRealmSmtp(server: McpServer) {
  server.registerTool(
    "update-realm-smtp",
    {
      description:
        "Configure a realm's SMTP server so Keycloak can send email (verification, password " +
        "reset, send-user-actions-email). Only supplied fields change; the rest of the existing " +
        "SMTP config is kept. Requires at least one field. The password is write-only and is " +
        "not echoed back.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        host: z.string().optional().describe("SMTP host, e.g. smtp.example.com"),
        port: z.number().int().min(1).max(65535).optional().describe("SMTP port, e.g. 587"),
        from: z.string().email().optional().describe("Sender address, e.g. no-reply@example.com"),
        fromDisplayName: z.string().optional().describe("Sender display name"),
        replyTo: z.string().email().optional().describe("Reply-to address"),
        auth: z.boolean().optional().describe("Authenticate to the SMTP server"),
        user: z.string().optional().describe("SMTP username (when auth is on)"),
        password: z.string().optional().describe("SMTP password (when auth is on)"),
        ssl: z.boolean().optional().describe("Use SSL/TLS (usually port 465)"),
        starttls: z.boolean().optional().describe("Use STARTTLS (usually port 587)")
      }
    },
    async ({ realm, ...fields }) => {
      // The smtpServer map holds string values only, so booleans and the port are stringified.
      const changes = Object.fromEntries(
        Object.entries(fields)
          .filter(([, value]) => value !== undefined)
          .map(([key, value]) => [key, String(value)])
      );

      if (Object.keys(changes).length === 0) {
        return {
          content: [{ type: "text", text: "No fields to update: supply at least one SMTP setting" }],
          isError: true
        };
      }

      const kc = await getKc();
      const existing = await kc.realms.findOne({ realm });

      if (!existing) {
        return {
          content: [{ type: "text", text: `Realm "${realm}" not found` }],
          isError: true
        };
      }

      // The PUT replaces the whole smtpServer map. The stored password comes back masked,
      // and Keycloak keeps the stored value when it receives the mask.
      await kc.realms.update({ realm }, { realm, smtpServer: { ...existing.smtpServer, ...changes } });

      const { password: _password, ...shown } = changes;

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ realm, updated: shown, passwordUpdated: "password" in changes }, null, 2)
          }
        ]
      };
    }
  );
}
