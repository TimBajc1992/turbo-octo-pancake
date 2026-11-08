import { useId } from "react";
import type { Candidate } from "../exerciseCatalog";
import { backAnatomy, frontAnatomy, type AnatomyShape } from "./shapes";
import {
  anatomyView,
  exerciseAnatomy,
  muscleRegions,
  muscleRole,
  type AnatomyProfile,
  type MuscleRegion,
} from "./profiles";
import { useAnatomyPalette } from "./preferences";

const hipShapes: Record<"front" | "back", AnatomyShape[]> = {
  front: [
    {
      region: "hip-abductors",
      points: [
        "30 80 34 84 34 91 29 100 27 96 28 86",
        "66 84 69 80 72 86 73 96 71 100 66 91",
      ],
    },
  ],
  back: [
    {
      region: "hip-abductors",
      points: [
        "35 85 44 97 37 100 30 106 28 112 27 102 30 92",
        "65 85 70 92 73 102 72 112 70 106 63 100 56 97",
      ],
    },
  ],
};

function roundedShape(points: string) {
  const coords = points.trim().split(/\s+/).map(Number);
  const pairs = Array.from({ length: coords.length / 2 }, (_, i) => [
    coords[i * 2],
    coords[i * 2 + 1],
  ]);
  const mid = (a: number[], b: number[]) => [
    (a[0] + b[0]) / 2,
    (a[1] + b[1]) / 2,
  ];
  return (
    "M" +
    mid(pairs.at(-1)!, pairs[0]).join(" ") +
    pairs
      .map(
        (p, i) =>
          "Q" +
          p.join(" ") +
          " " +
          mid(p, pairs[(i + 1) % pairs.length]).join(" "),
      )
      .join(" ") +
    "Z"
  );
}
function Body({
  view,
  profile,
  name,
  selected,
}: {
  view: "front" | "back";
  profile: AnatomyProfile;
  name: string;
  selected?: MuscleRegion;
}) {
  const id = useId().replace(/:/g, "");
  const shapes = [
    ...(view === "front" ? frontAnatomy : backAnatomy),
    ...hipShapes[view],
  ];
  const roleText = (["primary", "secondary", "stabilizer"] as const)
    .filter((role) => profile[role].length)
    .map(
      (role) =>
        `${role === "primary" ? "Glavno delo" : role === "secondary" ? "Pomoč pri gibu" : "Stabilizacija"}: ${profile[role].map((r) => muscleRegions[r].name).join(", ")}`,
    )
    .join(". ");
  return (
    <svg
      className="muscle-body"
      viewBox="-9 -4 118 239"
      role="img"
      aria-labelledby={id + "title"}
      aria-describedby={id + "desc"}
    >
      <title id={id + "title"}>
        {name}: mišice {view === "front" ? "od spredaj" : "od zadaj"}
      </title>
      <desc id={id + "desc"}>{roleText}</desc>
      <defs>
        <linearGradient id={id + "neutral"} x1="0" x2="1" y1="0" y2="0.7">
          <stop stopColor="#a0adb4" />
          <stop offset="0.32" stopColor="#667985" />
          <stop offset="0.68" stopColor="#8a9ba5" />
          <stop offset="1" stopColor="#3e515d" />
        </linearGradient>
        <linearGradient id={id + "primary"} x1="0" x2="1" y1="0" y2="0.8">
          <stop className="anatomy-light" />
          <stop offset="0.38" className="anatomy-primary" />
          <stop offset="1" className="anatomy-primary-dark" />
        </linearGradient>
        <linearGradient id={id + "secondary"} x1="0" x2="1" y1="0" y2="1">
          <stop className="anatomy-secondary-light" />
          <stop offset="1" className="anatomy-secondary" />
        </linearGradient>
        <pattern
          id={id + "hatch"}
          width="4"
          height="4"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(35)"
        >
          <path
            d="M0 0V4"
            stroke="#14242e"
            strokeOpacity=".32"
            strokeWidth=".6"
          />
        </pattern>
        <radialGradient id={id + "halo"}>
          <stop stopColor="var(--anatomy-primary)" stopOpacity=".14" />
          <stop offset="1" stopColor="var(--anatomy-primary)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="50" cy="100" rx="59" ry="96" fill={`url(#${id}halo)`} />
      <ellipse cx="50" cy="232" rx="35" ry="2" fill="#000" opacity=".25" />
      <g fill="#415661" stroke="#20343e" strokeWidth=".6">
        {view === "front" ? (
          <path d="M44 24Q42 31 36 34L26 36Q19 37 19 47L16 64 12 72 8 80 0 100 5 105 17 88 24 77 29 62 31 68Q34 77 32 85L28 96 26 113 26 135 28 151Q21 168 22 187L21 197 27 199Q35 182 37 168L38 154 44 138 48 113H52L56 138 62 154 63 168Q65 182 73 199L79 197 78 187Q79 168 72 151L74 135 74 113 72 96 68 85Q66 77 69 68L71 62 76 77 83 88 95 105 100 100 92 80 88 72 84 64 81 47Q81 37 74 36L64 34Q58 31 56 24L50 32Z" />
        ) : (
          <path d="M45 20Q44 29 38 33L26 37Q18 39 17 46L14 65 12 75 6 86 0 106 5 111 17 94 23 81 28 63 31 73Q34 84 30 96L28 113 27 135 29 152 30 159Q25 175 24 191L28 201 31 202Q39 191 39 173L41 163 47 145 50 130 53 145 59 163 61 173Q61 191 69 202L72 201 76 191Q75 175 70 159L71 152 73 135 72 113 70 96Q66 84 69 73L72 63 77 81 83 94 95 111 100 106 94 86 88 75 86 65 83 46Q82 39 74 37L62 33Q56 29 55 20Z" />
        )}
      </g>
      <g className="anatomy-extremities" fill={`url(#${id}neutral)`}>
        {view === "front" ? (
          <>
            <path d="M0 99L6 102 3 111-2 119-5 117-4 108Z M94 102L100 99 104 108 105 117 102 119 97 111Z" />
            <path d="M21 194L27 194 28 207 31 215 30 222 17 224 14 220 18 211Z M73 194L79 194 82 211 86 220 83 224 70 222 69 215 72 207Z" />
          </>
        ) : (
          <>
            <path d="M0 105L6 109 3 119-2 126-5 124-4 114Z M94 109L100 105 104 114 105 124 102 126 97 119Z" />
            <path d="M28 215L32 215 33 225 29 230 24 228 26 221Z M68 215L72 215 74 221 76 228 71 230 67 225Z" />
          </>
        )}
      </g>
      {shapes.map((shape, i) => {
        const role = muscleRole(profile, shape.region);
        const canonical = shape.region.includes("soleus")
          ? "calves"
          : shape.region;
        const emphasized = !selected || canonical === selected;
        const fill =
          role === "primary"
            ? "primary"
            : role === "secondary"
              ? "secondary"
              : "neutral";
        return (
          <g
            key={i}
            data-muscle-region={shape.region}
            data-muscle-role={role ?? "inactive"}
            opacity={emphasized ? 1 : 0.22}
          >
            {shape.points.map((points, j) => (
              <g key={j}>
                <path
                  d={roundedShape(points)}
                  fill={`url(#${id}${fill})`}
                  stroke={
                    role === "stabilizer"
                      ? "var(--anatomy-secondary)"
                      : role
                        ? "var(--anatomy-primary-dark)"
                        : "#182b36"
                  }
                  strokeWidth={role === "stabilizer" ? 0.9 : 0.55}
                  strokeDasharray={role === "stabilizer" ? "1.5 1" : undefined}
                />
                {role === "secondary" && (
                  <path d={roundedShape(points)} fill={`url(#${id}hatch)`} />
                )}
              </g>
            ))}
          </g>
        );
      })}
      {view === "front" && (
        <path
          d="M45 70H54M43 77H56M43 85H56M44 93H55"
          stroke="#162b34"
          opacity=".45"
          strokeWidth=".7"
        />
      )}
      <path d="M50 5V18" stroke="#f0f5f6" opacity=".2" strokeWidth=".8" />
    </svg>
  );
}

export function MuscleAtlas({
  exercise,
  compact = false,
  selected,
}: {
  exercise: Candidate;
  compact?: boolean;
  selected?: MuscleRegion;
}) {
  const profile = exerciseAnatomy(exercise),
    [palette] = useAnatomyPalette();
  const views = compact ? [anatomyView(profile)] : (["front", "back"] as const);
  return (
    <div
      className={`muscle-atlas ${compact ? "muscle-atlas-compact" : ""}`}
      data-anatomy-palette={palette}
    >
      {!compact && (
        <div className="atlas-topline">
          <span>ATLAS MIŠIC</span>
          <span>MOČ & FORMA / 01</span>
        </div>
      )}
      <div className="atlas-bodies">
        {views.map((view) => (
          <figure key={view} className="atlas-body-view">
            <Body
              view={view as "front" | "back"}
              profile={profile}
              name={exercise.name}
              selected={selected}
            />
            <figcaption>{view === "front" ? "SPREDAJ" : "ZADAJ"}</figcaption>
          </figure>
        ))}
      </div>
      {!compact && (
        <div className="atlas-legend" aria-label="Legenda mišičnega prikaza">
          <span>
            <i className="legend-primary" />
            Glavno delo
          </span>
          <span>
            <i className="legend-secondary" />
            Pomoč pri gibu
          </span>
          <span>
            <i className="legend-stabilizer" />
            Stabilizacija
          </span>
        </div>
      )}
    </div>
  );
}
