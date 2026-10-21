import { useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  RotateCcw,
} from "lucide-react";
import { BusyDevice, CoachExerciseInfo } from "./Trainer";
import { reconcileExercise } from "./coach";
import { candidateForExercise, loadLabel } from "./exerciseCatalog";
import { ExerciseSketch } from "./ExerciseSketch";
import { ExerciseLibraryButton } from "./ExerciseLibrary";
import {
  applyLoadAdvice,
  completeQuickSet,
  historySummary,
  loadAdvice,
} from "./loadAdvice";
import {
  dateLabel,
  emptySet,
  modes,
  num,
  type Exercise,
  type State,
  type Workout,
} from "./model";

const exerciseKey = (e: Exercise, i: number) =>
  `${e.id}:${e.coach?.slotId ?? e.sets.find((s) => s.kind !== "warmup")?.id ?? e.sets[0]?.id ?? i}`;

function QuickNumber({
  value,
  label,
  unit,
  step,
  min,
  max,
  change,
  disabled = false,
}: {
  value?: number;
  label: string;
  unit: string;
  step: number;
  min: number;
  max: number;
  change: (v?: number) => void;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState(value === undefined ? "" : String(value));
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    setDraft(value === undefined ? "" : String(value));
    input.current?.setCustomValidity("");
  }, [value]);
  const adjust = (direction: number) => {
    const parsed = Number(draft.replace(",", "."));
    const next =
      Math.round(
        Math.max(
          min,
          Math.min(
            max,
            (draft && Number.isFinite(parsed) ? parsed : (value ?? min)) +
              direction * step,
          ),
        ) * 100,
      ) / 100;
    input.current?.setCustomValidity("");
    setDraft(String(next));
    change(next);
  };
  const name = unit === "pon." || unit === "min" ? "ponovitve" : "težo";
  return (
    <div className="quick-number">
      <span className="quick-field-label">
        {unit === "pon." ? "Ponovitve" : unit === "min" ? "Minute" : "Teža"}
      </span>
      <div className="quick-stepper">
        <button
          type="button"
          disabled={disabled}
          aria-label={`Zmanjšaj ${name}`}
          onClick={() => adjust(-1)}
        >
          <Minus size={18} />
        </button>
        <label>
          <input
            ref={input}
            aria-label={label}
            type="text"
            inputMode={step < 1 || name === "težo" ? "decimal" : "numeric"}
            required
            disabled={disabled}
            pattern={name === "težo" ? "[0-9]+([.,][0-9]+)?" : "[0-9]+"}
            value={draft}
            placeholder="—"
            onChange={(event) => {
              const text = event.target.value;
              setDraft(text);
              const number = Number(text.replace(",", "."));
              const valid =
                text.trim() !== "" &&
                Number.isFinite(number) &&
                number >= min &&
                number <= max &&
                (name === "težo" || Number.isInteger(number));
              event.target.setCustomValidity(
                valid ? "" : `Vnesi ${min}–${max}.`,
              );
              change(valid ? number : undefined);
            }}
            onBlur={(event) => {
              if (event.target.validity.valid && draft !== "")
                setDraft(String(Number(draft.replace(",", "."))));
            }}
          />
          <small>{unit}</small>
        </label>
        <button
          type="button"
          disabled={disabled}
          aria-label={`Povečaj ${name}`}
          onClick={() => adjust(1)}
        >
          <Plus size={18} />
        </button>
      </div>
    </div>
  );
}

export function FocusWorkout({
  workout: w,
  state,
  onChange,
  onDone,
  onReplaceDevice,
  showDetails,
}: {
  workout: Workout;
  state: State;
  onChange: (w: Workout) => void;
  onDone: (rest: number) => void;
  onReplaceDevice: (index: number, id: string, permanent: boolean) => void;
  showDetails: () => void;
}) {
  const [selected, setSelected] = useState<string>();
  const [selectedSet, setSelectedSet] = useState<string>();
  const [logging, setLogging] = useState(false);
  const nextLogAt = useRef(0);
  const logTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(logTimer.current), []);
  const pendingIndex = w.exercises.findIndex(
    (e) => e.sets.some((s) => !s.done) && !e.coach?.retired,
  );
  const selectedIndex = w.exercises.findIndex(
    (e, i) => exerciseKey(e, i) === selected,
  );
  const index = selectedIndex >= 0 ? selectedIndex : Math.max(0, pendingIndex);
  const e = w.exercises[index];
  const select = (i: number) => {
    setSelected(exerciseKey(w.exercises[i], i));
    setSelectedSet(undefined);
  };
  const change = (next: Exercise) =>
    onChange(reconcileExercise(w, index, next));
  if (!e)
    return (
      <section className="panel">
        <h2>Dodaj prvo vajo</h2>
        <ExerciseLibraryButton
          state={state}
          onChoose={(next) => onChange({ ...w, exercises: [next] })}
        />
        <button className="text-button" onClick={showDetails}>
          Lastna vaja in nastavitve
        </button>
      </section>
    );
  const current =
    e.sets.find((s) => s.id === selectedSet && !s.done) ??
    e.sets.find((s) => !s.done);
  const setIndex = current ? e.sets.indexOf(current) : -1;
  const finished = e.sets.filter((s) => s.done).length;
  const cat = candidateForExercise(e);
  const advice = loadAdvice(state, e, w.date, w.id);
  const patchSet = (patch: Partial<NonNullable<typeof current>>) =>
    current &&
    change({
      ...e,
      sets: e.sets.map((s) => (s.id === current.id ? { ...s, ...patch } : s)),
    });
  const nextIndex = w.exercises.findIndex(
    (other, i) =>
      i > index && other.sets.some((s) => !s.done) && !other.coach?.retired,
  );
  return (
    <div className="focus-workout">
      <details className="focus-outline">
        <summary>
          <span>
            Vaja {index + 1} od {w.exercises.length}
          </span>
          <strong>Pregled vaj</strong>
        </summary>
        <div className="focus-exercise-list">
          {w.exercises.map((other, i) => (
            <button
              key={exerciseKey(other, i)}
              className={i === index ? "selected" : ""}
              aria-current={i === index ? "step" : undefined}
              onClick={() => select(i)}
            >
              <span>
                {i + 1}. {other.name}
              </span>
              <small>
                {other.sets.filter((s) => s.done).length}/{other.sets.length}{" "}
                <Check size={13} />
              </small>
            </button>
          ))}
        </div>
      </details>
      <section
        className="panel focus-exercise exercise-card"
        aria-label={`Trenutna vaja: ${e.name}`}
      >
        <div className="focus-exercise-heading">
          <div>
            <div className="eyebrow">
              {e.cardio ? "KARDIO" : cat?.muscles.join(" · ") || "TVOJA VAJA"}
            </div>
            <h2>{e.name}</h2>
            <p>
              {e.cardio
                ? "Dejanske opravljene minute"
                : cat && e.mode !== "unknown"
                  ? loadLabel({ ...cat, mode: e.mode })
                  : modes[e.mode]}
            </p>
          </div>
          <span className="focus-count">
            {finished}
            <small>/{e.sets.length}</small>
          </span>
        </div>
        {!e.cardio && (
          <div className="focus-reference">
            {advice.last ? (
              <>
                <span className="reference-label">
                  Zadnjič · {dateLabel(advice.last.workout.date)}
                </span>
                <strong>
                  {advice.last.sets
                    .map((s) => `${num(s.weight)} × ${s.reps}`)
                    .join(" / ")}
                </strong>
                {advice.canApply && current && (
                  <button
                    className="text-button"
                    onClick={() => change(applyLoadAdvice(e, advice))}
                  >
                    Uporabi zadnje
                  </button>
                )}
              </>
            ) : advice.kind === "estimate" ? (
              <>
                <span className="reference-label">
                  Uvodna ocena · nizka zanesljivost
                </span>
                <strong>
                  {num(advice.weight!)} kg{" "}
                  <small>
                    ({num(advice.range![0])}–{num(advice.range![1])} kg)
                  </small>
                </strong>
                {current && (
                  <button
                    className="text-button"
                    onClick={() => change(applyLoadAdvice(e, advice))}
                  >
                    Uporabi uvodno oceno
                  </button>
                )}
              </>
            ) : (
              <>
                <span className="reference-label">Prvič pri tej izvedbi</span>
                <strong>Izberi lahko začetno težo</strong>
              </>
            )}
          </div>
        )}
        {current ? (
          <form
            className="quick-set"
            key={current.id}
            onSubmit={(event) => {
              event.preventDefault();
              if (Date.now() < nextLogAt.current) return;
              const next = completeQuickSet(e, current.id);
              if (next !== e) {
                nextLogAt.current = Date.now() + 900;
                setLogging(true);
                logTimer.current = setTimeout(() => setLogging(false), 900);
                change(next);
                setSelectedSet(undefined);
                onDone(e.cardio ? 0 : e.rest);
              }
            }}
          >
            <div className="quick-set-heading">
              <span>
                Serija {setIndex + 1} / {e.sets.length}
              </span>
              {!e.cardio && (
                <select
                  aria-label={`Vrsta serije ${setIndex + 1} ${e.name}`}
                  value={current.kind}
                  onChange={(event) =>
                    patchSet({
                      kind: event.target.value as typeof current.kind,
                    })
                  }
                >
                  <option value="work">Delovna</option>
                  <option value="warmup">Ogrevanje</option>
                  <option value="unknown">Vrsta ni določena</option>
                </select>
              )}
            </div>
            <div className={`quick-fields ${e.cardio ? "cardio" : ""}`}>
              {!e.cardio && (
                <QuickNumber
                  value={current.loadPending ? undefined : current.weight}
                  label={`Teža serije ${setIndex + 1} ${e.name}`}
                  unit="kg"
                  step={e.increment}
                  min={0}
                  max={9999}
                  change={(weight) =>
                    patchSet({
                      weight: weight ?? current.weight,
                      loadPending: weight === undefined,
                    })
                  }
                />
              )}
              <QuickNumber
                value={current.reps}
                label={`${e.cardio ? "Minute" : "Ponovitve"} serije ${setIndex + 1} ${e.name}`}
                unit={e.cardio ? "min" : "pon."}
                step={1}
                min={1}
                max={999}
                change={(reps) => {
                  if (reps !== undefined) patchSet({ reps });
                }}
              />
            </div>
            {!e.cardio && (
              <details className="quick-rir">
                <summary>
                  Rezerva ponovitev{" "}
                  {current.rir !== undefined
                    ? `· ${current.rir}`
                    : "· neobvezno"}
                </summary>
                <p>Koliko ponovitev bi še lahko naredil?</p>
                <div>
                  {[0, 1, 2, 3, 4, 5].map((rir) => (
                    <button
                      type="button"
                      key={rir}
                      aria-pressed={current.rir === rir}
                      onClick={() => patchSet({ rir })}
                    >
                      {rir}
                    </button>
                  ))}
                  <button
                    type="button"
                    aria-label="Počisti rezervo ponovitev"
                    onClick={() => patchSet({ rir: undefined })}
                  >
                    —
                  </button>
                </div>
              </details>
            )}
            <button
              type="submit"
              className="button quick-log"
              disabled={logging || !!current.loadPending || current.reps <= 0}
              aria-label={`Potrdi serijo ${setIndex + 1} ${e.name}`}
            >
              <Check size={21} />
              {logging
                ? "Serija shranjena"
                : e.cardio
                  ? "Potrdi opravljene minute"
                  : "Serija opravljena"}
            </button>
            {!e.cardio &&
              e.sets.filter((s) => !s.done && s.kind === current.kind).length >
                1 && (
                <button
                  type="button"
                  className="text-button quick-repeat"
                  disabled={!!current.loadPending}
                  onClick={() =>
                    change({
                      ...e,
                      sets: e.sets.map((s) =>
                        s.done || s.kind !== current.kind
                          ? s
                          : {
                              ...s,
                              weight: current.weight,
                              reps: current.reps,
                              loadPending: false,
                            },
                      ),
                    })
                  }
                >
                  Enaka teža in ponovitve za preostale serije
                </button>
              )}
          </form>
        ) : (
          <div className="focus-exercise-complete">
            <Check size={30} />
            <h3>Vaja je opravljena</h3>
            <p>
              {nextIndex >= 0
                ? `Naslednja: ${w.exercises[nextIndex].name}`
                : "Opravljene serije so shranjene. Trening lahko zaključiš spodaj."}
            </p>
            {nextIndex >= 0 && (
              <button className="button" onClick={() => select(nextIndex)}>
                Naslednja vaja <ChevronRight size={17} />
              </button>
            )}
          </div>
        )}
        {finished > 0 && (
          <div className="quick-completed" aria-label="Opravljene serije">
            {e.sets.map((s, j) =>
              s.done ? (
                <div key={s.id}>
                  <span>
                    <Check size={14} />
                    {j + 1}. {s.kind === "warmup" ? "ogrevanje · " : ""}
                    {e.cardio
                      ? `${s.reps} min`
                      : `${num(s.weight)} kg × ${s.reps}`}
                  </span>
                  <button
                    className="icon-button"
                    aria-label={`Razveljavi serijo ${j + 1} ${e.name}`}
                    onClick={() => {
                      change({
                        ...e,
                        sets: e.sets.map((a) =>
                          a.id === s.id ? { ...a, done: false } : a,
                        ),
                      });
                      setSelectedSet(s.id);
                    }}
                  >
                    <RotateCcw size={15} />
                  </button>
                </div>
              ) : null,
            )}
          </div>
        )}
        {!e.cardio && (
          <details className="focus-details">
            <summary>Skica, izvedba in podlaga teže</summary>
            {cat && (
              <>
                <ExerciseSketch exercise={cat} />
                <p>{cat.instructions}</p>
              </>
            )}
            <p>{advice.reason}</p>
            {advice.sources.map((source) => (
              <p key={`${source.workout.id}:${source.exercise.id}`}>
                <strong>{source.exercise.name}</strong> ·{" "}
                {historySummary(source)}
              </p>
            ))}
            {e.coach?.seat && <p>Sedež / opore: {e.coach.seat}</p>}
            <button className="text-button" onClick={showDetails}>
              Vse serije in nastavitve
            </button>
          </details>
        )}
        {!e.cardio && (
          <div className="focus-pain">
            <label className={`check-label ${e.pain ? "pain-active" : ""}`}>
              <input
                type="checkbox"
                checked={e.pain}
                onChange={(event) =>
                  change({ ...e, pain: event.target.checked })
                }
              />
              Bolečina pri tej vaji
            </label>
            {e.pain && (
              <p role="status">
                Vajo prilagodi ali prekini. Obremenitve ne povečuj.
              </p>
            )}
          </div>
        )}
        {e.coach?.calibration && current?.loadPending && (
          <details className="focus-details">
            <summary>Uvodni preizkus na napravi</summary>
            <CoachExerciseInfo e={e} state={state} change={change} />
          </details>
        )}
        <div className="focus-navigation">
          <button
            className="text-button"
            disabled={index === 0}
            onClick={() => select(index - 1)}
          >
            <ChevronLeft size={17} />
            Prejšnja
          </button>
          <button
            className="text-button"
            disabled={index === w.exercises.length - 1}
            onClick={() => select(index + 1)}
          >
            Naslednja
            <ChevronRight size={17} />
          </button>
        </div>
      </section>
      <div className="focus-tools">
        <BusyDevice
          state={state}
          index={index}
          move={() => {
            const rows = [...w.exercises];
            const item = rows.splice(index, 1)[0];
            onChange({ ...w, exercises: [...rows, item] });
            setSelected(undefined);
            setSelectedSet(undefined);
          }}
          replace={(id, permanent) => {
            onReplaceDevice(index, id, permanent);
            setSelected(undefined);
            setSelectedSet(undefined);
          }}
        />
        <ExerciseLibraryButton
          state={state}
          label="Dodaj vajo"
          onChoose={(next) =>
            onChange({ ...w, exercises: [...w.exercises, next] })
          }
        />
        <button
          className="text-button"
          onClick={() =>
            change({
              ...e,
              sets: [
                ...e.sets,
                {
                  ...emptySet(),
                  weight: current?.weight ?? e.sets.at(-1)?.weight ?? 0,
                  reps: current?.reps ?? e.sets.at(-1)?.reps ?? e.minReps,
                  loadPending:
                    current?.loadPending ?? e.sets.at(-1)?.loadPending,
                },
              ],
            })
          }
        >
          <Plus size={15} />
          Dodaj serijo
        </button>
      </div>
    </div>
  );
}
