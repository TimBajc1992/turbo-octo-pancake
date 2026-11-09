import { useId } from "react";
import outline from "./assets/body-outline.json";

const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));
const ease = (n: number) => {
  const t = clamp(n, 0, 1);
  return t * t * (3 - 2 * t);
};

/** Symbolic comparison at a fixed height. Weight affects volume; a measured
 * waist ratio takes precedence locally, so it isn't counted twice. The adult
 * head and feet stay fixed. No muscle/fat estimate is implied. */
export function bodyPoint(
  x: number,
  y: number,
  waist?: number,
  weight = 1,
): [number, number] {
  const mass = clamp(
    Math.sqrt(Number.isFinite(weight) && weight > 0 ? weight : 1),
    0.75,
    1.3,
  );
  const body = ease((y - 82) / 40) * (1 - ease((y - 398) / 32));
  const volume = 1 + (mass - 1) * body;
  const local =
    Math.exp(-(((y - 176) / 29) ** 2)) * Math.exp(-(((x - 180) / 57) ** 8));
  const waistScale =
    waist !== undefined && Number.isFinite(waist) && waist > 0
      ? clamp(waist, 0.7, 1.35)
      : volume;
  return [180 + (x - 180) * (volume + (waistScale - volume) * local), y];
}

const coordinates = (p: number[]) =>
  p.map((n) => Number(n.toFixed(2))).join(" ");
export function bodyOutline(waist?: number, weight = 1) {
  const points = outline.points
    .slice(0, -1)
    .map(([x, y]) => bodyPoint(x, y, waist, weight));
  const middle = (a: number[], b: number[]) => [
    (a[0] + b[0]) / 2,
    (a[1] + b[1]) / 2,
  ];
  return (
    `M${coordinates(middle(points.at(-1)!, points[0]))}` +
    points
      .map(
        (p, i) =>
          `Q${coordinates(p)} ${coordinates(middle(p, points[(i + 1) % points.length]))}`,
      )
      .join("") +
    "Z"
  );
}

const details =
  "M163 88Q166 100 179 104M197 88Q194 100 181 104M139 117Q158 110 177 122M183 122Q202 110 221 117M137 129Q151 145 175 139M185 139Q209 145 223 129M180 124V151M169 153Q180 157 191 153M169 165Q180 168 191 165M170 177Q180 180 190 177M180 157V194M151 157Q149 181 157 197M209 157Q211 181 203 197M154 211Q167 217 176 233M206 211Q193 217 184 233M144 246Q147 269 155 284M216 246Q213 269 205 284M139 316Q144 336 139 352M221 316Q216 336 221 352M123 123Q112 134 113 149M237 123Q248 134 247 149";

export function BodyMotif({
  ratio,
  weightRatio = 1,
  comparison = false,
  className = "",
}: {
  ratio?: number;
  weightRatio?: number;
  comparison?: boolean;
  className?: string;
}) {
  const id = useId();
  const detailPath = details.replace(
    /(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g,
    (_, x, y) =>
      coordinates(bodyPoint(Number(x), Number(y), ratio, weightRatio)),
  );
  return (
    <div className={`body-motif ${className}`}>
      <svg viewBox="0 0 360 450" role="img" aria-labelledby={`${id}-title`}>
        <title id={`${id}-title`}>
          {comparison
            ? "Shematski obris sprememb telesne teže in pasu"
            : "Obris telesa"}
        </title>
        <g className="body-guide" aria-hidden="true">
          <path d="M180 16V439M81 176H279" />
          <path d="M90 55H104M97 48V62M256 401H270M263 394V408" />
        </g>
        {comparison && (
          <path
            className="body-baseline"
            d={bodyOutline()}
            data-outline="baseline"
          />
        )}
        <g
          className="body-current"
          data-waist-ratio={(ratio ?? 1).toFixed(4)}
          data-weight-ratio={weightRatio.toFixed(4)}
        >
          <path d={bodyOutline(ratio, weightRatio)} />
          <path className="body-detail" d={detailPath} />
        </g>
        {comparison && (
          <g className="body-waist-guide">
            <path d="M136 176H224" />
            <circle cx="136" cy="176" r="2" />
            <circle cx="224" cy="176" r="2" />
          </g>
        )}
      </svg>
      {!comparison && (
        <div className="body-motif-caption">
          <span>RAVNOTEŽJE</span>
          <span>V TVOJEM RITMU</span>
        </div>
      )}
    </div>
  );
}
