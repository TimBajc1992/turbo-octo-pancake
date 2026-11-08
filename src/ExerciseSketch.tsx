import { useEffect, useId, useRef, useState } from "react";
import { Activity, Layers, Play, X } from "lucide-react";
import type { Candidate } from "./exerciseCatalog";
import {
  anatomyForExercise,
  muscleRegions,
  type MuscleRegion,
} from "./exerciseAnatomy";
import { Exercise3D } from "./Exercise3D";
import { MuscleMap } from "./MuscleMap";
import { exercisePoster } from "./exercise-preview-assets";
import { exerciseFamily } from "./exercise3d/motions";
import "./exercise-visual.css";

function GuideDialog({
  exercise,
  close,
}: {
  exercise: Candidate;
  close: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    const focus = document.activeElement as HTMLElement | null;
    const previous = document.body.style.overflow;
    dialog?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = previous;
      focus?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="exercise-guide-dialog"
      aria-label={`Prikaz vaje: ${exercise.name}`}
      onCancel={close}
    >
      <div className="exercise-guide-head">
        <span>MIŠICE IN IZVEDBA</span>
        <button
          type="button"
          className="icon-button"
          aria-label="Zapri prikaz vaje"
          onClick={close}
        >
          <X />
        </button>
      </div>
      <ExerciseSketch exercise={exercise} />
    </dialog>
  );
}

/** Read-only visual guide. Opening, playing and rotating never alter workout data. */
export function ExerciseSketch({
  exercise,
  compact = false,
}: {
  exercise: Candidate;
  compact?: boolean;
}) {
  const [view, setView] = useState<"muscles" | "movement">("movement");
  const [selected, setSelected] = useState<MuscleRegion>();
  const [expanded, setExpanded] = useState(false);
  const heading = useId();
  const anatomy = anatomyForExercise(exercise),
    available = !!exerciseFamily(exercise);
  const activeView = view === "movement" && available ? "movement" : "muscles";
  const selectedRegion =
    selected && [...anatomy.primary, ...anatomy.secondary].includes(selected)
      ? selected
      : anatomy.primary[0];
  const poster = exercisePoster(exercise.id);
  if (compact)
    return (
      <>
        <button
          type="button"
          className="exercise-preview"
          aria-label={`Prikaži mišice in izvedbo: ${exercise.name}`}
          aria-haspopup="dialog"
          aria-expanded={expanded}
          onClick={() => setExpanded(true)}
        >
          <span className="exercise-visual visual-compact">
            {poster ? (
              <img
                className="exercise-preview-poster"
                src={poster}
                alt={`${exercise.name}: prikaz vaje z označenimi mišicami`}
                loading="lazy"
                decoding="async"
                width="480"
                height="480"
              />
            ) : (
              <MuscleMap name={exercise.name} anatomy={anatomy} />
            )}
            <span className="visual-preview-label">
              <Play size={12} /> Mišice in izvedba
            </span>
          </span>
        </button>
        {expanded && (
          <GuideDialog exercise={exercise} close={() => setExpanded(false)} />
        )}
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
          aria-pressed={activeView === "movement"}
          disabled={!available}
          title={
            !available ? "Najprej določi gib in točno napravo." : undefined
          }
          onClick={() => setView("movement")}
        >
          <Activity size={16} /> Izvedba
        </button>
        <button
          type="button"
          aria-pressed={activeView === "muscles"}
          onClick={() => setView("muscles")}
        >
          <Layers size={16} /> Mišice
        </button>
      </div>
      <div className="anatomy-legend">
        <span>
          <i className="primary-dot" /> Glavne
        </span>
        <span>
          <i className="secondary-dot" /> Pomožne
        </span>
      </div>
      {activeView === "movement" ? (
        <>
          <Exercise3D
            key={exercise.id}
            exercise={exercise}
            selected={selectedRegion}
          />
          <p className="visual-instructions">{exercise.instructions}</p>
        </>
      ) : (
        <div className="anatomy-stage">
          <MuscleMap
            name={exercise.name}
            anatomy={anatomy}
            selected={selectedRegion}
          />
        </div>
      )}
      <div className="anatomy-information">
        {(["primary", "secondary"] as const).map(
          (role) =>
            anatomy[role].length > 0 && (
              <div className={`anatomy-muscles ${role}`} key={role}>
                <h5>
                  {role === "primary" ? "Glavne mišice" : "Pomožne mišice"}
                </h5>
                <div>
                  {anatomy[role].map((region) => (
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
            ),
        )}
        {selectedRegion && (
          <p className="anatomy-explanation" aria-live="polite">
            {muscleRegions[selectedRegion].detail}
          </p>
        )}
        {anatomy.note && <p className="visual-caption">{anatomy.note}</p>}
        <p className="visual-caption">
          Barvi označujeta glavne in pomožne mišice pri običajni izvedbi. Obseg
          in nastavitve prilagodi svoji opremi.
          {exercise.id === "plank" && " Pri deski je položaj statičen."}
        </p>
        <p className="visual-caption visual-credits">
          3D model:{" "}
          <a
            href={`${import.meta.env.BASE_URL}licenses/MakeHuman-CC0.txt`}
            target="_blank"
            rel="noreferrer"
          >
            MakeHuman · CC0
          </a>
          . Izvirni prikazi za Moč & Formo.
        </p>
      </div>
    </section>
  );
}
