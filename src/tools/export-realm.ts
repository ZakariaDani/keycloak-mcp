import { getKc } from "@/keycloak.js";
import { writeJsonFile } from "@/tools/file-access.js";
import { countResources } from "@/tools/realm-json.js";
import { fail } from "@/tools/result.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";

/** Above this size the JSON is not returned inline: it would flood the model's context. */
const MAX_INLINE_CHARS = 100_000;

export function registerExportRealm(server: McpServer) {
  server.registerTool(
    "export-realm",
    {
      description:
        "Export a realm's configuration as JSON: realm settings, authentication flows, " +
        "identity providers, and optionally clients, groups and roles. Users are NOT included " +
        "and secrets (client secrets, SMTP/LDAP/IdP credentials) come back masked as ********** " +
        "and are dropped again on import. Use it for backups or to copy a realm's setup. " +
        "Exports are large: pass outputFile (absolute path ending .json) to save to disk, which " +
        "returns only a summary; without it the JSON is returned inline unless it is too big. " +
        "Written files are readable by the owner only, and an existing file is not replaced " +
        "unless overwrite=true. The path must be inside KEYCLOAK_FILES_DIR when that is set.",
      inputSchema: {
        realm: z.string().describe("Realm name to export, e.g. financement-realm"),
        exportClients: z.boolean().default(true).describe("Include clients"),
        exportGroupsAndRoles: z.boolean().default(true).describe("Include groups and roles"),
        outputFile: z
          .string()
          .optional()
          .describe("Absolute path to write, ending in .json, e.g. /Users/me/backups/financement.json"),
        overwrite: z.boolean().default(false).describe("Replace outputFile if it already exists")
      }
    },
    async ({ realm, exportClients, exportGroupsAndRoles, outputFile, overwrite }) => {
      const kc = await getKc();

      if (!(await kc.realms.findOne({ realm }))) return fail(`Realm "${realm}" not found`);

      const exported = await kc.realms.export({ realm, exportClients, exportGroupsAndRoles });

      const summary = {
        realm: exported.realm,
        counts: countResources(exported as Record<string, unknown>),
        note: "Users are not part of this export; secrets are masked."
      };

      if (outputFile) {
        const written = await writeJsonFile(outputFile, exported, overwrite);
        if ("error" in written) return fail(written.error);

        return {
          content: [{ type: "text", text: JSON.stringify({ ...summary, file: written.path, bytes: written.bytes }, null, 2) }]
        };
      }

      const text = JSON.stringify(exported, null, 2);

      if (text.length > MAX_INLINE_CHARS) {
        return fail(
          `The export is ${text.length} characters, too large to return inline. Call again with outputFile ` +
            `to save it to disk. Summary: ${JSON.stringify(summary)}`
        );
      }

      return {
        content: [{ type: "text", text: JSON.stringify({ ...summary, export: exported }, null, 2) }]
      };
    }
  );
}
