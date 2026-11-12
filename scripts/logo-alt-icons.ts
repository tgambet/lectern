// Generates the Logo-Alt PWA icons into design/assets/Logo-Alt/web/.
// The full mark (stroke 4.5) feeds the 64 px and larger icons; the small mark
// (stroke 6) feeds the favicons, per the brand book's "below 24 px" rule.
import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { colorToken } from "../config/tokens.ts";

const src = "design/assets/Logo-Alt";
const out = join(src, "web");
mkdirSync(out, { recursive: true });

const accent = colorToken("accent");
const markColor = colorToken("paper").light;

/** Icons on an accent square draw the mark in the paper color; the transparent .ico keeps the accent. */
function generate(svg: string, onAccent: boolean): string {
  const dir = mkdtempSync(join(tmpdir(), "lectern-icons-"));
  const source = readFileSync(join(src, svg), "utf8").replace(
    `stroke="${accent.light}"`,
    `stroke="${onAccent ? markColor : accent.light}"`,
  );
  writeFileSync(join(dir, "mark.svg"), source);
  execFileSync(
    "pnpm",
    [
      "exec",
      "pwa-assets-generator",
      "-c",
      "pwa-assets.config.ts",
      "-m",
      "false",
      join(dir, "mark.svg"),
    ],
    { stdio: "inherit" },
  );
  return dir;
}

const large = generate("lectern-mark.svg", true);
for (const file of readdirSync(large)) {
  if (file.endsWith(".png")) copyFileSync(join(large, file), join(out, file));
}
rmSync(large, { recursive: true });

const small = generate("lectern-mark-small.svg", false);
copyFileSync(join(small, "favicon.ico"), join(out, "favicon.ico"));
rmSync(small, { recursive: true });

// The SVG favicon is transparent and follows the OS theme with the matching accent.
const favicon = readFileSync(join(src, "lectern-mark-small.svg"), "utf8").replace(
  /<title>/,
  `<style>@media (prefers-color-scheme: dark) { path { stroke: ${accent.dark} } }</style>\n<title>`,
);
writeFileSync(join(out, "favicon.svg"), favicon);

console.log(`Icons written to ${out}: ${readdirSync(out).join(", ")}`);
