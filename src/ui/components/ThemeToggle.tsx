import { nextTheme, themePref, type ThemePref } from "../../app/theme.ts";
import { Icon, type IconName } from "./Icon.tsx";

const view: Record<ThemePref, { icon: IconName; label: string }> = {
  auto: { icon: "auto", label: "Theme: match the system" },
  light: { icon: "sun", label: "Theme: light" },
  dark: { icon: "moon", label: "Theme: dark" },
};

export function ThemeToggle() {
  const { icon, label } = view[themePref.value];
  return (
    <button
      type="button"
      class="lc-btn lc-btn--ghost lc-btn--icon"
      aria-label={`${label}. Switch theme`}
      title={label}
      onClick={() => (themePref.value = nextTheme(themePref.value))}
    >
      <Icon name={icon} />
    </button>
  );
}
