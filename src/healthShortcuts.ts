import { getCoach } from "./coach";
import { type Daily, type State } from "./model";

export interface HealthBridge {
  enabled: boolean;
  token: string;
  lastImportAt?: string;
  lastSource?: string;
  lastDate?: string;
}
export const healthFormat = "tezisce-health-shortcuts";
const dailyLimits = {
  steps: 200000,
  moveKcal: 20000,
  exerciseMin: 1440,
  standHours: 24,
} as const;
const observationLimits = { hrvSDNN: 1000, restingHeartRate: 250 } as const;
const timestamp = (v: unknown): v is string =>
  typeof v === "string" &&
  /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(v) &&
  Number.isFinite(Date.parse(v));
const day = (v: unknown): v is string => {
  if (typeof v !== "string" || !/^\d{4}-\d\d-\d\d$/.test(v)) return false;
  const parsed = new Date(v + "T12:00:00Z");
  return (
    Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === v
  );
};
export function validateHealthBridge(
  value: unknown,
): asserts value is HealthBridge {
  const c = value as HealthBridge;
  if (
    !c ||
    typeof c !== "object" ||
    Array.isArray(c) ||
    typeof c.enabled !== "boolean" ||
    typeof c.token !== "string" ||
    !/^[a-f0-9-]{36}$/.test(c.token) ||
    (c.lastImportAt !== undefined && !timestamp(c.lastImportAt)) ||
    (c.lastDate !== undefined && !day(c.lastDate)) ||
    (c.lastSource !== undefined &&
      (typeof c.lastSource !== "string" || c.lastSource.length > 100))
  )
    throw Error("Neveljavne nastavitve prenosa Apple Health.");
}
export function takeHealthFragment(): string | undefined {
  if (!location.hash.startsWith("#health=")) return;
  const raw = location.hash.slice(8);
  // Never retain health data in the visible URL or forward it in a request.
  history.replaceState(null, "", location.pathname + location.search);
  if (raw.length > 20000) return "invalid";
  try {
    return decodeURIComponent(raw);
  } catch {
    return "invalid";
  }
}
function numeric(value: unknown, max: number, positive = false): number {
  // Shortcuts dictionaries may serialize a Number as text in the phone's locale.
  const n =
    typeof value === "string" && /^\d+(?:[.,]\d+)?$/.test(value)
      ? Number(value.replace(",", "."))
      : value;
  if (
    typeof n !== "number" ||
    !Number.isFinite(n) ||
    n < 0 ||
    (positive && n === 0) ||
    n > max
  )
    throw Error(
      "Prenos vsebuje neveljavno vrednost ali enoto. Podatki niso bili spremenjeni.",
    );
  return n;
}
export function applyHealthTransfer(
  state: State,
  text: string,
  now = new Date().toISOString(),
): State {
  const config = state.healthBridge;
  if (!config?.enabled)
    throw Error(
      "Najprej v Nastavitvah omogoči sprejem iz Bližnjic v tem brskalniku.",
    );
  if (text.length > 12000)
    throw Error("Prenos je prevelik. Pošlji samo dnevni povzetek.");
  let p: Record<string, unknown>;
  try {
    p = JSON.parse(text);
  } catch {
    throw Error("Neveljaven prenos iz Bližnjic.");
  }
  if (
    !p ||
    typeof p !== "object" ||
    Array.isArray(p) ||
    p.format !== healthFormat ||
    p.version !== 1
  )
    throw Error("Nepodprta oblika prenosa iz Bližnjic.");
  if (p.token !== config.token)
    throw Error(
      "Koda Bližnjice se ne ujema s tem brskalnikom. Preveri nastavitve prenosa.",
    );
  const keys = [
    "format",
    "version",
    "token",
    "source",
    "date",
    "updatedAt",
    ...Object.keys(dailyLimits),
    ...Object.keys(observationLimits),
    "hrvMeasuredAt",
    "restMeasuredAt",
  ];
  if (
    Object.keys(p).some((k) => !keys.includes(k)) ||
    !day(p.date) ||
    !timestamp(p.updatedAt) ||
    typeof p.source !== "string" ||
    !p.source.trim() ||
    p.source.length > 100
  )
    throw Error("Preveri datum, čas, vir in polja prenosa iz Bližnjic.");
  if (Date.parse(p.updatedAt) > Date.parse(now) + 600000)
    throw Error("Čas prenosa je v prihodnosti. Preveri uro na iPhonu.");
  const source = p.source.trim();
  const prefix = `apple-shortcuts:${encodeURIComponent(source)}:${p.date}`;
  const previous = state.daily.find((d) => d.id === prefix);
  if (previous?.modifiedAt)
    throw Error(
      "Ta preneseni dnevni zapis je bil ročno spremenjen. Samodejna zamenjava je ustavljena.",
    );
  const values: Partial<Daily> = {};
  let count = 0;
  for (const [key, max] of Object.entries(dailyLimits)) {
    if (p[key] === undefined) continue;
    const value = numeric(p[key], max);
    if ((key === "steps" || key === "standHours") && !Number.isInteger(value))
      throw Error("Koraki in ure stanja morajo biti cela števila.");
    (values as Record<string, number>)[key] = value;
    count++;
  }
  const coach = getCoach(state);
  let observations = [...(coach.observations ?? [])];
  for (const [metric, max] of Object.entries(observationLimits)) {
    if (p[metric] === undefined) continue;
    const value = numeric(p[metric], max, true);
    const measuredAt =
      p[metric === "hrvSDNN" ? "hrvMeasuredAt" : "restMeasuredAt"];
    if (
      !timestamp(measuredAt) ||
      Date.parse(measuredAt) > Date.parse(p.updatedAt) + 60000
    )
      throw Error("HRV in utrip v mirovanju potrebujeta dejanski čas meritve.");
    const externalId = `${prefix}:${metric}`;
    const old = observations.find((o) => o.externalId === externalId);
    if (!old || Date.parse(measuredAt) >= Date.parse(old.measuredAt)) {
      observations = observations.filter((o) => o.externalId !== externalId);
      observations.push({
        metric: metric as "hrvSDNN" | "restingHeartRate",
        value,
        measuredAt,
        externalId,
        source: "apple-shortcuts",
        context: "unknown",
        quality: "unknown",
      });
    }
    count++;
  }
  if (!count)
    throw Error(
      "Prenos ne vsebuje meritev. Manjkajočih podatkov ne nadomesti z ničlami.",
    );
  const hasDaily = Object.keys(values).length > 0;
  const older =
    previous?.measuredAt &&
    Date.parse(previous.measuredAt) > Date.parse(p.updatedAt);
  const record: Daily = {
    ...previous,
    ...values,
    id: prefix,
    date: p.date,
    source: "apple-shortcuts",
    sourceId: source,
    externalId: prefix,
    measuredAt: p.updatedAt,
    syncedAt: now,
    note: "Dnevni povzetek enega izbranega vira iz Apple Health prek Bližnjic; morda ne vključuje vseh naprav.",
  };
  return {
    ...state,
    daily:
      hasDaily && !older
        ? [...state.daily.filter((d) => d.id !== prefix), record]
        : state.daily,
    coach:
      count > Object.keys(values).length
        ? { ...coach, observations }
        : state.coach,
    healthBridge: {
      ...config,
      lastImportAt: now,
      lastDate: p.date,
      lastSource: source,
    },
  };
}
