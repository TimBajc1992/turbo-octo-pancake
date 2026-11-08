import { useId, useState } from "react";
import { Activity, ChevronDown, Layers } from "lucide-react";
import type { Candidate } from "./exerciseCatalog";
import {
  anatomyForExercise,
  muscleRegions,
  type MuscleRegion,
} from "./exerciseAnatomy";
import { MovementDemo } from "./ExerciseMovement";
import { MuscleMap } from "./MuscleMap";
import "./exercise-visual.css";

/** An entirely local visual guide; viewing it never writes workout data. */
export function ExerciseSketch({
  exercise,
  compact = false,
}: {
  exercise: Candidate;
  compact?: boolean;
}) {
  const [view, setView] = useState<"muscles" | "movement">("muscles");
  const [selected, setSelected] = useState<MuscleRegion>();
  const [expanded, setExpanded] = useState(false);
  const heading = useId();
  const anatomy = anatomyForExercise(exercise);
  const selectedRegion =
    selected && [...anatomy.primary, ...anatomy.secondary].includes(selected)
      ? selected
      : anatomy.primary[0];
  if (compact)
    return (
      <>
        <button
          type="button"
          className="exercise-preview"
          aria-label={`Prikaži mišice in izvedbo: ${exercise.name}`}
          aria-expanded={expanded}
          onClick={() => setExpanded(!expanded)}
        >
          <span className="exercise-visual visual-compact">
            <MuscleMap name={exercise.name} anatomy={anatomy} />
            <span className="visual-preview-label">
              <Layers size={12} /> Mišice in izvedba <ChevronDown size={13} />
            </span>
          </span>
        </button>
        {expanded && <ExerciseSketch exercise={exercise} />}
      </>
    );
  return (
    <section className="exercise-visual" aria-labelledby={heading}>
      <div className="visual-heading">
        <div>
          <span className="visual-kicker">SPOZNAJ SVOJO VAJO</span>
          <h4 id={heading}>{exercise.name}</h4>
        </div>
        <Activity size={21} aria-hidden="true" />
      </div>
      <div className="visual-switch" role="group" aria-label="Prikaz vaje">
        <button
          type="button"
          aria-pressed={view === "muscles"}
          onClick={() => setView("muscles")}
        >
          <Layers size={16} /> Mišice
        </button>
        <button
          type="button"
          aria-pressed={view === "movement"}
          onClick={() => setView("movement")}
        >
          <Activity size={16} /> Izvedba
        </button>
      </div>
      {view === "muscles" ? (
        <div className="visual-anatomy">
          <div className="anatomy-stage">
            <div className="anatomy-legend">
              <span>
                <i className="primary-dot" /> Glavne
              </span>
              <span>
                <i className="secondary-dot" /> Pomožne
              </span>
            </div>
            <MuscleMap
              name={exercise.name}
              anatomy={anatomy}
              selected={selectedRegion}
            />
          </div>
          <div className="anatomy-information">
            {(["primary", "secondary"] as const).map((role) => {
              const regions = anatomy[role];
              return (
                regions.length > 0 && (
                  <div className={`anatomy-muscles ${role}`} key={role}>
                    <h5>
                      {role === "primary" ? "Glavne mišice" : "Pomožne mišice"}
                    </h5>
                    <div>
                      {regions.map((region) => (
                        <button
                          type="button"
                          key={region}
                          aria-pressed={selectedRegion === region}
                          onClick={() => setSelected(region)}
                        >
                          <i />
                          {muscleRegions[region].name}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              );
            })}
            {selectedRegion && (
              <p className="anatomy-explanation" aria-live="polite">
                {muscleRegions[selectedRegion].detail}
              </p>
            )}
            {anatomy.note && <p className="visual-caption">{anatomy.note}</p>}
            <p className="visual-caption">
              Barvi označujeta vlogo mišic pri običajni izvedbi. Poudarek se
              spreminja s tehniko in opremo.
            </p>
          </div>
        </div>
      ) : (
        <>
          <MovementDemo key={exercise.id} exercise={exercise} />
          <p className="visual-instructions">{exercise.instructions}</p>
        </>
      )}
    </section>
  );
}
