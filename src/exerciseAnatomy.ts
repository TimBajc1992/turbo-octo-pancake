import type { Candidate } from "./exerciseCatalog";

/** Display-only anatomy. This never changes catalogue identities or training quotas. */
export const muscleRegions = {
  chest: {
    name: "Prsi",
    detail:
      "Prsne mišice približujejo nadlaket pred telo in sodelujejo pri potiskih.",
  },
  frontDelts: {
    name: "Sprednji del ramen",
    detail:
      "Sprednji del deltoidne mišice dviguje roko pred telo in pomaga pri potiskih.",
  },
  sideDelts: {
    name: "Stranski del ramen",
    detail: "Stranski del deltoidne mišice sodeluje pri dvigu roke vstran.",
  },
  rearDelts: {
    name: "Zadnji del ramen",
    detail: "Zadnji del deltoidne mišice pomika nadlaket nazaj in vstran.",
  },
  biceps: {
    name: "Biceps",
    detail: "Upogibalke komolca približujejo podlaket nadlakti.",
  },
  triceps: {
    name: "Triceps",
    detail: "Triceps izteguje komolec pri potiskih in iztegih rok.",
  },
  forearms: {
    name: "Podlakti",
    detail: "Mišice podlakti podpirajo prijem in nadzor zapestja.",
  },
  lats: {
    name: "Široka hrbtna mišica",
    detail: "Široka hrbtna mišica vleče nadlaket proti trupu in nazaj.",
  },
  upperBack: {
    name: "Zgornji del hrbta",
    detail:
      "Trapez in mišice med lopaticama nadzorujejo položaj in gibanje lopatic.",
  },
  spinalErectors: {
    name: "Iztegovalke hrbta",
    detail:
      "Mišice ob hrbtenici pomagajo ohranjati položaj trupa pod obremenitvijo.",
  },
  abs: {
    name: "Trebušne mišice",
    detail:
      "Prema trebušna mišica približuje prsni koš medenici in pomaga stabilizirati trup.",
  },
  obliques: {
    name: "Stranske trebušne",
    detail: "Stranske trebušne mišice nadzorujejo rotacijo in nagib trupa.",
  },
  glutes: {
    name: "Zadnjica",
    detail: "Velika zadnjična mišica sodeluje predvsem pri iztegu kolka.",
  },
  hipAbductors: {
    name: "Stranski del zadnjice",
    detail:
      "Odmikalke kolka, vključno s srednjo zadnjično mišico, odmikajo nogo in stabilizirajo medenico.",
  },
  quads: {
    name: "Sprednje stegenske",
    detail: "Štiriglava stegenska mišica izteguje koleno.",
  },
  hamstrings: {
    name: "Zadnje stegenske",
    detail:
      "Zadnje stegenske mišice upogibajo koleno in sodelujejo pri iztegu kolka.",
  },
  adductors: {
    name: "Notranje stegenske",
    detail:
      "Primikalke približujejo nogo sredini telesa; del skupine pomaga tudi pri iztegu kolka.",
  },
  calves: {
    name: "Meča",
    detail:
      "Mečne mišice dvigujejo peto. Položaj kolena spremeni poudarek med njihovimi deli.",
  },
  hipFlexors: {
    name: "Upogibalke kolka",
    detail:
      "Upogibalke kolka približujejo stegno trupu; velik del skupine leži globlje od prikazane površine.",
  },
} as const;
export type MuscleRegion = keyof typeof muscleRegions;
export type Anatomy = {
  primary: MuscleRegion[];
  secondary: MuscleRegion[];
  note?: string;
};
const profiles: Record<string, Anatomy> = {
  "horizontal-push": {
    primary: ["chest"],
    secondary: ["frontDelts", "triceps"],
  },
  "vertical-push": {
    primary: ["frontDelts", "sideDelts"],
    secondary: ["triceps"],
  },
  "horizontal-pull": {
    primary: ["lats", "upperBack"],
    secondary: ["biceps", "rearDelts"],
  },
  "vertical-pull": { primary: ["lats"], secondary: ["biceps", "upperBack"] },
  "rear-delt": { primary: ["rearDelts"], secondary: ["upperBack"] },
  "lateral-raise": { primary: ["sideDelts"], secondary: ["upperBack"] },
  "chest-fly": { primary: ["chest"], secondary: ["frontDelts"] },
  "elbow-flexion": { primary: ["biceps"], secondary: ["forearms"] },
  "elbow-extension": { primary: ["triceps"], secondary: [] },
  "leg-push": { primary: ["quads", "glutes"], secondary: ["adductors"] },
  "split-squat": {
    primary: ["quads", "glutes"],
    secondary: ["hipAbductors", "hamstrings"],
  },
  "knee-extension": { primary: ["quads"], secondary: [] },
  "knee-flexion": { primary: ["hamstrings"], secondary: ["calves"] },
  "hip-extension": { primary: ["glutes"], secondary: ["hamstrings"] },
  "hip-abduction": { primary: ["hipAbductors"], secondary: [] },
  "hip-hinge": {
    primary: ["hamstrings", "glutes"],
    secondary: ["spinalErectors"],
  },
  deadlift: {
    primary: ["glutes", "quads"],
    secondary: ["hamstrings", "spinalErectors"],
  },
  calf: { primary: ["calves"], secondary: [] },
  trunk: { primary: ["obliques"], secondary: ["abs"] },
  "trunk-flexion": { primary: ["abs"], secondary: ["obliques"] },
  "knee-raise": {
    primary: ["hipFlexors"],
    secondary: ["abs"],
    note: "Kolena dvigajo upogibalke kolka. Trebušne mišice dodatno sodelujejo pri nadzorovanem privihu medenice.",
  },
};

export function anatomyForExercise(c: Candidate): Anatomy {
  if (c.id === "trunk_machine")
    return {
      primary: [],
      secondary: [],
      note: "Za to napravo najprej določi gib. Splošno ime ne pove, katere mišice so glavne.",
    };
  const profile = profiles[c.pattern];
  if (!profile)
    return {
      primary: [],
      secondary: [],
      note: "Za to izvedbo mišice še niso določene.",
    };
  if (c.id === "seated_calf")
    return {
      ...profile,
      note: "Pri pokrčenem kolenu je večji poudarek na globlji mečni mišici (soleus), ki leži pod površinsko mišico.",
    };
  if (
    [
      "barbell_row",
      "overhead_press",
      "barbell_back_squat",
      "goblet_squat",
    ].includes(c.id)
  )
    return {
      ...profile,
      secondary: [...profile.secondary, "spinalErectors"],
    };
  return {
    ...profile,
    primary: [...profile.primary],
    secondary: [...profile.secondary],
  };
}
