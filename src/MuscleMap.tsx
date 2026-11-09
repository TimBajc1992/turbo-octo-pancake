import { useId } from "react";
import {
  muscleRegions,
  type Anatomy,
  type MuscleRegion,
} from "./exerciseAnatomy";

type RegionPath = { region: MuscleRegion; d: string; mirror?: boolean };
const front: RegionPath[] = [
  { region: "chest", d: "M83 83Q96 77 108 84L108 109Q95 119 81 106Z" },
  { region: "frontDelts", d: "M78 80Q67 82 63 100L71 111L80 99L83 84Z" },
  { region: "sideDelts", d: "M69 84Q60 90 57 107L63 113L69 104Q66 94 73 86Z" },
  { region: "biceps", d: "M65 111Q74 117 67 137L59 151L52 147Q53 128 65 111Z" },
  { region: "forearms", d: "M52 154Q61 157 53 177L40 214L33 212L42 174Z" },
  {
    region: "abs",
    d: "M97 123Q103 121 108 123L108 139L96 138ZM96 142L108 143L108 158L96 156ZM96 160L108 162L108 180L99 187Z",
  },
  {
    region: "obliques",
    d: "M82 120L93 126L91 150L95 174L99 190L84 179L79 155Z",
  },
  { region: "hipFlexors", d: "M86 188L101 199L104 218L94 224L85 211Z" },
  { region: "hipAbductors", d: "M79 184L85 190L82 207L76 217L73 205Z" },
  { region: "quads", d: "M78 218Q89 219 94 239L99 271L94 294L85 290L79 262Z" },
  { region: "quads", d: "M96 231L103 240L106 271L102 291L96 286L100 269Z" },
  { region: "adductors", d: "M102 216L108 227L108 258L104 271L99 243Z" },
];
const back: RegionPath[] = [
  { region: "upperBack", d: "M99 67L107 68L108 109L98 119L86 99L78 84L91 76Z" },
  { region: "rearDelts", d: "M77 81Q64 81 59 102L65 112L77 108L84 96Z" },
  { region: "sideDelts", d: "M65 86Q57 94 56 107L62 113L66 106L70 91Z" },
  {
    region: "triceps",
    d: "M63 113L73 115Q72 135 60 151L52 150Q52 135 63 113Z",
  },
  { region: "forearms", d: "M52 155L59 159Q53 180 40 215L33 213L41 174Z" },
  { region: "lats", d: "M81 106L98 119L104 135L102 157L87 174L80 153Z" },
  { region: "spinalErectors", d: "M103 123L108 118L108 188L102 184L99 165Z" },
  { region: "hipAbductors", d: "M78 182L89 181L85 200L75 212L72 204Z" },
  { region: "glutes", d: "M89 185L107 190L108 218Q99 233 80 224L77 210Z" },
  { region: "hamstrings", d: "M78 233L91 237L100 272L95 295L85 291L81 264Z" },
  {
    region: "hamstrings",
    d: "M94 237L105 232L107 265L103 293L98 290L101 271Z",
  },
  { region: "calves", d: "M86 302Q96 297 99 311L99 333L91 350L86 336Z" },
  { region: "calves", d: "M100 300Q107 310 103 330L98 344L94 339L100 324Z" },
];
const outline =
  "M99 57L121 57L125 70Q151 73 161 99L173 135L182 174L192 220Q198 239 187 248L180 239L178 226L165 193L151 158L146 139L144 171L151 204L146 235L139 294L133 354L136 379Q145 397 130 397L116 391L118 359L114 307L110 263L106 307L102 359L104 391L90 397Q75 397 84 379L87 354L81 294L74 235L69 204L76 171L74 139L69 158L55 193L42 226L40 239L34 248Q22 239 28 220L38 174L47 135L59 99Q69 74 95 70Z";

export function MuscleMap({
  name,
  anatomy,
  selected,
}: {
  name: string;
  anatomy: Anatomy;
  selected?: MuscleRegion;
}) {
  const id = useId();
  const describe = (keys: MuscleRegion[]) =>
    keys.map((k) => muscleRegions[k].name).join(", ");
  return (
    <svg
      className="muscle-map"
      viewBox="0 0 480 440"
      role="img"
      aria-labelledby={`${id}-title ${id}-description`}
    >
      <title id={`${id}-title`}>{name}: mišice pri vaji</title>
      <desc id={`${id}-description`}>
        Glavne: {describe(anatomy.primary) || "še niso določene"}. Pomožne:{" "}
        {describe(anatomy.secondary) || "niso posebej označene"}. Pogled od
        spredaj in zadaj.
      </desc>
      <defs>
        <linearGradient id={`${id}-body`} x1="0" x2="1">
          <stop stopColor="#D2D5D8" />
          <stop offset=".45" stopColor="#C3CBD4" />
          <stop offset="1" stopColor="#B8C1CB" />
        </linearGradient>
        <linearGradient id={`${id}-primary`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="var(--anatomy-primary-light)" />
          <stop offset="1" stopColor="var(--anatomy-primary)" />
        </linearGradient>
        <linearGradient id={`${id}-secondary`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="var(--anatomy-secondary-light)" />
          <stop offset="1" stopColor="var(--anatomy-secondary)" />
        </linearGradient>
      </defs>
      <path d="M240 40V400" className="anatomy-divider" />
      {[front, back].map((paths, view) => (
        <g key={view} transform={`translate(${view * 240 + 10}, 5)`}>
          <ellipse
            cx="110"
            cy="404"
            rx="45"
            ry="4"
            className="anatomy-shadow"
          />
          <g fill={`url(#${id}-body)`} className="anatomy-body">
            <path d={outline} />
            <ellipse cx="110" cy="33" rx="18" ry="24" />
          </g>
          <path
            d={
              view
                ? "M98 33Q110 43 122 33M110 61V187M107 234L110 248L113 234"
                : "M100 37Q110 43 120 37M110 76V112M104 198L110 202L116 198M88 305L97 304L103 310"
            }
            className="anatomy-seam"
          />
          {paths.flatMap(({ region, d }, index) =>
            [false, true].map((mirror) => {
              const role = anatomy.primary.includes(region)
                ? "primary"
                : anatomy.secondary.includes(region)
                  ? "secondary"
                  : "rest";
              return (
                <path
                  key={`${index}-${mirror}`}
                  d={d}
                  transform={
                    mirror ? "translate(220 0) scale(-1 1)" : undefined
                  }
                  data-muscle={region}
                  data-activation={role}
                  className={`anatomy-region ${selected === region ? "is-selected" : ""}`}
                  fill={role === "rest" ? "#C3CBD4" : `url(#${id}-${role})`}
                />
              );
            }),
          )}
          <text
            x="110"
            y="433"
            textAnchor="middle"
            className="anatomy-view-label"
          >
            {view ? "ZADAJ" : "SPREDAJ"}
          </text>
        </g>
      ))}
    </svg>
  );
}
