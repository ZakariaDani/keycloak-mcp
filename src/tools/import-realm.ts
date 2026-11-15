import { getKc } from "@/keycloak.js";
import { loadRealmJson } from "@/tools/file-access.js";
import { countResources, stripMaskedSecrets } from "@/tools/realm-json.js";
import { fail } from "@/tools/result.js";
import type RealmRepresentation from "@keycloak/keycloak-admin-client/lib/defs/realmRepresentation.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";


export function registerImportRealm(server: McpServer) {
  server.registerTool(
    "import-realm",
    {
      description:
        "Create a NEW realm from a full realm JSON document, e.g. a file written by " +
        "export-realm or a realm exported from another Keycloak. Give the JSON as file " +
        "(absolute .json path, inside KEYCLOAK_FILES_DIR when set) or inline as data. " +
        "realmName overrides the name in the document, which is how you clone a realm; the " +
        "document's internal id is then dropped so a fresh one is generated. Refuses to " +
        "replace an existing realm, and the master realm. Masked secrets (**********) are " +
        "dropped, so clients and identity providers imported this way need their secrets set " +
        "again. To add resources to a realm that already exists, use partial-import-realm.",
      inputSchema: {
        file: z.string().optional().describe("Absolute path of a realm JSON file ending in .json"),
        data: z.record(z.string(), z.unknown()).optional().describe("The realm JSON inline, instead of file"),
        realmName: z.string().optional().describe("Name for the new realm; defaults to the document's `realm`")
      }
    },
    async ({ file, data, realmName }) => {
      const loaded = await loadRealmJson({ file, data });
      if ("error" in loaded) return fail(loaded.error);

      const name = realmName ?? loaded.value.realm;

      if (typeof name !== "string" || name.length === 0) {
        return fail("The document has no `realm` name; supply realmName");
      }
      if (name === "master") return fail("Refusing to import over the master realm");

      const kc = await getKc();

      if (await kc.realms.findOne({ realm: name })) {
        return fail(`Realm "${name}" already exists; choose another realmName or use partial-import-realm`);
      }

      const { value: cleaned, removed } = stripMaskedSecrets(loaded.value);

      // A renamed copy must not reuse the source realm's id.
      const { id: _id, ...withoutId } = cleaned;
      const rep = (realmName ? { ...withoutId, realm: name } : cleaned) as RealmRepresentation;

      await kc.realms.create(rep);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              { realm: name, created: true, imported: countResources(cleaned), maskedSecretsDropped: removed },
              null,
              2
            )
          }
        ]
      };
    }
  );
}
