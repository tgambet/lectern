import type { ComponentChildren } from "preact";
import { useId, useLayoutEffect, useRef } from "preact/hooks";
import { Icon } from "./Icon.tsx";

/**
 * `lc-dialog`: a native modal, so the browser traps focus, closes on Escape and
 * gives focus back to what opened it. Render it to open it; unmount it to close it.
 */
export function Dialog(props: {
  title: string;
  onClose: () => void;
  /** A click on the backdrop closes it. Not where the reader may be typing. */
  lightDismiss?: boolean;
  children: ComponentChildren;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useLayoutEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => {
      if (element?.open) element.close();
    };
  }, []);

  return (
    <dialog
      class="lc-dialog"
      ref={dialog}
      aria-labelledby={titleId}
      onClose={props.onClose}
      {...(props.lightDismiss ? { closedby: "any" } : {})}
    >
      <div class="lc-dialog__head">
        <h2 class="lc-dialog__title" id={titleId}>
          {props.title}
        </h2>
        <button
          type="button"
          class="lc-btn lc-btn--ghost lc-btn--icon"
          aria-label="Close"
          title="Close"
          onClick={props.onClose}
        >
          <Icon name="close" />
        </button>
      </div>
      <div class="lc-dialog__body">{props.children}</div>
    </dialog>
  );
}
