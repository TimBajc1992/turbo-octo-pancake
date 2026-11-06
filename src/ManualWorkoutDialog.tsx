import { useEffect, useRef, useState } from "react";
import { BookOpen, Check, Copy, Plus, Save, Trash2, X } from "lucide-react";
import { ExerciseLibrary } from "./ExerciseLibrary";
import { loadLabel, candidateForExercise } from "./exerciseCatalog";
import {
  commitManualWorkout,
  copyManualSet,
  isCalendarDate,
  newManualExercise,
  newManualSet,
} from "./manualWorkout";
import {
  localDate,
  modes,
  type Exercise,
  type LiftSet,
  type State,
  type Workout,
} from "./model";
import { trainingLabels, trainingTypes, type TrainingType } from "./training";

type Update = (fn: (s: State) => State) => Promise<void>;
function ActualNumber({
  value,
  change,
  label,
  integer = false,
  max,
  optional = false,
}: {
  value?: number;
  change: (value?: number) => void;
  label: string;
  integer?: boolean;
  max: number;
  optional?: boolean;
}) {
  const [raw, setRaw] = useState(value === undefined ? "" : String(value));
  const focused = useRef(false),
    ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!focused.current) setRaw(value === undefined ? "" : String(value));
  }, [value]);
  return (
    <input
      ref={ref}
      aria-label={label}
      type="text"
      inputMode={integer ? "numeric" : "decimal"}
      pattern={integer ? "[0-9]+" : "[0-9]+([.,][0-9]+)?"}
      required={!optional}
      value={raw}
      placeholder="—"
      onFocus={() => {
        focused.current = true;
      }}
      onBlur={() => {
        focused.current = false;
      }}
      onChange={(event) => {
        const text = event.target.value;
        setRaw(text);
        const n = Number(text.replace(",", "."));
        const valid =
          Number.isFinite(n) &&
          n >= 0 &&
          n <= max &&
          (!integer || Number.isInteger(n));
        ref.current?.setCustomValidity(
          text && !valid ? `Vpiši število od 0 do ${max}.` : "",
        );
        if (!text) change(undefined);
        else if (valid && (integer ? /^\d+$/ : /^\d+(?:[.,]\d+)?$/).test(text))
          change(n);
      }}
    />
  );
}
export function ManualWorkoutDialog({
  state,
  update,
  close,
  saved,
}: {
  state: State;
  update: Update;
  close: () => void;
  saved: () => void;
}) {
  const last = useRef(state.manualWorkoutDraft);
  if (state.manualWorkoutDraft) last.current = state.manualWorkoutDraft;
  const draft = state.manualWorkoutDraft ?? last.current;
  const ref = useRef<HTMLDialogElement>(null),
    busy = useRef(false);
  const [library, setLibrary] = useState(false),
    [customName, setCustomName] = useState(""),
    [customKind, setCustomKind] = useState("strength"),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false);
  const [dateText, setDateText] = useState(draft?.date ?? localDate());
  useEffect(() => {
    if (draft) setDateText(draft.date);
  }, [draft?.id, draft?.date]);
  useEffect(() => {
    const dialog = ref.current,
      focus = document.activeElement as HTMLElement | null,
      previous = document.body.style.overflow;
    dialog?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = previous;
      focus?.focus();
    };
  }, []);
  if (!draft) return null;
  const edit = (fn: (w: Workout) => Workout) => {
    setError("");
    void update((s) =>
      s.manualWorkoutDraft
        ? { ...s, manualWorkoutDraft: fn(s.manualWorkoutDraft) }
        : s,
    ).catch((e) => setError(e.message));
  };
  const exerciseEdit = (id: string, fn: (e: Exercise) => Exercise) =>
    edit((w) => ({
      ...w,
      exercises: w.exercises.map((e) => (e.id === id ? fn(e) : e)),
    }));
  const setEdit = (
    exerciseId: string,
    setId: string,
    patch: Partial<LiftSet>,
  ) =>
    exerciseEdit(exerciseId, (e) => ({
      ...e,
      sets: e.sets.map((s) =>
        s.id === setId ? { ...s, ...patch, done: false } : s,
      ),
    }));
  const add = (source?: Exercise) => {
    let e = newManualExercise(source, customName);
    if (!e.name.trim()) return;
    if (!source && customKind === "cardio")
      e = {
        ...e,
        cardio: true,
        mode: "bodyweight",
        equipment: "",
        sets: e.sets.map((s) => ({ ...s, weight: 0, loadPending: false })),
      };
    edit((w) =>
      w.exercises.some((row) => row.id === e.id)
        ? w
        : { ...w, exercises: [...w.exercises, e] },
    );
    setCustomName("");
  };
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy.current) return;
    busy.current = true;
    setSaving(true);
    setError("");
    try {
      await update((s) => commitManualWorkout(s));
      saved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      busy.current = false;
      setSaving(false);
    }
  };
  return (
    <>
      <dialog
        ref={ref}
        className="manual-workout-dialog"
        aria-labelledby="manual-title"
        onCancel={(e) => {
          e.preventDefault();
          if (!saving) close();
        }}
      >
        <div className="modal-head">
          <div>
            <span className="eyebrow">KO TELEFON OSTANE DOMA</span>
            <h2 id="manual-title">Naknadni vnos treninga</h2>
          </div>
          <button
            className="icon-button"
            aria-label="Zapri naknadni vnos"
            onClick={close}
            disabled={saving}
          >
            <X />
          </button>
        </div>
        <p className="manual-intro">
          Zapiši dejansko opravljene vaje in serije. Osnutek se sproti shrani;
          trening dodaš v zgodovino z gumbom spodaj.
        </p>
        <form
          onSubmit={submit}
          onKeyDown={(e) => {
            if (
              e.key === "Enter" &&
              e.target instanceof HTMLInputElement &&
              e.target.type !== "checkbox"
            )
              e.preventDefault();
          }}
        >
          <fieldset disabled={saving}>
            <legend className="manual-section-label">01 / O TRENINGU</legend>
            <div className="manual-details-grid">
              <label>
                Datum treninga
                <input
                  type="date"
                  max={localDate()}
                  required
                  value={dateText}
                  onChange={(e) => {
                    setDateText(e.target.value);
                    if (isCalendarDate(e.target.value))
                      edit((w) => ({ ...w, date: e.target.value }));
                  }}
                />
              </label>
              <label>
                Ime treninga
                <input
                  type="text"
                  maxLength={120}
                  required
                  value={draft.name}
                  onChange={(e) =>
                    edit((w) => ({ ...w, name: e.target.value }))
                  }
                />
              </label>
              <label>
                Sklop treninga
                <select
                  aria-label="Sklop treninga"
                  value={draft.trainingType ?? ""}
                  onChange={(e) => {
                    const type = e.target.value as TrainingType | "";
                    edit((w) => ({
                      ...w,
                      trainingType: type || undefined,
                      name:
                        w.name === "Trening za nazaj" ||
                        Object.values(trainingLabels).includes(w.name)
                          ? type
                            ? trainingLabels[type]
                            : "Trening za nazaj"
                          : w.name,
                    }));
                  }}
                >
                  <option value="">Mešan trening / brez sklopa</option>
                  {trainingTypes.map((type) => (
                    <option key={type} value={type}>
                      {trainingLabels[type]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Trajanje (min, neobvezno)
                <ActualNumber
                  label="Trajanje treninga v minutah"
                  value={draft.durationMin || undefined}
                  integer
                  optional
                  max={1440}
                  change={(n) =>
                    edit((w) => ({
                      ...w,
                      durationMin: n ?? 0,
                      reviewDuration: !n || n <= 1,
                    }))
                  }
                />
              </label>
            </div>
            <p className="manual-field-help">
              Če trajanja ne poznaš, polje pusti prazno.
            </p>
          </fieldset>
          <fieldset disabled={saving} className="manual-exercises">
            <legend className="manual-section-label">
              02 / OPRAVLJENE VAJE IN SERIJE
            </legend>
            {!draft.exercises.length && (
              <div className="manual-empty">
                <BookOpen size={26} />
                <h3>Začni s prvo vajo.</h3>
                <p>Izberi jo iz knjižnice ali spodaj dodaj svojo.</p>
              </div>
            )}
            {draft.exercises.map((exercise, index) => {
              const candidate = candidateForExercise(exercise),
                unit = exercise.cardio
                  ? "Minute aktivnosti"
                  : candidate
                    ? loadLabel({ ...candidate, mode: exercise.mode })
                    : modes[exercise.mode];
              return (
                <section className="manual-exercise" key={exercise.id}>
                  <div className="manual-exercise-head">
                    <div>
                      <small>{String(index + 1).padStart(2, "0")} / VAJA</small>
                      <h3>{exercise.name}</h3>
                      <p>{unit}</p>
                    </div>
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={`Odstrani vajo ${exercise.name}`}
                      onClick={() =>
                        edit((w) => ({
                          ...w,
                          exercises: w.exercises.filter(
                            (e) => e.id !== exercise.id,
                          ),
                        }))
                      }
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  <div className="manual-set-heading" aria-hidden="true">
                    <span>SERIJA</span>
                    <span>{exercise.cardio ? "—" : "TEŽA (KG)"}</span>
                    <span>{exercise.cardio ? "MIN." : "PON."}</span>
                    <span>{exercise.cardio ? "—" : "RIR"}</span>
                    <span />
                  </div>
                  {exercise.sets.map((set, i) => (
                    <div className="manual-set-row" key={set.id}>
                      <span>{i + 1}</span>
                      <>
                        {exercise.cardio ? (
                          <span className="manual-na">—</span>
                        ) : (
                          <ActualNumber
                            label={`${exercise.name}, serija ${i + 1}, teža`}
                            value={set.loadPending ? undefined : set.weight}
                            max={9999}
                            change={(n) =>
                              setEdit(exercise.id, set.id, {
                                weight: n ?? 0,
                                loadPending: n === undefined,
                              })
                            }
                          />
                        )}
                      </>
                      <ActualNumber
                        label={`${exercise.name}, serija ${i + 1}, ${exercise.cardio ? "minute" : "ponovitve"}`}
                        value={set.reps || undefined}
                        integer
                        max={exercise.cardio ? 1440 : 999}
                        change={(n) =>
                          setEdit(exercise.id, set.id, { reps: n ?? 0 })
                        }
                      />
                      <>
                        {exercise.cardio ? (
                          <span className="manual-na">—</span>
                        ) : (
                          <ActualNumber
                            label={`${exercise.name}, serija ${i + 1}, RIR`}
                            value={set.rir}
                            integer
                            optional
                            max={10}
                            change={(n) =>
                              setEdit(exercise.id, set.id, { rir: n })
                            }
                          />
                        )}
                      </>
                      <button
                        type="button"
                        className="icon-button"
                        aria-label={`Odstrani serijo ${i + 1} ${exercise.name}`}
                        disabled={exercise.sets.length <= 1}
                        onClick={() =>
                          exerciseEdit(exercise.id, (e) => ({
                            ...e,
                            sets: e.sets.filter((s) => s.id !== set.id),
                          }))
                        }
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                  <div className="manual-set-actions">
                    <button
                      type="button"
                      className="button secondary"
                      onClick={() =>
                        exerciseEdit(exercise.id, (e) => ({
                          ...e,
                          sets: [...e.sets, newManualSet()],
                        }))
                      }
                    >
                      <Plus size={16} />
                      Dodaj serijo
                    </button>
                    <button
                      type="button"
                      className="button secondary"
                      disabled={
                        !exercise.sets.length ||
                        !!exercise.sets.at(-1)?.loadPending ||
                        !exercise.sets.at(-1)?.reps
                      }
                      onClick={() =>
                        exerciseEdit(exercise.id, (e) => ({
                          ...e,
                          sets: [...e.sets, copyManualSet(e.sets.at(-1)!)],
                        }))
                      }
                    >
                      <Copy size={15} />
                      Dodaj enako serijo
                    </button>
                  </div>
                  <details className="manual-exercise-details">
                    <summary>Oprema, vrste serij in opombe</summary>
                    <div className="manual-set-kinds">
                      <strong>Vrsta zapisanih serij</strong>
                      {exercise.sets.map((set, i) => (
                        <label key={set.id}>
                          Serija {i + 1}
                          <select
                            aria-label={`${exercise.name}, serija ${i + 1}, vrsta`}
                            value={set.kind}
                            onChange={(event) =>
                              setEdit(exercise.id, set.id, {
                                kind: event.target.value as LiftSet["kind"],
                              })
                            }
                          >
                            <option value="work">Delovna</option>
                            <option value="warmup">Ogrevanje</option>
                            <option value="unknown">Ne vem</option>
                          </select>
                        </label>
                      ))}
                    </div>
                    <div className="manual-details-grid">
                      <label>
                        Način obremenitve
                        <select
                          value={exercise.mode}
                          onChange={(e) =>
                            exerciseEdit(exercise.id, (row) => ({
                              ...row,
                              mode: e.target.value as Exercise["mode"],
                              confirmed: false,
                            }))
                          }
                        >
                          {Object.entries(modes).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Oprema
                        <input
                          value={exercise.equipment}
                          maxLength={160}
                          onChange={(e) =>
                            exerciseEdit(exercise.id, (row) => ({
                              ...row,
                              equipment: e.target.value,
                              confirmed: false,
                            }))
                          }
                        />
                      </label>
                      <label className="manual-wide">
                        Opomba vaje
                        <input
                          value={exercise.note}
                          maxLength={1000}
                          onChange={(e) =>
                            exerciseEdit(exercise.id, (row) => ({
                              ...row,
                              note: e.target.value,
                            }))
                          }
                        />
                      </label>
                    </div>
                    <label className="manual-check">
                      <input
                        type="checkbox"
                        checked={exercise.confirmed}
                        onChange={(e) =>
                          exerciseEdit(exercise.id, (row) => ({
                            ...row,
                            confirmed: e.target.checked,
                          }))
                        }
                      />
                      Potrjujem način obremenitve in uporabljeno opremo.
                    </label>
                    <label className="manual-check">
                      <input
                        type="checkbox"
                        checked={exercise.pain}
                        onChange={(e) =>
                          exerciseEdit(exercise.id, (row) => ({
                            ...row,
                            pain: e.target.checked,
                          }))
                        }
                      />
                      Pri tej vaji sem občutil bolečino.
                    </label>
                  </details>
                </section>
              );
            })}
            <div className="manual-add">
              <button
                type="button"
                className="button secondary"
                onClick={() => setLibrary(true)}
              >
                <BookOpen size={17} />
                Izberi iz knjižnice
              </button>
              <div className="manual-custom">
                <label>
                  Vrsta lastne vaje
                  <select
                    aria-label="Vrsta lastne vaje"
                    value={customKind}
                    onChange={(e) => setCustomKind(e.target.value)}
                  >
                    <option value="strength">Vaja za moč</option>
                    <option value="cardio">Kardio · minute</option>
                  </select>
                </label>
                <label>
                  Lastna vaja
                  <input
                    value={customName}
                    maxLength={100}
                    placeholder="Ime vaje, ki si jo opravil"
                    onChange={(e) => setCustomName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && customName.trim()) {
                        e.preventDefault();
                        add();
                      }
                    }}
                  />
                </label>
                <button
                  type="button"
                  className="button secondary"
                  disabled={!customName.trim()}
                  onClick={() => add()}
                >
                  <Plus size={16} />
                  Dodaj lastno vajo
                </button>
              </div>
            </div>
          </fieldset>
          <fieldset disabled={saving}>
            <label className="manual-note">
              Opomba treninga (neobvezno)
              <textarea
                rows={2}
                value={draft.note}
                maxLength={1000}
                onChange={(e) => edit((w) => ({ ...w, note: e.target.value }))}
              />
            </label>
          </fieldset>
          {error && (
            <p role="alert" className="manual-error">
              {error}
            </p>
          )}
          <div className="manual-footer">
            <button
              type="button"
              className="button secondary"
              onClick={close}
              disabled={saving}
            >
              Zapri in nadaljuj pozneje
            </button>
            <button
              type="submit"
              className="button"
              disabled={saving || !draft.exercises.length}
            >
              {saving ? "Shranjujem …" : "Shrani opravljeni trening"}
              <Save size={17} />
            </button>
          </div>
          <p className="manual-save-note">
            <Check size={14} />
            Shranjene serije bodo označene kot opravljene na izbrani datum.
          </p>
        </form>
      </dialog>
      {library && (
        <ExerciseLibrary
          state={state}
          trainingType={draft.trainingType}
          selectedExercises={draft.exercises}
          selectionPurpose="history"
          keepOpenOnChoose
          onChoose={(e) => add(e)}
          close={() => setLibrary(false)}
        />
      )}
    </>
  );
}
