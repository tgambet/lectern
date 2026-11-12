/**
 * The 40 grammars Lectern highlights, each a lazy chunk (precached for
 * offline use). Fenced code in any other language renders as plain text.
 */
import type { LanguageRegistration } from "@shikijs/core";

type Loader = () => Promise<{ default: LanguageRegistration[] }>;

export const grammars = {
  c: () => import("@shikijs/langs/c"),
  cpp: () => import("@shikijs/langs/cpp"),
  csharp: () => import("@shikijs/langs/csharp"),
  css: () => import("@shikijs/langs/css"),
  dart: () => import("@shikijs/langs/dart"),
  diff: () => import("@shikijs/langs/diff"),
  docker: () => import("@shikijs/langs/docker"),
  elixir: () => import("@shikijs/langs/elixir"),
  go: () => import("@shikijs/langs/go"),
  graphql: () => import("@shikijs/langs/graphql"),
  hcl: () => import("@shikijs/langs/hcl"),
  html: () => import("@shikijs/langs/html"),
  ini: () => import("@shikijs/langs/ini"),
  java: () => import("@shikijs/langs/java"),
  javascript: () => import("@shikijs/langs/javascript"),
  json: () => import("@shikijs/langs/json"),
  jsonc: () => import("@shikijs/langs/jsonc"),
  jsx: () => import("@shikijs/langs/jsx"),
  kotlin: () => import("@shikijs/langs/kotlin"),
  lua: () => import("@shikijs/langs/lua"),
  make: () => import("@shikijs/langs/make"),
  markdown: () => import("@shikijs/langs/markdown"),
  nginx: () => import("@shikijs/langs/nginx"),
  php: () => import("@shikijs/langs/php"),
  powershell: () => import("@shikijs/langs/powershell"),
  proto: () => import("@shikijs/langs/proto"),
  python: () => import("@shikijs/langs/python"),
  ruby: () => import("@shikijs/langs/ruby"),
  rust: () => import("@shikijs/langs/rust"),
  scss: () => import("@shikijs/langs/scss"),
  shellscript: () => import("@shikijs/langs/shellscript"),
  shellsession: () => import("@shikijs/langs/shellsession"),
  sql: () => import("@shikijs/langs/sql"),
  swift: () => import("@shikijs/langs/swift"),
  toml: () => import("@shikijs/langs/toml"),
  tsx: () => import("@shikijs/langs/tsx"),
  typescript: () => import("@shikijs/langs/typescript"),
  vue: () => import("@shikijs/langs/vue"),
  xml: () => import("@shikijs/langs/xml"),
  yaml: () => import("@shikijs/langs/yaml"),
} satisfies Record<string, Loader>;

export type GrammarId = keyof typeof grammars;

const aliases: Record<string, GrammarId> = {
  bash: "shellscript",
  sh: "shellscript",
  shell: "shellscript",
  zsh: "shellscript",
  console: "shellsession",
  "c++": "cpp",
  "c#": "csharp",
  cs: "csharp",
  dockerfile: "docker",
  ex: "elixir",
  exs: "elixir",
  golang: "go",
  gql: "graphql",
  terraform: "hcl",
  tf: "hcl",
  htm: "html",
  cfg: "ini",
  conf: "ini",
  js: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  json5: "jsonc",
  kt: "kotlin",
  kts: "kotlin",
  makefile: "make",
  md: "markdown",
  ps1: "powershell",
  pwsh: "powershell",
  protobuf: "proto",
  py: "python",
  rb: "ruby",
  rs: "rust",
  patch: "diff",
  ts: "typescript",
  mts: "typescript",
  cts: "typescript",
  svg: "xml",
  yml: "yaml",
};

export function grammarFor(label: string): GrammarId | null {
  const key = label.toLowerCase();
  if (key in grammars) return key as GrammarId;
  return aliases[key] ?? null;
}
