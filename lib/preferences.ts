import type { SourceKind, VisualMode, VisualStyle } from "./catalog";
export interface Preferences { volumes: Record<SourceKind,number>; visualMode: VisualMode; visualStyle: VisualStyle }
export const preferenceKey = "obliterator.preferences.v1";
export function readPreferences(storage: Pick<Storage,"getItem">, reduced: boolean): Preferences {
  const defaults: Preferences = {volumes:{music:50,asmr:50,"pink-noise":20},visualMode:reduced ? "still" : "motion",visualStyle:"particles"};
  try {
    const raw = JSON.parse(storage.getItem(preferenceKey) ?? "null");
    if (!raw || typeof raw !== "object") return defaults;
    for (const kind of ["music","asmr","pink-noise"] as const) {
      const n = raw.volumes?.[kind];
      if (typeof n === "number" && Number.isFinite(n)) defaults.volumes[kind] = Math.max(0,Math.min(100,Math.round(n)));
    }
    if (["motion","still","off"].includes(raw.visualMode)) defaults.visualMode = raw.visualMode;
    if (["particles","contours"].includes(raw.visualStyle)) defaults.visualStyle = raw.visualStyle;
    if (reduced && defaults.visualMode === "motion") defaults.visualMode = "still";
  } catch { /* Storage may be disabled or contain a partial write. */ }
  return defaults;
}
export function savePreferences(storage: Pick<Storage,"setItem">, preferences: Preferences) {
  try { storage.setItem(preferenceKey, JSON.stringify(preferences)); } catch { /* Memory-only session. */ }
}
