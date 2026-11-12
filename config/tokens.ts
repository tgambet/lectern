import { readFileSync } from "node:fs";
import { join } from "node:path";

interface ColorToken {
  name: string;
  value: { light: string; dark: string };
}

/** Reads a color token from design/tokens.json, for build-time values (manifest, meta). */
export function colorToken(name: string): { light: string; dark: string } {
  const tokens = JSON.parse(readFileSync(join(process.cwd(), "design/tokens.json"), "utf8")) as {
    color: { tokens: ColorToken[] };
  };
  const token = tokens.color.tokens.find((t) => t.name === name);
  if (!token) throw new Error(`Unknown color token: ${name}`);
  return token.value;
}
