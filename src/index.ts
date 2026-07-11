import { registerTools } from "@/tools/index.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio";

const server = new McpServer({ name: "keycloak-mcp", version: "1.0.0" });
registerTools(server);
const transport = new StdioServerTransport();
await server.connect(transport);
console.error("keycloak-mcp running on stdio");