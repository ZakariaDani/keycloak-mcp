import { getKc } from "@/keycloak.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerGetRealmSmtp(server: McpServer) {
  server.registerTool(
    "get-realm-smtp",
    {
      description:
        "Get a realm's SMTP (outgoing email) settings: host, port, from address, auth, ssl and " +
        "starttls. The password is never returned, only whether one is set.",
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

      const { password, ...smtp } = found.smtpServer ?? {};

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ configured: Object.keys(smtp).length > 0, ...smtp, passwordSet: Boolean(password) }, null, 2)
          }
        ]
      };
    }
  );
}
