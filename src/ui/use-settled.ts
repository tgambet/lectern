import { useEffect, useState } from "preact/hooks";

/** `value` once it has stopped changing for `ms`, so live regions do not chatter. Starts empty. */
export function useSettled(value: string, ms: number): string {
  const [settled, setSettled] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return settled;
}
