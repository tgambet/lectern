import type { ComponentChildren } from "preact";
import { Icon, type IconName } from "./Icon.tsx";

const icons: Record<NoticeKind, IconName> = { info: "info", warn: "alert", danger: "alert" };

export type NoticeKind = "info" | "warn" | "danger";

/** The label word is required: color only reinforces it. */
export function Notice(props: {
  kind: NoticeKind;
  label: string;
  children: ComponentChildren;
  actions?: ComponentChildren;
  /** Appeared because of what the reader did: announce it. */
  live?: boolean;
}) {
  return (
    <div class={`lc-notice lc-notice--${props.kind}`} role={props.live ? "alert" : "note"}>
      <p class="lc-notice__head">
        <Icon name={icons[props.kind]} />
        {props.label}
      </p>
      <p>{props.children}</p>
      {props.actions && <div class="lc-notice__actions">{props.actions}</div>}
    </div>
  );
}
