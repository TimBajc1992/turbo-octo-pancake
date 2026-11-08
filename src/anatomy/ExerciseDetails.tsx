import { useEffect, useRef, useState, type ReactNode } from "react";
import { Activity, ArrowUpRight, ScanLine, X } from "lucide-react";
import type { Candidate } from "../exerciseCatalog";
import type { State } from "../model";
import { exerciseFromCatalog, historySummary, loadAdvice } from "../loadAdvice";
import { MuscleAtlas } from "./MuscleAtlas";
import { PalettePicker } from "./PalettePicker";
import { ExerciseMotion } from "./ExerciseMotion";
import {
  exerciseAnatomy,
  muscleRegions,
  roleLabels,
  type MuscleRegion,
} from "./profiles";
import { useAnatomyPalette } from "./preferences";
import "./anatomy.css";

export function ExerciseDetails({
  exercise,
  state,
  close,
  action,
}: {
  exercise: Candidate;
  state: State;
  close: () => void;
  action?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [tab, setTab] = useState<"muscles" | "movement">("muscles"),
    [selected, setSelected] = useState<MuscleRegion>();
  const [palette] = useAnatomyPalette(),
    profile = exerciseAnatomy(exercise);
  const advice = loadAdvice(state, exerciseFromCatalog(state, exercise));
  useEffect(() => {
    const dialog = ref.current,
      focus = document.activeElement as HTMLElement | null,
      overflow = document.body.style.overflow;
    dialog?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = overflow;
      focus?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="exercise-insight-dialog"
      aria-label={`Mišice in izvedba: ${exercise.name}`}
      onCancel={close}
      data-anatomy-palette={palette}
    >
      <header className="insight-header">
        <div>
          <span className="insight-eyebrow">KNJIŽNICA / ANATOMIJA GIBA</span>
          <h2>{exercise.name}</h2>
          <p>{exercise.equipment}</p>
        </div>
        <button
          type="button"
          className="insight-close"
          onClick={close}
          aria-label="Zapri prikaz mišic"
        >
          <X size={21} />
        </button>
      </header>
      <div className="insight-layout">
        <div className="insight-visual">
          <div
            className="insight-switch"
            role="group"
            aria-label="Način prikaza vaje"
          >
            <button
              type="button"
              aria-pressed={tab === "muscles"}
              onClick={() => setTab("muscles")}
            >
              <ScanLine size={17} />
              Mišice
            </button>
            <button
              type="button"
              aria-pressed={tab === "movement"}
              onClick={() => setTab("movement")}
            >
              <Activity size={17} />
              Izvedba
            </button>
          </div>
          {tab === "muscles" ? (
            <MuscleAtlas exercise={exercise} selected={selected} />
          ) : (
            <ExerciseMotion exercise={exercise} />
          )}
          <PalettePicker />
        </div>
        <div className="insight-information">
          <div className="insight-section-heading">
            <span>01 / MIŠICE PRI VAJI</span>
            <ArrowUpRight size={20} />
          </div>
          <h3>Veš, kaj treniraš.</h3>
          <p className="insight-explain">
            Izberi mišico za poudarek na prikazu.
          </p>
          <div className="insight-muscle-groups">
            {(["primary", "secondary", "stabilizer"] as const).map(
              (role) =>
                profile[role].length > 0 && (
                  <section
                    key={role}
                    className={`insight-role insight-role-${role}`}
                  >
                    <h4>
                      <i />
                      {roleLabels[role]}
                    </h4>
                    <div>
                      {profile[role].map((region) => (
                        <button
                          type="button"
                          key={region}
                          aria-pressed={selected === region}
                          onClick={() => {
                            setSelected(
                              selected === region ? undefined : region,
                            );
                            setTab("muscles");
                          }}
                        >
                          {muscleRegions[region].name}
                        </button>
                      ))}
                    </div>
                  </section>
                ),
            )}
          </div>
          {selected && (
            <div className="insight-muscle-note" role="status">
              <strong>{muscleRegions[selected].name}</strong>
              <small>{muscleRegions[selected].latin}</small>
              <p>{muscleRegions[selected].action}</p>
              <button type="button" onClick={() => setSelected(undefined)}>
                Pokaži vse sodelujoče mišice
              </button>
            </div>
          )}
          {profile.note && (
            <p className="insight-movement-note">{profile.note}</p>
          )}
          <section className="insight-instructions">
            <span className="insight-section-heading">02 / IZVEDBA</span>
            <p>{exercise.instructions}</p>
          </section>
          {advice.last && (
            <section className="insight-history">
              <span className="insight-section-heading">TVOJA ZGODOVINA</span>
              <strong>{historySummary(advice.last)}</strong>
            </section>
          )}
          <p className="anatomy-quiet">
            Prikaz poudari običajne vloge mišic. Njihovo sodelovanje se
            spreminja z izvedbo in opremo.
          </p>
        </div>
      </div>
      {action && <footer className="insight-footer">{action}</footer>}
    </dialog>
  );
}

export function ExerciseInsightButton({
  exercise,
  state,
  compact = false,
}: {
  exercise: Candidate;
  state: State;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className={`exercise-insight-button ${compact ? "insight-button-compact" : ""}`}
        aria-label={`Mišice in izvedba: ${exercise.name}`}
        title={`Mišice in izvedba: ${exercise.name}`}
        onClick={() => setOpen(true)}
      >
        <ScanLine size={17} />
        <span className="insight-button-label">
          {compact ? "Mišice" : "Mišice in izvedba"}
        </span>
      </button>
      {open && (
        <ExerciseDetails
          exercise={exercise}
          state={state}
          close={() => setOpen(false)}
        />
      )}
    </>
  );
}
