import { readFile, realpath, stat, writeFile } from "node:fs/promises";
import path from "node:path";

/** Imports larger than this are refused: a realm file this big is almost certainly a mistake. */
export const MAX_IMPORT_BYTES = 25 * 1024 * 1024;

const describe = (error: unknown): string => (error instanceof Error ? error.message : String(error));

/**
 * Validate a path the model supplied for reading or writing a realm JSON file.
 *
 * - must be absolute and end in .json
 * - when KEYCLOAK_FILES_DIR is set, it must resolve inside that directory (symlinks are
 *   followed first, so a link cannot point outside it). Unset means any location is allowed.
 *
 * `mustExist` is true for reads. For writes only the parent directory has to exist.
 */
export async function resolveJsonPath(
  raw: string,
  mustExist: boolean
): Promise<{ path: string } | { error: string }> {
  if (!path.isAbsolute(raw)) return { error: `Use an absolute path (got "${raw}")` };
  if (path.extname(raw).toLowerCase() !== ".json") return { error: "The file must have a .json extension" };

  const target = path.resolve(raw);
  const baseDir = process.env.KEYCLOAK_FILES_DIR;

  if (!baseDir) return { path: target };

  try {
    const base = await realpath(path.resolve(baseDir));
    const existing = await realpath(target).catch(() => null);

    if (!existing && mustExist) return { error: `File not found: ${target}` };

    const real = existing ?? path.join(await realpath(path.dirname(target)), path.basename(target));
    const relative = path.relative(base, real);

    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      return { error: `The path must be inside KEYCLOAK_FILES_DIR (${base})` };
    }

    return { path: real };
  } catch (error) {
    return { error: `Cannot use that path: ${describe(error)}` };
  }
}

/** Read and parse a JSON object from a validated path, with a size cap. */
export async function readJsonObject(file: string): Promise<{ value: Record<string, unknown> } | { error: string }> {
  const resolved = await resolveJsonPath(file, true);
  if ("error" in resolved) return resolved;

  try {
    const info = await stat(resolved.path);
    if (!info.isFile()) return { error: `Not a regular file: ${resolved.path}` };
    if (info.size > MAX_IMPORT_BYTES) {
      return { error: `File is ${info.size} bytes; the limit is ${MAX_IMPORT_BYTES}` };
    }

    const parsed: unknown = JSON.parse(await readFile(resolved.path, "utf8"));

    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { error: "The file must contain a JSON object (a realm representation)" };
    }

    return { value: parsed as Record<string, unknown> };
  } catch (error) {
    return { error: `Cannot read ${resolved.path}: ${describe(error)}` };
  }
}

/**
 * Write JSON to a validated path. Refuses to replace an existing file unless `overwrite`,
 * and creates it readable by the owner only: exports contain configuration and, for
 * imports, may contain credentials.
 */
export async function writeJsonFile(
  file: string,
  data: unknown,
  overwrite: boolean
): Promise<{ path: string; bytes: number } | { error: string }> {
  const resolved = await resolveJsonPath(file, false);
  if ("error" in resolved) return resolved;

  const text = JSON.stringify(data, null, 2);

  try {
    await writeFile(resolved.path, text, { flag: overwrite ? "w" : "wx", mode: 0o600 });
    return { path: resolved.path, bytes: Buffer.byteLength(text) };
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "EEXIST") {
      return { error: `${resolved.path} already exists; pass overwrite=true to replace it` };
    }
    return { error: `Cannot write ${resolved.path}: ${describe(error)}` };
  }
}

/**
 * Get the realm JSON for an import from either a file path or an inline object.
 * Exactly one must be given.
 */
export async function loadRealmJson(input: {
  file?: string;
  data?: Record<string, unknown>;
}): Promise<{ value: Record<string, unknown> } | { error: string }> {
  if (input.file && input.data) return { error: "Give either file or data, not both" };
  if (!input.file && !input.data) return { error: "Give the realm JSON as file (a path) or data (an object)" };

  return input.file ? readJsonObject(input.file) : { value: input.data ?? {} };
}
