import "server-only";

import { readFileSync } from "node:fs";
import path from "node:path";

// Every agent's system prompt is composed from the shared house doctrine plus
// its own framework file(s). Files live under /doctrine and are force-included
// in the serverless bundle via outputFileTracingIncludes (next.config.ts).
const HOUSE_FILE = "_house.md";
const DOCTRINE_DIR = path.join(process.cwd(), "doctrine");
const SEPARATOR = "\n\n---\n\n";

const cache = new Map<string, string>();

function readDoctrineFile(file: string): string {
  const cached = cache.get(file);
  if (cached !== undefined) {
    return cached;
  }

  const fullPath = path.join(DOCTRINE_DIR, file);
  const text = readFileSync(fullPath, "utf8");
  cache.set(file, text);
  return text;
}

// Compose `_house.md` followed by the agent's own doctrine files, in order,
// de-duplicated. The house file is always first and always present.
export function composeDoctrine(files: string[]): string {
  const ordered = [HOUSE_FILE, ...files.filter((file) => file !== HOUSE_FILE)];
  return ordered.map(readDoctrineFile).join(SEPARATOR);
}
