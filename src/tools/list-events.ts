import { getKc } from "@/keycloak.js";
import { findUserId } from "@/tools/lookup.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerListEvents(server: McpServer) {
  server.registerTool(
    "list-events",
    {
      description:
        "List login/user events of a realm (LOGIN, LOGIN_ERROR, LOGOUT, REGISTER, ...), newest " +
        "first. Useful for debugging failed logins. Requires event storage to be enabled in the " +
        "realm's Events settings. Filter by type, username, clientId, IP or date range.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        type: z
          .array(z.string())
          .optional()
          .describe("Event types to include, e.g. [\"LOGIN_ERROR\"]"),
        username: z.string().optional().describe("Exact username to filter on"),
        clientId: z.string().optional().describe("clientId string to filter on"),
        ipAddress: z.string().optional().describe("Source IP address to filter on"),
        dateFrom: z.string().optional().describe("Start date, yyyy-MM-dd"),
        dateTo: z.string().optional().describe("End date, yyyy-MM-dd"),
        first: z.number().int().min(0).default(0).describe("Pagination offset"),
        max: z.number().int().min(1).max(200).default(50).describe("Page size")
      }
    },
    async ({ realm, type, username, clientId, ipAddress, dateFrom, dateTo, first, max }) => {
      const kc = await getKc();

      let user: string | undefined;
      if (username) {
        const userId = await findUserId(kc, realm, username);
        if (!userId) {
          return {
            content: [{ type: "text", text: `User "${username}" not found in realm ${realm}` }],
            isError: true
          };
        }
        user = userId;
      }

      const events = await kc.realms.findEvents({
        realm,
        // ponytail: Keycloak validates the type names, so we pass them through as strings
        type: type as never,
        user,
        client: clientId,
        ipAddress,
        dateFrom,
        dateTo,
        first,
        max
      });

      const slim = events.map(event => ({
        time: event.time ? new Date(event.time).toISOString() : null,
        type: event.type,
        userId: event.userId ?? null,
        clientId: event.clientId ?? null,
        ipAddress: event.ipAddress ?? null,
        error: event.error ?? null,
        details: event.details ?? null
      }));

      return {
        content: [{ type: "text", text: JSON.stringify(slim, null, 2) }]
      };
    }
  );
}
