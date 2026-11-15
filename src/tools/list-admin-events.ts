import { getKc } from "@/keycloak.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerListAdminEvents(server: McpServer) {
  server.registerTool(
    "list-admin-events",
    {
      description:
        "List admin events of a realm (who created/updated/deleted what through the admin " +
        "API), newest first. Requires admin event storage to be enabled in the realm's Events " +
        "settings. Filter by operation, resource type or resource path.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        operationTypes: z
          .string()
          .optional()
          .describe("Operation type: CREATE, UPDATE, DELETE or ACTION"),
        resourceTypes: z.string().optional().describe("Resource type, e.g. USER, CLIENT, GROUP"),
        resourcePath: z
          .string()
          .optional()
          .describe("Resource path, wildcards allowed, e.g. users/*"),
        first: z.number().int().min(0).default(0).describe("Pagination offset"),
        max: z.number().int().min(1).max(200).default(50).describe("Page size")
      }
    },
    async ({ realm, operationTypes, resourceTypes, resourcePath, first, max }) => {
      const kc = await getKc();

      const events = await kc.realms.findAdminEvents({
        realm,
        operationTypes,
        resourceTypes,
        resourcePath,
        first,
        max
      });

      const slim = events.map(event => ({
        time: event.time ? new Date(event.time).toISOString() : null,
        operationType: event.operationType,
        resourceType: event.resourceType ?? null,
        resourcePath: event.resourcePath ?? null,
        authUserId: event.authDetails?.userId ?? null,
        authClientId: event.authDetails?.clientId ?? null,
        ipAddress: event.authDetails?.ipAddress ?? null,
        error: event.error ?? null
      }));

      return {
        content: [{ type: "text", text: JSON.stringify(slim, null, 2) }]
      };
    }
  );
}
