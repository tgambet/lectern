import type { ComponentChildren } from "preact";
import { useRef, useState } from "preact/hooks";
import { Icon, type IconName } from "./Icon.tsx";
import { useDismiss } from "./use-dismiss.ts";

/** Runs a menu action, then closes the menu and returns focus to its button. */
export type Pick = (action: () => void) => () => void;

/** An icon button opening an `lc-menu`; Escape or a click outside closes it. */
export function Menu(props: {
  id: string;
  label: string;
  icon: IconName;
  class: string;
  children: (pick: Pick) => ComponentChildren;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useDismiss(open, () => setOpen(false), root, trigger);
  const pick: Pick = (action) => () => {
    action();
    setOpen(false);
    trigger.current?.focus();
  };

  return (
    <div class={props.class} ref={root}>
      <button
        type="button"
        class="lc-btn lc-btn--ghost lc-btn--icon"
        ref={trigger}
        aria-label={props.label}
        title={props.label}
        aria-expanded={open}
        aria-controls={props.id}
        onClick={() => setOpen(!open)}
      >
        <Icon name={props.icon} />
      </button>
      {open && (
        <div class="lc-menu" id={props.id}>
          {props.children(pick)}
        </div>
      )}
    </div>
  );
}

/** One option of a single choice, shown with a check when chosen. */
export function MenuChoice(props: {
  checked: boolean;
  onClick: () => void;
  children: ComponentChildren;
}) {
  return (
    <button type="button" class="lc-btn" aria-pressed={props.checked} onClick={props.onClick}>
      {props.checked ? <Icon name="check" /> : <span class="lc-menu__mark" />}
      {props.children}
    </button>
  );
}
