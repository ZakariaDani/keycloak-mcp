import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { TOOL_GROUPS } from "@/tools/groups.js";
import { registerTools } from "@/tools/index.js";
import { parseToolGroups } from "@/tools/select-groups.js";

const available = Object.keys(TOOL_GROUPS);

/** A stand-in McpServer that only records tool names. */
function fakeServer() {
  const names: string[] = [];
  const server = { registerTool: (name: string) => void names.push(name) };
  return { server: server as never, names };
}

/** Tool names declared in source: every `registerTool("name", ...)` under src/tools. */
function toolNamesInSource(): string[] {
  const dir = new URL(".", import.meta.url);
  return readdirSync(dir)
    .filter(file => file.endsWith(".ts") && !file.endsWith(".test.ts"))
    .flatMap(file => [...readFileSync(new URL(file, dir), "utf8").matchAll(/registerTool\(\s*"([^"]+)"/g)])
    .map(match => match[1] as string);
}

test("every tool in src/tools belongs to exactly one group", () => {
  const { server, names } = fakeServer();
  registerTools(server, "all");

  assert.equal(new Set(names).size, names.length, "a tool is registered by more than one group");
  assert.deepEqual([...names].sort(), toolNamesInSource().sort(), "a tool file is missing from groups.ts");
});

test("parseToolGroups: unset, blank and 'all' select every group", () => {
  assert.deepEqual(parseToolGroups(undefined, available), available);
  assert.deepEqual(parseToolGroups("  ", available), available);
  assert.deepEqual(parseToolGroups("all", available), available);
  assert.deepEqual(parseToolGroups("users, ALL", available), available);
});

test("parseToolGroups: trims, lowercases and de-duplicates", () => {
  assert.deepEqual(parseToolGroups(" Users , roles,users,", available), ["users", "roles"]);
});

test("parseToolGroups: an unknown group throws and names the valid ones", () => {
  assert.throws(() => parseToolGroups("users,userz", available), /userz[\s\S]*Valid groups: users/);
});

test("registerTools only registers the selected groups", () => {
  const { server, names } = fakeServer();
  registerTools(server, "events");

  assert.deepEqual(names, ["list-events", "list-admin-events"]);
});
