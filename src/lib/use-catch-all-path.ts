"use client";
import { usePathname } from "next/navigation";
import { useMemo } from "react";

const decode = (segment: string) => {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
};

/**
 * Segments after the section, read from the browser URL (e.g. /patients/123/edit -> ["123", "edit"]).
 * Used instead of route params so the app also works as a static export, where every /section/* URL is served
 * the same pre-rendered /section page.
 */
export function useCatchAllPath(): readonly string[] {
  const pathname = usePathname() || "";
  return useMemo(() => pathname.split("/").filter(Boolean).slice(1).map(decode), [pathname]);
}
