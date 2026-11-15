import { getKc } from "@/keycloak.js";
import { loadRealmJson } from "@/tools/file-access.js";
import {
  PARTIAL_IMPORT_TYPES,
  countResources,
  stripMaskedSecrets,
  type PartialImportType
} from "@/tools/realm-json.js";
import { fail } from "@/tools/result.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";

/** Only this many per-resource results are echoed back; the counts always cover everything. */
const MAX_RESULTS_SHOWN = 50;

export function registerPartialImportRealm(server: McpServer) {
  server.registerTool(
    "partial-import-realm",
    {
      description:
        "Import resources (users, clients, groups, roles, identity providers) from a realm JSON " +
        "document into an EXISTING realm, e.g. a file written by export-realm. Realm settings in " +
        "the document are ignored. Give the JSON as file (absolute .json path, inside " +
        "KEYCLOAK_FILES_DIR when set) or inline as data. ifResourceExists decides what happens " +
        "to resources that already exist: FAIL (default, stops on the first clash), SKIP (keep " +
        "the existing one) or OVERWRITE (delete and re-create it from the file: a client " +
        "loses its current secret and a user's changes are replaced). Masked secrets " +
        "(**********) from an export are dropped rather than stored, so imported clients and " +
        "identity providers need their secrets set again. Use include to import only some types.",
      inputSchema: {
        realm: z.string().describe("Target realm name, e.g. staging-realm"),
        file: z.string().optional().describe("Absolute path of a realm JSON file ending in .json"),
        data: z.record(z.string(), z.unknown()).optional().describe("The realm JSON inline, instead of file"),
        ifResourceExists: z
          .enum(["FAIL", "SKIP", "OVERWRITE"])
          .default("FAIL")
          .describe("What to do with resources that already exist in the target realm"),
        include: z
          .array(z.enum(PARTIAL_IMPORT_TYPES))
          .optional()
          .describe("Only import these resource types (default: every type present in the document)")
      }
    },
    async ({ realm, file, data, ifResourceExists, include }) => {
      const loaded = await loadRealmJson({ file, data });
      if ("error" in loaded) return fail(loaded.error);

      const kc = await getKc();

      if (!(await kc.realms.findOne({ realm }))) return fail(`Realm "${realm}" not found`);

      const wanted: readonly PartialImportType[] = include ?? PARTIAL_IMPORT_TYPES;

      // Send only the importable types: realm settings in the file must never leak into the target.
      const selected = Object.fromEntries(
        wanted.filter(type => loaded.value[type] !== undefined).map(type => [type, loaded.value[type]])
      );
      const counts = countResources(selected);

      if (Object.values(counts).every(count => count === 0)) {
        return fail(`Nothing to import: the document has no ${wanted.join(", ")}`);
      }

      const { value: cleaned, removed } = stripMaskedSecrets(selected);

      const result = await kc.realms.partialImport({
        realm,
        rep: { ...cleaned, ifResourceExists }
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                realm,
                ifResourceExists,
                sent: counts,
                maskedSecretsDropped: removed,
                added: result.added,
                skipped: result.skipped,
                overwritten: result.overwritten,
                results: result.results.slice(0, MAX_RESULTS_SHOWN).map(item => ({
                  action: item.action,
                  type: item.resourceType,
                  name: item.resourceName
                })),
                resultsTruncated: result.results.length > MAX_RESULTS_SHOWN
              },
              null,
              2
            )
          }
        ]
      };
    }
  );
}
