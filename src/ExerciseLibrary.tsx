import { useEffect, useRef, useState } from "react";
import { BookOpen, Plus, Search, X } from "lucide-react";
import { catalog, loadLabel, normalizeExerciseName } from "./exerciseCatalog";
import { ExerciseSketch } from "./ExerciseSketch";
import { exerciseFromCatalog, historySummary, loadAdvice } from "./loadAdvice";
import { num, type Exercise, type State } from "./model";
import type { Candidate } from "./exerciseCatalog";
import {
  candidatesForExercises,
  dayGroups,
  fitsTraining,
  groupLabel,
  primaryMuscle,
  trainingCoverage,
  trainingLabels,
  type MuscleGroup,
  type TrainingType,
} from "./training";

type LibraryOptions = {
  selectionPurpose?: "plan" | "history";
  trainingType?: TrainingType;
  selectedCandidates?: Candidate[];
  selectedExercises?: Exercise[];
  initialGroup?: MuscleGroup;
  keepOpenOnChoose?: boolean;
  onRemove?: (c: Candidate) => void;
};

export function ExerciseLibraryButton({
  state,
  onChoose,
  label = "Knjižnica vaj",
  ...options
}: LibraryOptions & {
  state: State;
  onChoose?: (e: Exercise) => void;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="button secondary" onClick={() => setOpen(true)}>
        <BookOpen size={17} />
        {label}
      </button>
      {open && (
        <ExerciseLibrary
          state={state}
          {...options}
          onChoose={onChoose}
          close={() => setOpen(false)}
        />
      )}
    </>
  );
}
export function ExerciseLibrary({
  state,
  onChoose,
  close,
  trainingType,
  selectionPurpose = "plan",
  selectedCandidates: chosenCandidates,
  selectedExercises,
  initialGroup,
  keepOpenOnChoose,
  onRemove,
}: LibraryOptions & {
  state: State;
  onChoose?: (e: Exercise) => void;
  close: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [search, setSearch] = useState("");
  const [muscle, setMuscle] = useState<string>(initialGroup ?? "");
  const [mode, setMode] = useState("");
  useEffect(() => {
    const d = ref.current;
    const focus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    d?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      d?.close();
      document.body.style.overflow = previousOverflow;
      focus?.focus();
    };
  }, []);
  const query = normalizeExerciseName(search);
  const chosen =
    chosenCandidates ?? candidatesForExercises(selectedExercises ?? []);
  const eligible = trainingType
    ? catalog.filter((c) => fitsTraining(c, trainingType))
    : catalog;
  const rows = eligible.filter(
    (c) =>
      (!muscle ||
        (trainingType
          ? primaryMuscle(c) === muscle
          : c.muscles.includes(muscle))) &&
      (!mode || (c.mode ?? "machine") === mode) &&
      normalizeExerciseName(
        [c.name, c.equipment, ...c.muscles, ...(c.aliases ?? [])].join(" "),
      ).includes(query),
  );
  return (
    <dialog
      ref={ref}
      className="exercise-library-dialog"
      aria-label="Knjižnica vaj"
      onCancel={close}
    >
      <div className="modal-head">
        <div>
          <div className="eyebrow">IZBERI SVOJO IZVEDBO</div>
          <h2>Knjižnica vaj</h2>
        </div>
        <button
          className="icon-button"
          aria-label="Zapri knjižnico"
          onClick={close}
        >
          <X />
        </button>
      </div>
      <p>
        Uveljavljene vaje za vse glavne mišične skupine. Izberi opremo in
        izvedbo, ki ti ustrezata.{" "}
        {trainingType && (
          <>
            Prikazane so samo vaje za {trainingLabels[trainingType]}.{" "}
            {selectionPurpose === "history"
              ? "Zabeleži dejansko opravljene vaje."
              : "Največ dve vaji na glavno mišično skupino."}
          </>
        )}
      </p>
      {trainingType && (
        <div
          className="library-coverage"
          aria-label="Pokritost izbire"
          aria-live="polite"
        >
          {trainingCoverage(trainingType, chosen).map((g) => (
            <span key={g.group}>
              {g.label}
              <b>
                {selectionPurpose === "history"
                  ? `${g.count} vaj`
                  : `${g.count}/2`}
              </b>
            </span>
          ))}
        </div>
      )}
      <div className="library-filters">
        <label className="library-search">
          <span>
            <Search size={15} />
            Poišči vajo
          </span>
          <input
            autoFocus
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Npr. prsi, ročke, bench …"
          />
        </label>
        <label>
          Mišična skupina
          <select value={muscle} onChange={(e) => setMuscle(e.target.value)}>
            <option value="">Vse mišice</option>
            {(trainingType
              ? [...dayGroups[trainingType]]
              : [...new Set(catalog.flatMap((c) => c.muscles))]
            ).map((m) => (
              <option key={m} value={m}>
                {trainingType ? groupLabel(trainingType, m as MuscleGroup) : m}
              </option>
            ))}
          </select>
        </label>
        <label>
          Oprema
          <select value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="">Vsa oprema</option>
            <option value="machine">Naprave in kabli</option>
            <option value="barbell">Palica</option>
            <option value="dumbbell">Ročke</option>
            <option value="bodyweight">Lastna teža</option>
            <option value="assisted">Asistenca</option>
          </select>
        </label>
      </div>
      <p className="subtle library-result-count" role="status">
        {rows.length} / {eligible.length} vaj{" "}
        {trainingType && `· ${trainingLabels[trainingType]}`}
      </p>
      <div className="library-grid">
        {rows.map((c) => {
          const e = exerciseFromCatalog(state, c),
            advice = loadAdvice(state, e);
          const selected = chosen.some((row) => row.id === c.id);
          const limit =
            !!trainingType &&
            selectionPurpose !== "history" &&
            chosen.filter((row) => primaryMuscle(row) === primaryMuscle(c))
              .length >= 2;
          return (
            <article className="library-card" key={c.id}>
              <ExerciseSketch exercise={c} compact />
              <h3>{c.name}</h3>
              <p className="library-muscles">
                {trainingType ? (
                  <>
                    Glavna: {groupLabel(trainingType, primaryMuscle(c))}
                    {c.muscles.length > 1 && (
                      <span> · Pomožne: {c.muscles.slice(1).join(" · ")}</span>
                    )}
                  </>
                ) : (
                  c.muscles.join(" · ")
                )}
              </p>
              <small>
                {c.equipment} · {loadLabel(c)}
              </small>
              {advice.last ? (
                <p className="library-history">
                  Zadnjič: {historySummary(advice.last)}
                </p>
              ) : advice.kind === "estimate" ? (
                <p className="library-history">
                  Uvodna ocena: {num(advice.weight!)} {loadLabel(c)} · nizka
                  zanesljivost
                </p>
              ) : null}
              <details>
                <summary>Kako izvedem vajo?</summary>
                <p>{c.instructions}</p>
              </details>
              {onChoose && (
                <button
                  className="button secondary"
                  disabled={(selected && !onRemove) || (!selected && limit)}
                  aria-label={`${selected && onRemove ? "Odstrani" : "Dodaj"} ${c.name}`}
                  onClick={() => {
                    if (selected && onRemove) onRemove(c);
                    else onChoose(e);
                    if (!keepOpenOnChoose) close();
                  }}
                >
                  <Plus size={16} />
                  {selected
                    ? onRemove
                      ? "Odstrani iz izbire"
                      : "Že izbrano"
                    : limit
                      ? "Omejitev 2/2"
                      : "Dodaj vajo"}
                </button>
              )}
            </article>
          );
        })}
      </div>
      {!rows.length && (
        <div className="empty-state">
          <h3>Ni zadetkov</h3>
          <p>Poskusi krajše ime ali drugo mišično skupino.</p>
          <button
            className="text-button"
            onClick={() => {
              setSearch("");
              setMuscle("");
              setMode("");
            }}
          >
            Pokaži vse vaje
          </button>
        </div>
      )}
      <p className="library-source">
        Izbor temelji na raznolikih gibalnih vzorcih in priporočilih za vadbo
        moči.{" "}
        <a
          href="https://acsm.org/resistance-training-guidelines-update-2026/"
          target="_blank"
          rel="noreferrer"
        >
          ACSM 2026
        </a>
      </p>
    </dialog>
  );
}
