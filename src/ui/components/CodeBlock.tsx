import type { ComponentChildren } from "preact";
import { useRef, useState } from "preact/hooks";
import { Icon } from "./Icon.tsx";

/** `lc-code`: a fenced code block with its language and a copy button. */
export function CodeBlock(props: { children?: ComponentChildren; "data-lang"?: string }) {
  const pre = useRef<HTMLPreElement>(null);
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(pre.current?.textContent ?? "");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard refused (no focus, or permission): nothing to do.
    }
  };
  return (
    <div class="lc-code">
      <div class="lc-code__bar">
        <span class="lc-code__lang">{props["data-lang"] ?? "text"}</span>
        <button type="button" class="lc-btn lc-btn--ghost" onClick={copy} aria-live="polite">
          <Icon name={copied ? "check" : "copy"} />
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre ref={pre}>{props.children}</pre>
    </div>
  );
}
