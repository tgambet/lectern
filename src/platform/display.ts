/** True when running as an installed app window (not a browser tab). */
export function isInstalledApp(): boolean {
  return matchMedia("(display-mode: standalone)").matches;
}
