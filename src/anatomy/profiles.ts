import type { Candidate } from "../exerciseCatalog";

export const muscleRegions = {
  chest: {
    name: "Prsi",
    latin: "Pectoralis major",
    action: "Približa nadlaket pred telesom in pomaga pri potisku.",
  },
  "front-deltoids": {
    name: "Ramena",
    latin: "Deltoideus · sprednji in srednji del",
    action: "Dviguje roko pred telo in vstran.",
  },
  "back-deltoids": {
    name: "Zadnji del ramen",
    latin: "Deltoideus · zadnji del",
    action: "Pomaga odmikati nadlaket nazaj in vstran.",
  },
  "upper-back": {
    name: "Široka hrbtna mišica",
    latin: "Latissimus dorsi",
    action: "Vleče nadlaket proti trupu in nazaj.",
  },
  trapezius: {
    name: "Zgornji in srednji hrbet",
    latin: "Trapezius in mišice ob lopaticah",
    action: "Nadzoruje položaj in gibanje lopatic.",
  },
  "lower-back": {
    name: "Obhrbtne mišice",
    latin: "Erector spinae",
    action: "Pomagajo ohranjati stabilen položaj hrbtenice.",
  },
  biceps: {
    name: "Biceps",
    latin: "Biceps brachii",
    action: "Upogiba komolec in pomaga obračati podlaket.",
  },
  triceps: {
    name: "Triceps",
    latin: "Triceps brachii",
    action: "Izteguje komolec.",
  },
  forearm: {
    name: "Podlakti",
    latin: "Mišice podlakti",
    action: "Pomagajo pri prijemu in stabilnem zapestju.",
  },
  abs: {
    name: "Trebušne mišice",
    latin: "Rectus abdominis",
    action: "Pomagajo pri upogibu trupa in nadzoru položaja medenice.",
  },
  obliques: {
    name: "Stranske trebušne mišice",
    latin: "Obliquus externus in internus",
    action: "Pomagajo nadzorovati zasuk, stranski upogib in stabilnost trupa.",
  },
  quadriceps: {
    name: "Sprednje stegenske",
    latin: "Quadriceps femoris",
    action: "Iztegujejo koleno.",
  },
  hamstring: {
    name: "Zadnje stegenske",
    latin: "Hamstrings",
    action: "Upogibajo koleno in pomagajo pri iztegu kolka.",
  },
  gluteal: {
    name: "Zadnjica",
    latin: "Gluteus maximus",
    action: "Izteguje kolk in pomaga nadzorovati položaj medenice.",
  },
  "hip-abductors": {
    name: "Stranski del zadnjice",
    latin: "Gluteus medius in minimus",
    action: "Odmika nogo in pomaga stabilizirati medenico.",
  },
  adductor: {
    name: "Notranje stegenske",
    latin: "Adductores",
    action:
      "Primikajo nogo; pri nekaterih gibih pomagajo tudi pri iztegu kolka.",
  },
  calves: {
    name: "Meča",
    latin: "Gastrocnemius in soleus",
    action: "Dvigujejo peto oziroma iztegujejo gleženj.",
  },
} as const;
export type MuscleRegion = keyof typeof muscleRegions;
export type MuscleRole = "primary" | "secondary" | "stabilizer";
export const roleLabels: Record<MuscleRole, string> = {
  primary: "Glavno delo",
  secondary: "Pomoč pri gibu",
  stabilizer: "Stabilizacija",
};
export type AnatomyProfile = {
  primary: readonly MuscleRegion[];
  secondary: readonly MuscleRegion[];
  stabilizer: readonly MuscleRegion[];
  note: string;
};
const profile = (
  primary: MuscleRegion[],
  secondary: MuscleRegion[] = [],
  stabilizer: MuscleRegion[] = [],
  note = "",
): AnatomyProfile => ({ primary, secondary, stabilizer, note });

/** Illustration-only roles. These never change a stored exercise or planning quota. */
export function exerciseAnatomy(c: Candidate): AnatomyProfile {
  switch (c.pattern) {
    case "horizontal-push":
      return profile(
        ["chest"],
        ["triceps", "front-deltoids"],
        c.id === "push_up" ? ["abs", "obliques"] : [],
        c.id.includes("incline")
          ? "Naklon klopi spremeni poudarek v prsih in sodelovanje sprednjega dela ramen."
          : "Pri potisku sodelujeta tudi triceps in sprednji del ramen.",
      );
    case "chest-fly":
      return profile(
        ["chest"],
        ["front-deltoids"],
        [],
        "Poudarek je na približevanju nadlakti, ne na iztegu komolcev.",
      );
    case "horizontal-pull":
      return profile(
        ["upper-back", "trapezius"],
        ["biceps", "back-deltoids"],
        c.id === "barbell_row" ? ["lower-back", "abs", "forearm"] : ["forearm"],
      );
    case "vertical-pull":
      return profile(
        ["upper-back"],
        ["biceps", "trapezius"],
        ["forearm", "abs"],
      );
    case "vertical-push":
      return profile(
        ["front-deltoids"],
        ["triceps"],
        c.id === "overhead_press" ? ["abs", "obliques"] : [],
        "Glavni poudarek je na sprednjem in srednjem delu ramen.",
      );
    case "lateral-raise":
      return profile(
        ["front-deltoids"],
        ["trapezius"],
        [],
        "Pri stranskem dvigu je poudarek na srednjem delu ramenske mišice; shema ga prikazuje skupaj s sprednjim delom.",
      );
    case "rear-delt":
      return profile(
        ["back-deltoids"],
        ["trapezius"],
        [],
        "Poudarek je na zadnjem delu ramen in nadzoru lopatic.",
      );
    case "elbow-flexion":
      return profile(
        ["biceps"],
        ["forearm"],
        [],
        "Prijem in položaj nadlakti vplivata na sodelovanje mišic upogibalk komolca.",
      );
    case "elbow-extension":
      return profile(
        ["triceps"],
        [],
        [],
        c.id.includes("overhead") || c.id === "oh_extension"
          ? "Položaj nad glavo spremeni dolžino dolge glave tricepsa."
          : "Nadlakti ostanejo stabilne, gib poteka v komolcih.",
      );
    case "leg-push":
      return profile(
        ["quadriceps"],
        ["gluteal", "adductor"],
        c.mode === "barbell" || c.id === "goblet_squat"
          ? ["abs", "lower-back"]
          : [],
        "Globina giba in položaj stopal vplivata na razmerje dela kolen in kolkov.",
      );
    case "split-squat":
      return profile(
        ["quadriceps"],
        ["gluteal", "adductor"],
        ["hip-abductors", "abs"],
        "Prikaz pokaže obe strani; pri enonožni izvedbi se osredotoči na delovno nogo.",
      );
    case "knee-extension":
      return profile(["quadriceps"]);
    case "knee-flexion":
      return profile(
        ["hamstring"],
        ["calves"],
        [],
        "Glavni gib je upogib kolena. Sedeči in ležeči položaj spremenita dolžino zadnjih stegenskih mišic.",
      );
    case "hip-extension":
      return profile(
        ["gluteal"],
        ["hamstring"],
        c.id === "cable_glute_kickback" ? ["abs", "hip-abductors"] : ["abs"],
      );
    case "hip-abduction":
      return profile(
        ["hip-abductors"],
        [],
        [],
        "Poudarek je na odmikanju kolkov in stranskem delu zadnjice.",
      );
    case "hip-hinge":
      return profile(
        c.id === "back_extension" ? ["gluteal"] : ["hamstring"],
        c.id === "back_extension" ? ["hamstring"] : ["gluteal"],
        ["lower-back", "abs"],
        "Gib izhaja iz kolkov; obhrbtne mišice pomagajo ohranjati položaj trupa.",
      );
    case "deadlift":
      return profile(
        ["gluteal"],
        ["hamstring", "quadriceps", "adductor"],
        ["lower-back", "abs", "trapezius", "forearm"],
        "Večsklepni gib vključuje noge in kolke; trup in prijem prenašata obremenitev.",
      );
    case "calf":
      return profile(
        ["calves"],
        [],
        [],
        c.id === "seated_calf"
          ? "Pri pokrčenih kolenih je večji poudarek na globlji mečni mišici soleus."
          : "Pri iztegnjenih kolenih sodelujeta obe glavni mečni mišici.",
      );
    case "trunk":
      return profile(
        ["obliques", "abs"],
        [],
        [],
        "Pri Pallof Pressu mišice trupa predvsem preprečujejo zasuk.",
      );
    case "trunk-flexion":
      return profile(["abs"], ["obliques"]);
    case "trunk-machine":
      return profile(
        ["abs", "obliques"],
        [],
        [],
        "Točna vrsta naprave še ni določena; poudarek na posamezni mišici je odvisen od njenega giba.",
      );
    case "knee-raise":
      return profile(
        ["abs"],
        ["obliques"],
        ["forearm"],
        "Pri dvigu nog sodelujejo tudi upogibalke kolka; trebušne mišice nadzorujejo položaj medenice.",
      );
    default:
      return profile([], [], [], "Za to izvedbo mišični prikaz še ni določen.");
  }
}
export function muscleRole(
  p: AnatomyProfile,
  region: string,
): MuscleRole | undefined {
  const key =
    region === "left-soleus" || region === "right-soleus" ? "calves" : region;
  return (["primary", "secondary", "stabilizer"] as const).find((role) =>
    p[role].includes(key as MuscleRegion),
  );
}
export function anatomyView(p: AnatomyProfile): "front" | "back" {
  return p.primary.some((r) =>
    [
      "chest",
      "front-deltoids",
      "biceps",
      "abs",
      "obliques",
      "quadriceps",
    ].includes(r),
  )
    ? "front"
    : "back";
}
