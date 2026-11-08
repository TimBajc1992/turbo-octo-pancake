import { useSyncExternalStore } from "react";

export const anatomyPalettes = [
  {
    id: "copper",
    name: "Železo in baker",
    primary: "#d17a4d",
    secondary: "#dec392",
  },
  {
    id: "olive",
    name: "Bron in oljka",
    primary: "#d9ad63",
    secondary: "#a9bd94",
  },
  {
    id: "blue",
    name: "Jeklo in modrina",
    primary: "#70b7e0",
    secondary: "#b5c6db",
  },
] as const;
export type AnatomyPalette = (typeof anatomyPalettes)[number]["id"];
const key = "moc-forma:anatomy-palette",
  event = "moc-forma:anatomy-palette-changed";
let fallback: AnatomyPalette = "copper";
export const isAnatomyPalette = (value: unknown): value is AnatomyPalette =>
  anatomyPalettes.some((p) => p.id === value);
function read(): AnatomyPalette {
  try {
    const value = localStorage.getItem(key);
    return isAnatomyPalette(value) ? value : fallback;
  } catch {
    return fallback;
  }
}
function subscribe(fn: () => void) {
  window.addEventListener("storage", fn);
  window.addEventListener(event, fn);
  return () => {
    window.removeEventListener("storage", fn);
    window.removeEventListener(event, fn);
  };
}
export function useAnatomyPalette() {
  const value = useSyncExternalStore(subscribe, read, () => "copper" as const);
  const change = (next: AnatomyPalette) => {
    if (!isAnatomyPalette(next)) return;
    fallback = next;
    try {
      localStorage.setItem(key, next);
    } catch {
      /* Keep the visual choice when persistence is unavailable. */
    }
    window.dispatchEvent(new Event(event));
  };
  return [value, change] as const;
}
