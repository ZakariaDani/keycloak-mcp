import { getKc } from "@/keycloak.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerUpdateRealmEventsConfig(server: McpServer) {
  server.registerTool(
    "update-realm-events-config",
    {
      description:
        "Turn event storage on or off for a realm. Login/user events and admin events are " +
        "stored separately; list-events and list-admin-events return nothing until the " +
        "matching one is enabled. Only supplied fields change. Requires at least one field.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        eventsEnabled: z.boolean().optional().describe("Store login/user events"),
        eventsExpiration: z
          .number()
          .int()
          .min(0)
          .optional()
          .describe("Delete stored user events after this many seconds (0 = keep forever)"),
        adminEventsEnabled: z.boolean().optional().describe("Store admin-API events"),
        adminEventsDetailsEnabled: z
          .boolean()
          .optional()
          .describe("Include the full request representation in admin events (may contain sensitive data)")
      }
    },
    async ({ realm, ...fields }) => {
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
