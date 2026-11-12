function LecternMark({ class: className }: { class: string }) {
  return (
    <svg class={className} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <path d="M6.8 20.8 L9 28 L55 14" />
      <path d="M32.9 20.7 V51" />
      <path d="M21 52 H44.8" />
    </svg>
  );
}

/** Header lockup: the mark and the name. */
export function Logo() {
  return (
    <span class="lc-logo">
      <LecternMark class="lc-logo__mark" />
      <span class="lc-logo__name">Lectern</span>
    </span>
  );
}

/** The mark alone, decorative, sized by `className` (56 px in the resume card). */
export function LogoMark({ class: className }: { class: string }) {
  return <LecternMark class={className} />;
}
