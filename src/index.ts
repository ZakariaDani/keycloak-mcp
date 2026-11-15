import { registerTools } from "@/tools/index.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio";

const server = new McpServer({ name: "keycloak-mcp", version: "1.0.0" });

try {
  registerTools(server);
} catch (error) {
  // A bad KEYCLOAK_TOOLS value is a config error: say so plainly and stop.
  console.error(`keycloak-mcp: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("keycloak-mcp running on stdio");
