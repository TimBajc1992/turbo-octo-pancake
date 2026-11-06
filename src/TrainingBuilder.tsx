import { useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  Plus,
  Play,
  Trash2,
  AlertCircle,
} from "lucide-react";
import { ExerciseLibrary } from "./ExerciseLibrary";
import { ExerciseSketch } from "./ExerciseSketch";
import { byId, type Candidate } from "./exerciseCatalog";
import { type State, type Workout } from "./model";
import {
  createSelectedWorkout,
  dayGroups,
  fitsTraining,
  groupLabel,
  nextTrainingSuggestion,
  primaryMuscle,
  selectedCandidates,
  trainingCoverage,
  trainingDescriptions,
  trainingLabels,
  trainingTypes,
  validateSelection,
  type MuscleGroup,
  type TrainingDraft,
  type TrainingType,
} from "./training";

type Props = {
  state: State;
  update: (fn: (s: State) => State) => Promise<void>;
  start: (w: Workout) => void;
};
export function TrainingBuilder({ state, update, start }: Props) {
  const suggestion = nextTrainingSuggestion(state);
  const draft: TrainingDraft = state.trainingDraft ?? {
    type: suggestion.type,
    plans: {},
  };
  const type = draft.type,
    ids = draft.plans[type] ?? [],
    selected = selectedCandidates(ids);
  const coverage = trainingCoverage(type, selected),
    missing = coverage.filter((g) => !g.count);
  const [library, setLibrary] = useState<{ group?: MuscleGroup } | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState("");
  const changeType = (type: TrainingType) => {
    setConfirm(false);
    setError("");
    void update((s) => ({
      ...s,
      trainingDraft: { ...(s.trainingDraft ?? draft), type },
    }));
  };
  const toggle = (c: Candidate) => {
    setConfirm(false);
    setError("");
    try {
      void update((s) => {
        const current = s.trainingDraft ?? draft;
        const previous = current.plans[type] ?? [];
        const next = previous.includes(c.id)
          ? previous.filter((id) => id !== c.id)
          : [...previous, c.id];
        validateSelection(type, selectedCandidates(next), true);
        return {
          ...s,
          trainingDraft: {
            ...current,
            plans: { ...current.plans, [type]: next },
          },
        };
      }).catch((e) => setError(e.message));
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const reorder = (index: number) => {
    if (index >= ids.length - 1) return;
    setConfirm(false);
    const next = [...ids];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    void update((s) => ({
      ...s,
      trainingDraft: { ...draft, plans: { ...draft.plans, [type]: next } },
    }));
  };
  const begin = () => {
    try {
      start(createSelectedWorkout(state, type, ids, confirm));
    } catch (e) {
      setError((e as Error).message);
    }
  };
  return (
    <div className="training-builder">
      <section className="iron-suggestion">
        <span className="eyebrow">NASLEDNJI PREDLOG</span>
        <div>
          <strong>{trainingLabels[suggestion.type]}</strong>
          <p>{suggestion.reason}</p>
        </div>
        {type !== suggestion.type && (
          <button
            className="button secondary"
            onClick={() => changeType(suggestion.type)}
          >
            Uporabi predlog
            <ArrowRight size={16} />
          </button>
        )}
      </section>
      <div
        className="training-type-tabs"
        role="group"
        aria-label="Vrsta treninga"
      >
        {trainingTypes.map((day) => (
          <button
            key={day}
            className={type === day ? "active" : ""}
            aria-pressed={type === day}
            onClick={() => changeType(day)}
          >
            <span aria-hidden="true">
              {String(trainingTypes.indexOf(day) + 1).padStart(2, "0")}
            </span>
            {trainingLabels[day]}
            {type === day && <Check size={16} />}
          </button>
        ))}
      </div>
      <div className="builder-heading">
        <div>
          <span className="eyebrow">01 / SESTAVI SVOJ TRENING</span>
          <h2>
            {trainingLabels[type]}
            <span>.</span>
          </h2>
          <p>{trainingDescriptions[type]}</p>
        </div>
        <button className="button secondary" onClick={() => setLibrary({})}>
          <BookOpen size={18} />
          Knjižnica vaj
          <ChevronDown size={16} />
        </button>
      </div>
      <p className="builder-rule">
        Največ dve vaji na glavno mišično skupino. Večsklepno vajo štejemo pri
        njeni glavni skupini; pomožne mišice so navedene v knjižnici.
      </p>
      <div className="builder-layout">
        <div className="muscle-group-list">
          {dayGroups[type].map((group) => {
            const chosen = selected.filter((c) => primaryMuscle(c) === group);
            return (
              <section
                key={group}
                className={`muscle-group panel ${chosen.length ? "has-exercises" : ""}`}
                aria-label={groupLabel(type, group)}
              >
                <div className="muscle-group-head">
                  <div>
                    <span className="eyebrow">GLAVNA MIŠIČNA SKUPINA</span>
                    <h3>{groupLabel(type, group)}</h3>
                  </div>
                  <strong
                    className="muscle-count"
                    aria-label={`${groupLabel(type, group)}: ${chosen.length} od 2 vaj`}
                  >
                    {chosen.length}
                    <span> / 2</span>
                  </strong>
                </div>
                {chosen.length ? (
                  <ol className="selected-exercises">
                    {chosen.map((c) => (
                      <li key={c.id}>
                        <span>
                          {String(ids.indexOf(c.id) + 1).padStart(2, "0")}
                        </span>
                        <div>
                          <strong>{c.name}</strong>
                          <small>{c.equipment} · 3 serije za pripravo</small>
                        </div>
                        <button
                          className="icon-button"
                          aria-label={`Odstrani ${c.name}`}
                          onClick={() => toggle(c)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="muscle-empty">
                    Za to skupino še nimaš izbrane vaje.
                  </p>
                )}
                <button
                  className="button secondary group-add"
                  disabled={chosen.length >= 2}
                  onClick={() => setLibrary({ group })}
                >
                  <Plus size={16} />
                  {chosen.length >= 2
                    ? "Izbrani sta dve vaji"
                    : `Izberi vajo · ${groupLabel(type, group)}`}
                </button>
              </section>
            );
          })}
        </div>
        <aside className="builder-summary panel">
          <span className="eyebrow">02 / PRED ZAČETKOM</span>
          <h2>
            Tvoja izbira.
            <br />
            <em>Tvoj trening.</em>
          </h2>
          <div className="builder-total">
            <strong>{selected.length}</strong>
            <span>
              izbranih vaj
              <br />
              {coverage.filter((g) => g.count).length} / {coverage.length}{" "}
              pokritih skupin
            </span>
          </div>
          <div className="coverage-list" aria-label="Pokritost mišičnih skupin">
            {coverage.map((g) => (
              <div key={g.group}>
                <span>
                  {g.count ? (
                    <Check size={14} />
                  ) : (
                    <span className="coverage-empty">—</span>
                  )}
                  {g.label}
                </span>
                <b>{g.count}/2</b>
              </div>
            ))}
          </div>
          {selected.length > 0 && (
            <details className="exercise-order">
              <summary>Vrstni red vaj</summary>
              <ol>
                {ids.map((id, index) => (
                  <li key={id}>
                    <span>
                      {index + 1}. {byId(id)!.name}
                    </span>
                    {index < ids.length - 1 && (
                      <button
                        className="icon-button"
                        aria-label={`Premakni ${byId(id)!.name} nižje`}
                        onClick={() => reorder(index)}
                      >
                        <ArrowDown size={15} />
                      </button>
                    )}
                  </li>
                ))}
              </ol>
            </details>
          )}
          {missing.length > 0 && (
            <div className="missing-groups" role="status">
              <strong>
                <AlertCircle size={17} />
                Še brez vaje
              </strong>
              <p>{missing.map((g) => g.label).join(" · ")}</p>
              {selected.length > 0 && (
                <label>
                  <input
                    type="checkbox"
                    checked={confirm}
                    onChange={(e) => {
                      setConfirm(e.target.checked);
                      setError("");
                    }}
                  />
                  Danes te skupine zavestno izpustim.
                </label>
              )}
            </div>
          )}
          {error && (
            <p role="alert" className="builder-error">
              {error}
            </p>
          )}
          <button
            className="button start-selected"
            onClick={begin}
            disabled={!selected.length || (missing.length > 0 && !confirm)}
          >
            Začni vadbo
            <Play size={17} fill="currentColor" />
          </button>
          <p className="builder-storage-note">
            Izbira se sproti shrani. Opravljene serije potrdiš med vadbo.
          </p>
        </aside>
      </div>
      {library && (
        <ExerciseLibrary
          state={state}
          trainingType={type}
          selectedCandidates={selected}
          initialGroup={library.group}
          onChoose={(e) => {
            const c = byId(e.id);
            if (c && fitsTraining(c, type)) toggle(c);
          }}
          onRemove={toggle}
          keepOpenOnChoose
          close={() => setLibrary(null)}
        />
      )}
      <details className="library-primer">
        <summary>
          <BookOpen size={16} />
          Kaj je v knjižnici?
        </summary>
        <p>
          Prenesena knjižnica Težišča: 55 vaj, filtri po opremi in mišicah,
          iskanje tudi po vzdevkih, skice začetnega in končnega položaja,
          navodila ter zadnji dejanski rezultati. V tem sklopu vidiš samo
          primerne vaje.
        </p>
        {selected[0] && <ExerciseSketch exercise={selected[0]} compact />}
      </details>
    </div>
  );
}
