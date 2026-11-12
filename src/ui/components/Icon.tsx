// The brand book's icon set: 16 px, stroke 1.5, currentColor, no fills. Drawn to spec.
const paths = {
  chevron: <path d="M6 4l4 4-4 4" />,
  folder: (
    <path d="M2 4a1 1 0 0 1 1-1h3l1.5 1.5H13a1 1 0 0 1 1 1V12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1z" />
  ),
  document: (
    <>
      <path d="M4 2h5l3 3v9H4z" />
      <path d="M9 2v3h3" />
      <path d="M6 8.5h4M6 11h4" />
    </>
  ),
  search: (
    <>
      <circle cx="7" cy="7" r="4.5" />
      <path d="M10.5 10.5L14 14" />
    </>
  ),
  sun: (
    <>
      <circle cx="8" cy="8" r="3" />
      <path d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M3.4 12.6l1.1-1.1M11.5 4.5l1.1-1.1" />
    </>
  ),
  moon: <path d="M13 9.5A5.5 5.5 0 0 1 6.5 3a5.5 5.5 0 1 0 6.5 6.5z" />,
  auto: (
    <>
      <circle cx="8" cy="8" r="5.5" />
      <path d="M8 2.5v11" />
    </>
  ),
  copy: (
    <>
      <rect x="5.5" y="5.5" width="8" height="8" rx="1" />
      <path d="M3 10.5V3.5a1 1 0 0 1 1-1h6.5" />
    </>
  ),
  check: <path d="M3 8.5l3 3 7-7" />,
  width: (
    <>
      <path d="M2 3.5v9M14 3.5v9" />
      <path d="M5 8h6M6.5 6.5L5 8l1.5 1.5M9.5 6.5L11 8l-1.5 1.5" />
    </>
  ),
  zen: (
    <path d="M2 6V2.5a.5.5 0 0 1 .5-.5H6M10 2h3.5a.5.5 0 0 1 .5.5V6M14 10v3.5a.5.5 0 0 1-.5.5H10M6 14H2.5a.5.5 0 0 1-.5-.5V10" />
  ),
  close: <path d="M4 4l8 8M12 4l-8 8" />,
  more: (
    <>
      <circle cx="3.5" cy="8" r="0.75" />
      <circle cx="8" cy="8" r="0.75" />
      <circle cx="12.5" cy="8" r="0.75" />
    </>
  ),
  alert: (
    <>
      <path d="M8 2.5l6 10.5H2z" />
      <path d="M8 7v3M8 11.8v.01" />
    </>
  ),
  info: (
    <>
      <circle cx="8" cy="8" r="6" />
      <path d="M8 7.5v3.5M8 5v.01" />
    </>
  ),
  bookmark: <path d="M4 2.5h8V14l-4-3-4 3z" />,
  bookmarked: (
    <>
      <path d="M4 2.5h8V14l-4-3-4 3z" />
      <path d="M6 6.2l1.5 1.5L10 5" />
    </>
  ),
  note: (
    <>
      <path d="M2.5 3h11v8H7l-3 2.5V11H2.5z" />
      <path d="M5 5.75h6M5 8.25h4" />
    </>
  ),
  list: <path d="M3 4h10M3 8h10M3 12h6" />,
} as const;

export type IconName = keyof typeof paths;

export function Icon({
  name,
  class: className,
  "data-open": open,
}: {
  name: IconName;
  class?: string;
  "data-open"?: string;
}) {
  return (
    <svg
      data-open={open}
      class={className ? `lc-ic ${className}` : "lc-ic"}
      viewBox="0 0 16 16"
      aria-hidden="true"
      focusable="false"
    >
      {paths[name]}
    </svg>
  );
}
