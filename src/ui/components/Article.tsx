import type { Root } from "hast";
import { toJsxRuntime, type Components } from "hast-util-to-jsx-runtime";
import { Fragment, jsx, jsxs } from "preact/jsx-runtime";
import { CodeBlock } from "./CodeBlock.tsx";
import { Icon, type IconName } from "./Icon.tsx";
import { NoteRef } from "./Marks.tsx";

/** Icons placed by trusted transforms (alerts), never by the document. */
function TrustedIcon({ name }: { name: IconName }) {
  return <Icon name={name} />;
}

const components = {
  pre: CodeBlock,
  "lc-icon": TrustedIcon,
  "lc-note-ref": NoteRef,
} as unknown as Partial<Components>;

/**
 * Renders a sanitized tree as Preact elements: no `innerHTML`, so the strict
 * CSP needs no exception.
 */
export function Article({ tree }: { tree: Root }) {
  return toJsxRuntime(tree, {
    Fragment,
    jsx: jsx as never,
    jsxs: jsxs as never,
    elementAttributeNameCase: "html",
    stylePropertyNameCase: "css",
    components,
  });
}
