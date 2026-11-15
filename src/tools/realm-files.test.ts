import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, realpath, rm, stat, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, afterEach, before, test } from "node:test";
import { loadRealmJson, resolveJsonPath, writeJsonFile } from "@/tools/file-access.js";
import { MASK, countResources, stripMaskedSecrets } from "@/tools/realm-json.js";

let root: string; // real path of the sandbox directory
let inside: string; // <root>/allowed
let outside: string; // <root>/elsewhere

before(async () => {
  root = await realpath(await mkdtemp(path.join(tmpdir(), "kc-files-")));
  inside = path.join(root, "allowed");
  outside = path.join(root, "elsewhere");
  await mkdir(inside);
  await mkdir(outside);
});

afterEach(() => {
  delete process.env.KEYCLOAK_FILES_DIR;
});

after(() => rm(root, { recursive: true, force: true }));

test("stripMaskedSecrets drops masked values at any depth and counts them", () => {
  const input = {
    realm: "demo",
    smtpServer: { host: "smtp", password: MASK },
    clients: [{ clientId: "a", secret: MASK }, { clientId: "b", secret: "real" }],
    components: { ldap: [{ config: { bindCredential: [MASK], url: ["ldap://x"] } }] }
  };

  const { value, removed } = stripMaskedSecrets(input);

  assert.equal(removed, 3);
  assert.deepEqual(value, {
    realm: "demo",
    smtpServer: { host: "smtp" },
    clients: [{ clientId: "a" }, { clientId: "b", secret: "real" }],
    components: { ldap: [{ config: { url: ["ldap://x"] } }] }
  });
  assert.equal(input.smtpServer.password, MASK, "the input must not be mutated");
});

test("countResources counts realm and client roles", () => {
  const counts = countResources({
    users: [{}],
    clients: [{}, {}],
    groups: [],
    roles: { realm: [{}, {}], client: { a: [{}], b: [{}, {}] } },
    identityProviders: [{}]
  });

  assert.deepEqual(counts, { users: 1, clients: 2, groups: 0, roles: 5, identityProviders: 1 });
});

test("resolveJsonPath rejects relative paths and non-json files", async () => {
  assert.match(JSON.stringify(await resolveJsonPath("relative.json", false)), /absolute/);
  assert.match(JSON.stringify(await resolveJsonPath(path.join(inside, "x.txt"), false)), /\.json/);
});

test("resolveJsonPath allows any absolute .json path when KEYCLOAK_FILES_DIR is unset", async () => {
  const target = path.join(outside, "free.json");
  assert.deepEqual(await resolveJsonPath(target, false), { path: target });
});

test("resolveJsonPath confines paths to KEYCLOAK_FILES_DIR, including ../ and symlink escapes", async () => {
  process.env.KEYCLOAK_FILES_DIR = inside;

  const ok = path.join(inside, "ok.json");
  assert.deepEqual(await resolveJsonPath(ok, false), { path: ok });

  assert.ok("error" in (await resolveJsonPath(path.join(outside, "no.json"), false)), "sibling directory");
  assert.ok("error" in (await resolveJsonPath(path.join(inside, "..", "elsewhere", "no.json"), false)), "../ escape");

  // A link inside the allowed directory that points outside must not be followed.
  await writeFile(path.join(outside, "secret.json"), "{}");
  await symlink(path.join(outside, "secret.json"), path.join(inside, "link.json"));
  assert.ok("error" in (await resolveJsonPath(path.join(inside, "link.json"), true)), "symlinked file");

  await symlink(outside, path.join(inside, "linkdir"));
  assert.ok("error" in (await resolveJsonPath(path.join(inside, "linkdir", "new.json"), false)), "symlinked dir");
});

test("writeJsonFile refuses to replace a file unless overwrite is set, and writes owner-only", async () => {
  const file = path.join(outside, "export.json");

  const first = await writeJsonFile(file, { a: 1 }, false);
  assert.ok("path" in first);
  assert.equal((await stat(file)).mode & 0o777, 0o600);

  const second = await writeJsonFile(file, { a: 2 }, false);
  assert.match(JSON.stringify(second), /already exists/);
  assert.deepEqual(JSON.parse(await readFile(file, "utf8")), { a: 1 });

  assert.ok("path" in (await writeJsonFile(file, { a: 2 }, true)));
  assert.deepEqual(JSON.parse(await readFile(file, "utf8")), { a: 2 });
});

test("loadRealmJson needs exactly one source and a JSON object", async () => {
  assert.match(JSON.stringify(await loadRealmJson({})), /file.*data/);
  assert.match(JSON.stringify(await loadRealmJson({ file: "/x.json", data: {} })), /not both/);
  assert.deepEqual(await loadRealmJson({ data: { realm: "r" } }), { value: { realm: "r" } });

  const array = path.join(outside, "array.json");
  await writeFile(array, "[1]");
  assert.match(JSON.stringify(await loadRealmJson({ file: array })), /JSON object/);

  const broken = path.join(outside, "broken.json");
  await writeFile(broken, "{ nope");
  assert.ok("error" in (await loadRealmJson({ file: broken })));

  const good = path.join(outside, "good.json");
  await writeFile(good, '{"realm":"r","clients":[]}');
  assert.deepEqual(await loadRealmJson({ file: good }), { value: { realm: "r", clients: [] } });
});
