import { getKc } from "@/keycloak.js";
import { findFlow } from "@/tools/auth-flow-lookup.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerCopyAuthenticationFlow(server: McpServer) {
  server.registerTool(
    "copy-authentication-flow",
    {
      description:
        "Copy an authentication flow (typically a built-in one, which cannot be edited) under a " +
        "new alias, including its subflows and steps. The recommended way to customise login: " +
        "copy 'browser', change the copy, then bind it with set-realm-flow-binding. Fails if " +
        "newName already exists.",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        flow: z.string().describe("Alias of the flow to copy, e.g. browser"),
        newName: z.string().describe("Alias for the copy, e.g. browser-with-otp")
      }
    },
    async ({ realm, flow, newName }) => {
      const kc = await getKc();

      if (!(await findFlow(kc, realm, flow))) {
        return {
          content: [{ type: "text", text: `Authentication flow "${flow}" not found in realm ${realm}` }],
          isError: true
        };
      }

      await kc.authenticationManagement.copyFlow({ realm, flow, newName });

      return {
        content: [{ type: "text", text: JSON.stringify({ copiedFrom: flow, alias: newName }, null, 2) }]
      };
    }
  );
}
