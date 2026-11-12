import type { ComponentChildren } from "preact";
import { LogoMark } from "./Logo.tsx";

/** `lc-resume`: the resume screen card, also used for the first run. */
export function ResumeCard(props: {
  title: ComponentChildren;
  meta?: ComponentChildren;
  lede?: ComponentChildren;
  note: string;
  children: ComponentChildren;
}) {
  return (
    <div class="lc-resume">
      <LogoMark class="lc-resume__mark" />
      <p class="lc-resume__name">Lectern</p>
      <h1 class="lc-resume__title">{props.title}</h1>
      {props.meta && <p class="lc-resume__meta">{props.meta}</p>}
      {props.lede && <p class="lc-resume__lede">{props.lede}</p>}
      <div class="lc-resume__actions">{props.children}</div>
      <p class="lc-resume__note">{props.note}</p>
    </div>
  );
}
