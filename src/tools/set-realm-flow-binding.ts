import { getKc } from "@/keycloak.js";
import { FLOW_BINDINGS, findFlow, flowBindingSchema } from "@/tools/auth-flow-lookup.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerSetRealmFlowBinding(server: McpServer) {
  server.registerTool(
    "set-realm-flow-binding",
    {
      description:
        "Choose which top-level flow a realm uses for a purpose: browser (web login), " +
        "registration, directGrant (password grant), resetCredentials (forgot password), " +
        "clientAuthentication or dockerAuthentication. Takes effect immediately for all users. " +
        "Careful: binding a flow that cannot complete a login (e.g. an empty copy) locks " +
        "everyone out of the realm. Inspect it first with get-authentication-flow. " +
        "(A provider's first-broker-login flow is set on the identity provider, not here.)",
      inputSchema: {
        realm: z.string().describe("Realm name, e.g. financement-realm"),
        binding: flowBindingSchema.describe("Which purpose to bind the flow to"),
        flow: z.string().describe("Alias of the top-level flow to use, e.g. browser-with-otp")
      }
    },
    async ({ realm, binding, flow }) => {
      const kc = await getKc();

      if (!(await findFlow(kc, realm, flow))) {
        return {
          content: [{ type: "text", text: `Authentication flow "${flow}" not found in realm ${realm}` }],
          isError: true
        };
      }

      const field = FLOW_BINDINGS[binding];
      const before = (await kc.realms.findOne({ realm }))?.[field] ?? null;

      await kc.realms.update({ realm }, { realm, [field]: flow });

      return {
        content: [{ type: "text", text: JSON.stringify({ realm, binding, flow, previous: before }, null, 2) }]
      };
    }
  );
}
