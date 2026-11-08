import { useEffect, useId, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import {
  exerciseScene,
  ExerciseSketch,
  type Point,
  type Pose,
} from "../ExerciseSketch";
import type { Candidate } from "../exerciseCatalog";
import { exerciseAnatomy, muscleRole, type MuscleRegion } from "./profiles";

function lerpPoint(a: Point, b: Point, t: number): Point {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}
function lerpPoints(a: Point[], b: Point[], t: number): Point[] {
  return a.length === b.length
    ? a.map((p, i) => lerpPoint(p, b[i], t))
    : t < 0.5
      ? a
      : b;
}
export function interpolatePose(a: Pose, b: Pose, t: number): Pose {
  const limbs = (x: Point[][], y: Point[][]) =>
    x.length === y.length
      ? x.map((p, i) => lerpPoints(p, y[i], t))
      : t < 0.5
        ? x
        : y;
  return {
    head: lerpPoint(a.head, b.head, t),
    back: lerpPoints(a.back, b.back, t),
    arms: limbs(a.arms, b.arms),
    legs: limbs(a.legs, b.legs),
    load: lerpPoints(a.load ?? [], b.load ?? [], t),
  };
}
const line = (p: Point[]) => p.map((p) => p.join(",")).join(" ");

function MovementFigure({
  exercise,
  pose,
  id,
}: {
  exercise: Candidate;
  pose: Pose;
  id: string;
}) {
  const p = exerciseAnatomy(exercise);
  const color = (...regions: MuscleRegion[]) => {
    const roles = regions.map((r) => muscleRole(p, r));
    return roles.includes("primary")
      ? "var(--anatomy-primary)"
      : roles.includes("secondary")
        ? "var(--anatomy-secondary)"
        : `url(#${id}body)`;
  };
  return (
    <g className="motion-person" strokeLinecap="round" strokeLinejoin="round">
      <defs>
        <linearGradient id={id + "body"} x1="0" x2="1" y1="0" y2="0">
          <stop stopColor="#394c59" />
          <stop offset=".45" stopColor="#b2c1c9" />
          <stop offset="1" stopColor="#5a7280" />
        </linearGradient>
      </defs>
      {pose.legs.map((leg, i) => (
        <g key={i} opacity={i === 0 ? 0.8 : 1}>
          <polyline
            points={line(leg)}
            stroke="#152732"
            strokeWidth="14"
            fill="none"
          />
          <polyline
            points={line(leg)}
            stroke={`url(#${id}body)`}
            strokeWidth="11"
            fill="none"
          />
          <path
            d={`M${leg[0]}L${leg[1]}`}
            stroke={color("quadriceps", "hamstring")}
            strokeWidth="8"
          />
          {leg[2] && (
            <path
              d={`M${lerpPoint(leg[1], leg[2], 0.15)}L${lerpPoint(leg[1], leg[2], 0.65)}`}
              stroke={color("calves")}
              strokeWidth="6"
            />
          )}
          <circle cx={leg[1][0]} cy={leg[1][1]} r="4" fill="#415868" />
        </g>
      ))}
      <polyline
        points={line(pose.back)}
        stroke="#142833"
        strokeWidth="21"
        fill="none"
      />
      <polyline
        points={line(pose.back)}
        stroke={`url(#${id}body)`}
        strokeWidth="17"
        fill="none"
      />
      <polyline
        points={line(pose.back.slice(0, 2))}
        stroke={color("chest", "upper-back", "abs")}
        strokeWidth="12"
        fill="none"
      />
      <circle
        cx={pose.back.at(-1)![0]}
        cy={pose.back.at(-1)![1]}
        r="8"
        fill={color("gluteal")}
      />
      <circle
        cx={pose.head[0]}
        cy={pose.head[1]}
        r="8"
        fill={`url(#${id}body)`}
        stroke="#152732"
        strokeWidth="1"
      />
      {pose.arms.map((arm, i) => (
        <g key={i}>
          <polyline
            points={line(arm)}
            stroke="#142833"
            strokeWidth="11"
            fill="none"
          />
          <polyline
            points={line(arm)}
            stroke={`url(#${id}body)`}
            strokeWidth="8"
            fill="none"
          />
          <path
            d={`M${lerpPoint(arm[0], arm[1], 0.15)}L${lerpPoint(arm[0], arm[1], 0.8)}`}
            stroke={color("biceps", "triceps")}
            strokeWidth="6"
          />
          <circle
            cx={arm[0][0]}
            cy={arm[0][1]}
            r="6"
            fill={color("front-deltoids", "back-deltoids")}
          />
          <circle cx={arm[1][0]} cy={arm[1][1]} r="3.5" fill="#415868" />
        </g>
      ))}
      {pose.load?.map(([x, y], i) => (
        <g key={i} transform={`translate(${x},${y})`} className="motion-load">
          <path d="M-13 0H13" />
          <path d="M-10-7V7M10-7V7" strokeWidth="5" />
          <path d="M-15-4V4M15-4V4" strokeWidth="3" />
        </g>
      ))}
    </g>
  );
}

export function ExerciseMotion({ exercise }: { exercise: Candidate }) {
  const id = useId().replace(/:/g, "");
  const [progress, setProgress] = useState(0),
    [playing, setPlaying] = useState(false);
  const [reduced, setReduced] = useState(
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => {
      setReduced(media.matches);
      if (media.matches) setPlaying(false);
    };
    const hide = () => {
      if (document.hidden) setPlaying(false);
    };
    media.addEventListener("change", change);
    document.addEventListener("visibilitychange", hide);
    return () => {
      media.removeEventListener("change", change);
      document.removeEventListener("visibilitychange", hide);
    };
  }, []);
  useEffect(() => {
    if (!playing || reduced) return;
    let frame: number, start: number | undefined;
    const tick = (now: number) => {
      start ??= now;
      setProgress((1 - Math.cos(((now - start) / 4500) * Math.PI * 2)) / 2);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, reduced]);
  const start = exerciseScene(exercise, false),
    end = exerciseScene(exercise, true);
  const pose = interpolatePose(start.pose, end.pose, progress);
  return (
    <div className="exercise-motion">
      <div className="motion-stage">
        <div className="motion-label">
          <span>SHEMA GIBA</span>
          <span>
            {playing
              ? "V TEKU"
              : progress > 0.5
                ? "02 / ZAKLJUČEK"
                : "01 / ZAČETEK"}
          </span>
        </div>
        <svg
          viewBox="-8 -16 190 180"
          role="img"
          aria-label={`${exercise.name}: shematski prikaz izvedbe`}
        >
          <ellipse cx="82" cy="143" rx="75" ry="4" fill="#000" opacity=".2" />
          <path d="M3 140H163" stroke="#5b6a75" strokeWidth=".6" />
          <g className="motion-equipment">
            {progress > 0.5 ? end.equipment : start.equipment}
          </g>
          <MovementFigure exercise={exercise} pose={pose} id={id} />
        </svg>
        <div className="motion-progress" aria-hidden="true">
          <span style={{ width: `${progress * 100}%` }} />
        </div>
      </div>
      <div className="motion-controls">
        {!reduced && (
          <button
            type="button"
            className="anatomy-play"
            onClick={() => setPlaying(!playing)}
            aria-pressed={playing}
          >
            {playing ? <Pause size={16} /> : <Play size={16} />}{" "}
            {playing ? "Ustavi gib" : "Predvajaj gib"}
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            setPlaying(false);
            setProgress(0);
          }}
          aria-pressed={!playing && progress === 0}
        >
          01 Začetek
        </button>
        <button
          type="button"
          onClick={() => {
            setPlaying(false);
            setProgress(1);
          }}
          aria-pressed={!playing && progress === 1}
        >
          02 Zaključek
        </button>
        {playing && (
          <button
            type="button"
            aria-label="Ponastavi prikaz giba"
            onClick={() => {
              setPlaying(false);
              setProgress(0);
            }}
          >
            <RotateCcw size={15} />
          </button>
        )}
      </div>
      <p className="anatomy-quiet">
        Shema ponazori gib. Položaj in obseg prilagodi svoji opremi.
      </p>
      <details className="motion-static">
        <summary>Primerjaj začetni in končni položaj</summary>
        <ExerciseSketch exercise={exercise} />
      </details>
    </div>
  );
}
