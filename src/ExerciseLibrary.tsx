import { useEffect, useRef, useState } from "react";
import { BookOpen, Plus, Search, X } from "lucide-react";
import { catalog, loadLabel, normalizeExerciseName } from "./exerciseCatalog";
import { ExerciseSketch } from "./ExerciseSketch";
import { exerciseFromCatalog, historySummary, loadAdvice } from "./loadAdvice";
import { num, type Exercise, type State } from "./model";

export function ExerciseLibraryButton({
  state,
  onChoose,
  label = "Knjižnica vaj",
}: {
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
          onChoose={onChoose}
          close={() => setOpen(false)}
        />
      )}
    </>
  );
}
function ExerciseLibrary({
  state,
  onChoose,
  close,
}: {
  state: State;
  onChoose?: (e: Exercise) => void;
  close: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [search, setSearch] = useState("");
  const [muscle, setMuscle] = useState("");
  const [mode, setMode] = useState("");
  useEffect(() => {
    const d = ref.current;
    d?.showModal();
    return () => d?.close();
  }, []);
  const query = normalizeExerciseName(search);
  const rows = catalog.filter(
    (c) =>
      (!muscle || c.muscles.includes(muscle)) &&
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
        izvedbo, ki ti ustrezata.
      </p>
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
            {[...new Set(catalog.flatMap((c) => c.muscles))].map((m) => (
              <option key={m}>{m}</option>
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
        {rows.length} / {catalog.length} vaj
      </p>
      <div className="library-grid">
        {rows.map((c) => {
          const e = exerciseFromCatalog(state, c),
            advice = loadAdvice(state, e);
          return (
            <article className="library-card" key={c.id}>
              <ExerciseSketch exercise={c} compact />
              <h3>{c.name}</h3>
              <p className="library-muscles">{c.muscles.join(" · ")}</p>
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
                  aria-label={`Dodaj ${c.name}`}
                  onClick={() => {
                    onChoose(e);
                    close();
                  }}
                >
                  <Plus size={16} />
                  Dodaj vajo
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
