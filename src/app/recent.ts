/** "today", "3 days ago": when a folder was last opened, in words. */
const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

const DAY = 86_400_000;

export function lastOpened(openedAt: number, now = Date.now()): string {
  const days = Math.floor(now / DAY) - Math.floor(openedAt / DAY);
  if (days <= 0) return "today";
  if (days < 30) return formatter.format(-days, "day");
  const months = Math.floor(days / 30);
  return months < 12
    ? formatter.format(-months, "month")
    : formatter.format(-Math.floor(months / 12), "year");
}

export function documentCount(count: number | null): string | null {
  return count === null ? null : `${count} ${count === 1 ? "document" : "documents"}`;
}
