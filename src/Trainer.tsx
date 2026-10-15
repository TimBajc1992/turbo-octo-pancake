import { BoundedNumberInput } from "./BoundedNumberInput";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  Clock,
  Dumbbell,
  Heart,
  Info,
  Plus,
  Settings,
  Shuffle,
  Watch,
  X,
  Zap,
} from "lucide-react";
import {
  dateLabel,
  emptySet,
  localDate,
  modes,
  num,
  uid,
  type State,
  type Workout,
  type Exercise,
} from "./model";
import {
  alternatives,
  allowed,
  byId,
  calibrationProposal,
  cardioDuration,
  cardioChoice,
  cardioTypes,
  catalog,
  coachWorkout,
  createProgram,
  dayCheckIn,
  defaultPreference,
  exerciseForSlot,
  getCoach,
  historicalEntries,
  historyFingerprint,
  loadProposal,
  planDay,
  preference,
  weeklyVolume,
  type CoachConfig,
  type CheckIn,
  type Group,
  type ProgramSlot,
} from "./coach";
type Update = (fn: (s: State) => State) => void;
function Dialog({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
    return () => ref.current?.close();
  }, []);
  return (
    <dialog ref={ref} aria-label={title} onCancel={close}>
      <div className="modal-head">
        <h2>{title}</h2>
        <button className="icon-button" onClick={close} aria-label="Zapri">
          <X />
        </button>
      </div>
      {children}
    </dialog>
  );
}
const groupName = (g: Group) =>
  g === "lower"
    ? "Spodnji del"
    : g === "upper"
      ? "Zgornji del"
      : "Celotno telo";
function setCoach(
  update: Update,
  fn: (c: CoachConfig, s: State) => CoachConfig,
) {
  update((s) => ({ ...s, coach: fn(structuredClone(getCoach(s)), s) }));
}
export function CoachPanel({
  state,
  update,
  start,
  editProfile,
}: {
  state: State;
  update: Update;
  start: (w: Workout) => void;
  editProfile: () => void;
}) {
  const [settings, setSettings] = useState(false),
    [checkOpen, setCheckOpen] = useState(false),
    [programOpen, setProgramOpen] = useState(false);
  const [error, setError] = useState("");
  const c = getCoach(state),
    plan = planDay(state),
    check = dayCheckIn(state);
  const volume = weeklyVolume(state);
  const changeCheck = (patch: Partial<CheckIn>) =>
    setCoach(update, (config, s) => ({
      ...config,
      checkIn: { ...dayCheckIn(s), ...patch, confirmed: false },
    }));
  const begin = () => {
    try {
      if (state.active) {
        setError(
          "Aktivni trening že poteka. Najprej ga nadaljuj ali zaključi v zavihku Trening.",
        );
        return;
      }
      const w = coachWorkout(state, plan);
      setCoach(update, (config, s) => ({
        ...config,
        programs: {
          ...config.programs,
          [plan.group]:
            config.programs[plan.group] ?? createProgram(s, plan.group),
        },
      }));
      start(w);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  };
  return (
    <section className="trainer panel" aria-label="Moj trener">
      <div className="section-title">
        <div>
          <span className="eyebrow">
            <Zap size={15} /> MOJ TRENER
          </span>
          <h2>Kaj je danes tvoj korak?</h2>
        </div>
        <button
          className="icon-button"
          aria-label="Nastavitve trenerja"
          onClick={() => setSettings(true)}
        >
          <Settings size={19} />
        </button>
      </div>
      <div className="trainer-summary">
        <div>
          <span className={`badge ${plan.mode === "draft" ? "neutral" : ""}`}>
            {plan.mode === "draft"
              ? "Premalo potrjenih podatkov"
              : plan.mode === "light"
                ? "Lažji trening"
                : plan.mode === "rest"
                  ? "Počitek / lahka aktivnost"
                  : plan.mode === "cardio"
                    ? "Samo kardio"
                    : "Običajen trening"}
          </span>
          <h3>{plan.title}</h3>
          <p>
            <Clock size={14} /> Približno {num(plan.estimatedMinutes, 0)} min ·
            danes imaš {check.minutes} min
          </p>
        </div>
        <button className="button secondary" onClick={() => setCheckOpen(true)}>
          <Heart size={16} />
          {check.confirmed ? "Popravi počutje" : "Kako si danes?"}
        </button>
      </div>
      <ul className="coach-reasons">
        {plan.reasons.map((r, i) => (
          <li key={i}>{r}</li>
        ))}
      </ul>
      {!state.profile.confirmed && (
        <button className="text-button" onClick={editProfile}>
          Najprej potrdi osebni profil <ArrowRight size={14} />
        </button>
      )}
      {!c.confirmed && (
        <div className="notice">
          <Info size={17} />
          <span>
            Označi razpoložljive naprave ter potrdi težave s koleni, hrbtom in
            rameni. Predlog je do takrat osnutek.
          </span>
          <button className="text-button" onClick={() => setSettings(true)}>
            Uredi naprave
          </button>
        </div>
      )}
      {plan.slots.map((slot) => (
        <PlanExercise
          key={slot.id}
          slot={slot}
          state={state}
          light={plan.mode === "light"}
          update={update}
        />
      ))}
      {plan.mode === "cardio" && (
        <div className="coach-cardio">
          <h3>
            {cardioTypes.find((t) => t.id === cardioChoice(state, check))
              ?.name ?? "Izberi udobno kardio aktivnost"}
          </h3>
          <p>
            {cardioDuration(state)} min skupaj, vključno z ogrevanjem in
            umirjanjem. Pogovorni test: lahko govoriš v stavkih. Brez izračuna
            »cone za kurjenje maščob«.
          </p>
          <p>
            {!state.workouts.some((w) =>
              w.exercises.some((e) => e.cardio && e.sets.some((a) => a.done)),
            )
              ? "Kardio zgodovine še ni; daljše trajanje izberi ročno."
              : "Predlog upošteva doslej opravljene kardio aktivnosti."}
          </p>
        </div>
      )}
      {plan.warnings.map((w, i) => (
        <div className="coach-warning" key={i}>
          <Info size={15} />
          {w}
        </div>
      ))}
      {error && (
        <p className="notice danger" role="alert">
          {error}
        </p>
      )}
      <div className="actions">
        <button
          className="button"
          disabled={
            plan.mode === "draft" || plan.mode === "rest" || !!state.active
          }
          onClick={begin}
        >
          Potrdi in začni <ArrowRight size={17} />
        </button>
        <button
          className="button secondary"
          onClick={() => setProgramOpen(true)}
        >
          <Shuffle size={16} /> Spremeni
        </button>
        <button
          className="text-button"
          onClick={() => {
            changeCheck({ choice: "cardio" });
            setCheckOpen(true);
          }}
        >
          Samo kardio
        </button>
        <button className="text-button" onClick={() => setCheckOpen(true)}>
          Imam več/manj časa
        </button>
      </div>
      <div className="coach-foot">
        <span>
          <Watch size={14} /> Apple Health:{" "}
          {state.healthBridge?.lastImportAt
            ? "podatki prek Bližnjic"
            : "Ni povezano"}{" "}
          · počutje{" "}
          {c.checkIn?.date === localDate() && c.checkIn.confirmed
            ? "potrjeno danes"
            : "še ni potrjeno danes"}
        </span>
        <button
          className="text-button"
          onClick={() => {
            const reason = prompt(
              "Zakaj želiš zavrniti predlog?",
              "Danes bom trening sestavil ročno.",
            );
            if (reason !== null)
              setCoach(update, (config) => ({
                ...config,
                rejected: { date: localDate(), reason },
              }));
          }}
        >
          Zavrni predlog
        </button>
      </div>
      {c.rejected?.date === localDate() && (
        <button
          className="text-button"
          onClick={() =>
            setCoach(update, (config) => ({ ...config, rejected: undefined }))
          }
        >
          Ponovno izračunaj po moji izbiri
        </button>
      )}
      <details className="coach-method">
        <summary>Podatki, negotovost in pravila</summary>
        <p>
          Predlog je razložljivo lokalno pravilo, ne medicinska ocena. Podatki
          ure niso povezani; HRV ne vpliva na težo ali dovoljenje za težji
          trening. Manjkajočih meritev ne nadomeščamo. Starost izhodiščnega
          treninga je vidna pri vsaki vaji.
        </p>
        <p>
          Praktične nastavitve: do {c.weeklySets} serij na ciljno mišico v
          zadnjih 7 dneh; tudi serije neznane vrste previdno omejijo dodatni
          obseg. Ogrevanje je izključeno. Približno 48 ur odmika je previdna
          usmeritev aplikacije, ne univerzalen prag. Prednost ima tvoje počutje.
        </p>
        {Object.entries(volume).map(([m, v]) => (
          <div className="data-row" key={m}>
            <span>{m}</span>
            <span>
              {v.known} potrjenih delovnih · {v.unknown} neznane vrste
            </span>
          </div>
        ))}
        <p>
          21–28 dni kakovostnih osebnih meritev bi bilo začetno produktno okno
          za prihodnje izhodišče HRV SDNN. SDNN ni RMSSD; brez native
          integracije ocene iz ure ne računamo.
        </p>
        <details>
          <summary>
            Zgodovinska izhodišča · brez pretvarjanja med napravami
          </summary>
          {[
            ...new Map(
              state.workouts.flatMap((w) =>
                w.exercises.map((e) => [e.id, e.name] as const),
              ),
            ).entries(),
          ].map(([id, name]) => {
            const last = historicalEntries(state, id)[0];
            return last ? (
              <div key={id} className="coach-history-line">
                <strong>{name}</strong>
                <span>
                  {dateLabel(last.w.date, true)} ·{" "}
                  {last.e.sets
                    .filter((a) => a.done)
                    .map((a) => `${num(a.weight)} kg × ${a.reps}`)
                    .join(" / ")}
                </span>
                <small>
                  To je shranjeno izhodišče, ne današnji predlog za drugo
                  napravo.
                </small>
              </div>
            ) : null;
          })}
        </details>
        <Evidence />
      </details>
      {settings && (
        <Dialog title="Naprave in moj program" close={() => setSettings(false)}>
          <CoachSettings
            state={state}
            update={update}
            done={() => setSettings(false)}
          />
        </Dialog>
      )}
      {checkOpen && (
        <Dialog
          title="Današnje počutje in čas"
          close={() => setCheckOpen(false)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setCoach(update, (config, s) => ({
                ...config,
                checkIn: {
                  ...dayCheckIn(s),
                  stress: dayCheckIn(s).stress ?? 3,
                  muscleSoreness: {
                    lower: "low",
                    upper: "low",
                    full: "low",
                    ...dayCheckIn(s).muscleSoreness,
                  },
                  confirmed: true,
                },
                rejected: undefined,
              }));
              setCheckOpen(false);
            }}
          >
            <label>
              Danes želim
              <select
                value={check.choice}
                onChange={(e) =>
                  changeCheck({ choice: e.target.value as CheckIn["choice"] })
                }
              >
                <option value="auto">Predlog trenerja</option>
                <option value="strength">Moč</option>
                <option value="mixed">Moč + kardio</option>
                <option value="cardio">Samo kardio</option>
                <option value="light">Lažja moč</option>
                <option value="rest">Lahka aktivnost / počitek</option>
              </select>
            </label>
            <div className="field-grid">
              <label>
                Čas danes (min)
                <BoundedNumberInput
                  min={10}
                  max={180}
                  value={check.minutes}
                  onChange={(value) => changeCheck({ minutes: value })}
                />
              </label>
              <label>
                Spanje (ure, neobvezno)
                <input
                  type="number"
                  min="0"
                  max="24"
                  step="0.5"
                  value={check.sleepHours ?? ""}
                  onChange={(e) =>
                    changeCheck({
                      sleepHours:
                        e.target.value === "" ? undefined : +e.target.value,
                    })
                  }
                />
              </label>
              <label>
                Kakovost spanja
                <select
                  required
                  value={check.sleep}
                  onChange={(e) =>
                    changeCheck({ sleep: e.target.value as CheckIn["sleep"] })
                  }
                >
                  <option value="unknown">Nimam podatka</option>
                  <option value="good">Dobro / obvladljivo</option>
                  <option value="poor">Slabo</option>
                </select>
              </label>
              <label>
                Energija · 1 zelo utrujen, 5 svež
                <select
                  value={check.energy}
                  onChange={(e) => changeCheck({ energy: +e.target.value })}
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </label>
              <label>
                Stres · 1 nizek, 5 visok
                <select
                  value={check.stress ?? 3}
                  onChange={(e) => changeCheck({ stress: +e.target.value })}
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </label>
              <label>
                Splošna mišična bolečina
                <select
                  value={check.soreness}
                  onChange={(e) =>
                    changeCheck({
                      soreness: e.target.value as CheckIn["soreness"],
                    })
                  }
                >
                  <option value="unknown">Ni podatka</option>
                  <option value="low">Majhna / brez</option>
                  <option value="moderate">Zmerna</option>
                  <option value="high">Velika</option>
                </select>
              </label>
            </div>
            <div className="field-grid">
              {(["lower", "upper", "full"] as Group[]).map((g) => (
                <label key={g}>
                  Mišice · {g === "full" ? "trup" : groupName(g)}
                  <select
                    value={check.muscleSoreness?.[g] ?? "low"}
                    onChange={(e) =>
                      changeCheck({
                        muscleSoreness: {
                          ...check.muscleSoreness,
                          [g]: e.target.value,
                        },
                      })
                    }
                  >
                    <option value="low">Brez / majhna utrujenost</option>
                    <option value="moderate">Zmerna</option>
                    <option value="high">Velika</option>
                  </select>
                </label>
              ))}
            </div>
            <label className="check-label">
              <input
                type="checkbox"
                checked={check.pain}
                onChange={(e) => changeCheck({ pain: e.target.checked })}
              />
              Bolečina, ki ni običajna mišična utrujenost
            </label>
            <label className="check-label">
              <input
                type="checkbox"
                checked={check.ill}
                onChange={(e) => changeCheck({ ill: e.target.checked })}
              />
              Znaki bolezni / bolezensko počutje
            </label>
            <label>
              Skupina treninga
              <select
                value={check.group ?? "auto"}
                onChange={(e) =>
                  changeCheck({ group: e.target.value as CheckIn["group"] })
                }
              >
                <option value="auto">Izbere trener</option>
                <option value="lower">Spodnji del</option>
                <option value="upper">Zgornji del</option>
                <option value="full">Celotno telo</option>
              </select>
            </label>
            <label className="check-label">
              <input
                type="checkbox"
                checked={!!check.extended}
                onChange={(e) => changeCheck({ extended: e.target.checked })}
              />
              Daljša različica, če počutje in obseg to dopuščata
            </label>
            <p>
              Več časa pomeni temeljitejše ogrevanje in počitke. Ne zvišamo
              hkrati teže, serij in intenzivnosti kardia.
            </p>
            <fieldset className="coach-fieldset">
              <legend>Kardio po izbiri</legend>
              <label>
                Naprava
                <select
                  value={cardioChoice(state, check) ?? ""}
                  onChange={(e) => changeCheck({ cardioType: e.target.value })}
                >
                  <option value="">Izberi v nastavitvah trenerja</option>
                  {cardioTypes
                    .filter((t) => c.cardioEquipment?.includes(t.id))
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Trajanje skupaj z ogrevanjem in umirjanjem
                <select
                  value={check.cardioMinutes ?? ""}
                  onChange={(e) =>
                    changeCheck({
                      cardioMinutes: e.target.value
                        ? +e.target.value
                        : undefined,
                    })
                  }
                >
                  <option value="">Predlog iz časa in zgodovine</option>
                  {[20, 30, 45, 60].map((n) => (
                    <option key={n} value={n}>
                      {n} minut
                    </option>
                  ))}
                </select>
              </label>
              {cardioChoice(state, check) === "treadmill" && (
                <label>
                  Naklon steze (%)
                  <input
                    type="number"
                    min="0"
                    max="15"
                    step="0.5"
                    value={check.incline ?? 0}
                    onChange={(e) =>
                      changeCheck({
                        incline: Math.max(0, Math.min(15, +e.target.value)),
                      })
                    }
                  />
                </label>
              )}
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={!!check.intervals}
                  onChange={(e) => changeCheck({ intervals: e.target.checked })}
                />
                Izbirni zmerni intervali (za izkušene in dobro počutje)
              </label>
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={!!check.cardioComfortConfirmed}
                  onChange={(e) =>
                    changeCheck({ cardioComfortConfirmed: e.target.checked })
                  }
                />
                Izbrana kardio aktivnost je udobna glede na moje omejitve.
              </label>
              <p>
                Privzeto enakomeren, obvladljiv tempo s pogovornim testom.
                Intervali niso HIIT in ob slabem počutju niso vključeni.
              </p>
            </fieldset>
            <label>
              Opomba
              <textarea
                value={check.note}
                onChange={(e) => changeCheck({ note: e.target.value })}
              />
            </label>
            <button className="button" type="submit">
              Potrdi današnje počutje <Check size={17} />
            </button>
          </form>
        </Dialog>
      )}
      {programOpen && (
        <Dialog
          title={`Uredi program · ${groupName(plan.group)}`}
          close={() => setProgramOpen(false)}
        >
          <p>
            Osnovne vaje ostanejo shranjene skozi obiske. Urejaš izhodiščni
            program; današnji čas in obseg ga lahko skrajšata.
          </p>
          <ProgramEditor state={state} group={plan.group} update={update} />
          <button className="button" onClick={() => setProgramOpen(false)}>
            Končano
          </button>
        </Dialog>
      )}
    </section>
  );
}
function CoachSettings({
  state,
  update,
  done,
}: {
  state: State;
  update: Update;
  done: () => void;
}) {
  const c = getCoach(state);
  const [error, setError] = useState("");
  const patch = (v: Partial<CoachConfig>) =>
    setCoach(update, (config) => ({ ...config, ...v, confirmed: false }));
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!c.available.length && !c.cardioEquipment?.length) {
          setError("Označi vsaj eno razpoložljivo napravo.");
          return;
        }
        if (Object.values(c.joints).some((v) => v === "unknown")) {
          setError("Potrdi stanje kolen, hrbta in ramen.");
          return;
        }
        setCoach(update, (config, s) => ({
          ...config,
          confirmed: true,
          programs: Object.fromEntries(
            (["lower", "upper", "full"] as Group[]).map((g) => [
              g,
              config.programs[g] ?? createProgram(s, g),
            ]),
          ),
        }));
        done();
      }}
    >
      <p>
        To je knjižnica kandidatov, ne seznam vaj za en trening. Za primerjavo
        kilogramov potrdi točno napravo, način zapisa in izvedbo.
      </p>
      <div className="field-grid">
        {(["knees", "back", "shoulders"] as const).map((j) => (
          <label key={j}>
            {j === "knees" ? "Kolena" : j === "back" ? "Hrbet" : "Ramena"}
            <select
              value={c.joints[j]}
              onChange={(e) =>
                patch({
                  joints: {
                    ...c.joints,
                    [j]: e.target.value as CoachConfig["joints"][typeof j],
                  },
                })
              }
            >
              <option value="unknown">Še ni potrjeno</option>
              <option value="none">Brez znanih težav</option>
              <option value="issue">Imam omejitve / težave</option>
            </select>
          </label>
        ))}
      </div>
      <p>
        Ob težavah vajo vključimo šele, ko za to napravo potrdiš udobje in
        obseg. Tvoje omejitve v profilu:{" "}
        {state.profile.limitations || "še niso opisane"}.
      </p>
      <div className="field-grid">
        <label>
          Delovnik (min)
          <BoundedNumberInput
            min={15}
            max={180}
            value={c.weekdayMinutes}
            onChange={(value) => patch({ weekdayMinutes: value })}
          />
        </label>
        <label>
          Sobota (min)
          <BoundedNumberInput
            min={15}
            max={180}
            value={c.saturdayMinutes ?? c.weekendMinutes}
            onChange={(value) => patch({ saturdayMinutes: value })}
          />
        </label>
        <label>
          Nedelja (min)
          <BoundedNumberInput
            min={15}
            max={180}
            value={c.sundayMinutes ?? c.weekendMinutes}
            onChange={(value) => patch({ sundayMinutes: value })}
          />
        </label>
        <label>
          Praktična meja serij / mišico v 7 dneh
          <input
            type="number"
            min="4"
            max="20"
            value={c.weeklySets}
            onChange={(e) =>
              patch({
                weeklySets: Math.max(
                  4,
                  Math.min(20, Math.floor(+e.target.value)),
                ),
              })
            }
          />
        </label>
      </div>
      <h3>Razpoložljive naprave za moč</h3>
      <div className="device-list">
        {catalog.map((e) => {
          const p = preference(c, e.id);
          const change = (v: Partial<typeof p>) =>
            patch({
              preferences: { ...c.preferences, [e.id]: { ...p, ...v } },
            });
          return (
            <div className="device-row" key={e.id}>
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={c.available.includes(e.id)}
                  onChange={(v) =>
                    patch({
                      available: v.target.checked
                        ? [...c.available, e.id]
                        : c.available.filter((id) => id !== e.id),
                    })
                  }
                />
                <strong>{e.name}</strong>
                <span className="subtle">{e.muscles.join(", ")}</span>
              </label>
              {c.available.includes(e.id) && (
                <details>
                  <summary>Oprema, udobje in nastavitve</summary>
                  <p>{e.instructions}</p>
                  <div className="field-grid">
                    <label>
                      Identiteta točne naprave
                      <input
                        value={p.identity}
                        placeholder="Npr. znamka in številka naprave"
                        onChange={(v) => change({ identity: v.target.value })}
                      />
                    </label>
                    <label>
                      Način beleženja kg
                      <select
                        value={p.convention ?? ""}
                        onChange={(v) => change({ convention: v.target.value })}
                      >
                        <option value="">Še ni potrjen</option>
                        <option value="stack">
                          Oznaka v kg na skladu / zaslonu
                        </option>
                        <option value="added-total">
                          Skupna dodana teža plošč
                        </option>
                        <option value="one-side">Teža ene strani / roke</option>
                      </select>
                    </label>
                    <label>
                      Obseg gibanja in izvedba
                      <input
                        value={p.rom}
                        placeholder="Npr. udoben obseg, isti ročaj"
                        onChange={(v) => change({ rom: v.target.value })}
                      />
                    </label>
                    <label>
                      Sedež / opore (neobvezno)
                      <input
                        value={p.seat}
                        onChange={(v) => change({ seat: v.target.value })}
                      />
                    </label>
                    <label>
                      Najmanjši razpoložljivi korak (kg)
                      <input
                        type="number"
                        min="0.1"
                        step="0.1"
                        value={p.increment}
                        onChange={(v) =>
                          change({ increment: Math.max(0.1, +v.target.value) })
                        }
                      />
                    </label>
                    <label>
                      Udobje
                      <select
                        value={p.comfort}
                        onChange={(v) =>
                          change({
                            comfort: v.target.value as typeof p.comfort,
                          })
                        }
                      >
                        <option value="unknown">Še ni preverjeno</option>
                        <option value="yes">Udobna izvedba</option>
                        <option value="no">Ni udobna / izpusti</option>
                      </select>
                    </label>
                  </div>
                  <label className="check-label">
                    <input
                      type="checkbox"
                      checked={p.favorite}
                      onChange={(v) => change({ favorite: v.target.checked })}
                    />
                    Priljubljena vaja
                  </label>
                  <label className="check-label">
                    <input
                      type="checkbox"
                      checked={p.excluded}
                      onChange={(v) => change({ excluded: v.target.checked })}
                    />
                    Izključi iz predlogov
                  </label>
                </details>
              )}
            </div>
          );
        })}
      </div>
      <h3>Kardio naprave</h3>
      {cardioTypes.map((t) => (
        <label className="check-label" key={t.id}>
          <input
            type="checkbox"
            checked={c.cardioEquipment?.includes(t.id) ?? false}
            onChange={(e) =>
              patch({
                cardioEquipment: e.target.checked
                  ? [...(c.cardioEquipment ?? []), t.id]
                  : (c.cardioEquipment ?? []).filter((id) => id !== t.id),
              })
            }
          />
          {t.name}
        </label>
      ))}
      <label>
        Izkušnje s kardiom
        <select
          value={c.cardioExperience ?? "new"}
          onChange={(e) =>
            patch({
              cardioExperience: e.target
                .value as CoachConfig["cardioExperience"],
            })
          }
        >
          <option value="new">Začenjam / občasno</option>
          <option value="regular">Redna kardio vadba</option>
        </select>
      </label>
      {error && (
        <p role="alert" className="notice danger">
          {error}
        </p>
      )}
      <button className="button" type="submit">
        Potrdi naprave in omejitve <Check size={17} />
      </button>
    </form>
  );
}
function ProgramEditor({
  state,
  group,
  update,
}: {
  state: State;
  group: Group;
  update: Update;
}) {
  const c = getCoach(state),
    slots = c.programs[group] ?? createProgram(state, group);
  const save = (rows: ProgramSlot[]) =>
    setCoach(update, (config) => ({
      ...config,
      programs: { ...config.programs, [group]: rows },
    }));
  return (
    <>
      {slots.map((slot, i) => (
        <div className="template-exercise" key={slot.id}>
          <label>
            Vaja {i + 1}
            <select
              value={slot.catalogId}
              onChange={(e) =>
                save(
                  slots.map((a, j) =>
                    j === i ? { ...a, catalogId: e.target.value } : a,
                  ),
                )
              }
            >
              {catalog
                .filter(
                  (x) => c.available.includes(x.id) || x.id === slot.catalogId,
                )
                .map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
            </select>
          </label>
          <div className="field-grid">
            <label>
              Delovne serije
              <input
                type="number"
                min="1"
                max="6"
                value={slot.sets}
                onChange={(e) =>
                  save(
                    slots.map((a, j) =>
                      j === i
                        ? {
                            ...a,
                            sets: Math.max(
                              1,
                              Math.min(6, Math.floor(+e.target.value)),
                            ),
                          }
                        : a,
                    ),
                  )
                }
              />
            </label>
            <label>
              Spodnja meja ponovitev
              <input
                type="number"
                min="1"
                max={slot.maxReps}
                value={slot.minReps}
                onChange={(e) =>
                  save(
                    slots.map((a, j) =>
                      j === i
                        ? {
                            ...a,
                            minReps: Math.max(
                              1,
                              Math.min(a.maxReps, Math.floor(+e.target.value)),
                            ),
                          }
                        : a,
                    ),
                  )
                }
              />
            </label>
            <label>
              Zgornja meja ponovitev
              <input
                type="number"
                min={slot.minReps}
                max="40"
                value={slot.maxReps}
                onChange={(e) =>
                  save(
                    slots.map((a, j) =>
                      j === i
                        ? {
                            ...a,
                            maxReps: Math.max(
                              a.minReps,
                              Math.min(40, Math.floor(+e.target.value)),
                            ),
                          }
                        : a,
                    ),
                  )
                }
              />
            </label>
          </div>
          <button
            className="text-button"
            onClick={() => save(slots.filter((_, j) => j !== i))}
          >
            Odstrani vajo iz programa
          </button>
        </div>
      ))}
      <div className="actions">
        <button
          className="button secondary"
          onClick={() => {
            const id = c.available.find((id) => allowed(c, id));
            if (id)
              save([
                ...slots,
                { id: uid(), catalogId: id, sets: 2, minReps: 10, maxReps: 15 },
              ]);
          }}
        >
          <Plus size={16} /> Dodaj vajo
        </button>
        <button
          className="text-button"
          onClick={() => {
            if (
              confirm("Ponovno sestavi osnovni izbor iz razpoložljivih naprav?")
            )
              save(createProgram(state, group));
          }}
        >
          Obnovi osnovni izbor
        </button>
      </div>
    </>
  );
}
function PlanExercise({
  slot,
  state,
  light,
  update,
}: {
  slot: ProgramSlot;
  state: State;
  light: boolean;
  update: Update;
}) {
  const cat = byId(slot.catalogId)!;
  const p = preference(getCoach(state), cat.id),
    proposal = loadProposal(state, slot, light);
  return (
    <article className="coach-plan-exercise">
      <div className="section-title">
        <h3>{cat.name}</h3>
        <span>
          {slot.sets} × {slot.minReps}–{slot.maxReps}
        </span>
      </div>
      <p className="coach-load">
        Današnji predlog:{" "}
        <strong>
          {proposal.weights
            ? proposal.weights
                .map((w, i) => `${num(w)} kg × ${proposal.reps[i]}`)
                .join(" / ")
            : "Obremenitev določi na napravi"}
        </strong>
      </p>
      <p>{proposal.reason}</p>
      <small>Zgodovinsko izhodišče: {proposal.basis}</small>
      <details>
        <summary>Zakaj ta vaja, navodila in zgodovina</summary>
        <p>
          {cat.reason} Ciljne mišice: {cat.muscles.join(", ")}. Vzorec:{" "}
          {cat.pattern}.
        </p>
        <p>
          {cat.instructions} {p.seat && `Sedež / opore: ${p.seat}.`}
        </p>
        <p>{cat.difference}</p>
        <HistoryReview state={state} id={cat.id} update={update} />
      </details>
      {proposal.status === "review" && (
        <button
          className="button secondary"
          onClick={() =>
            setCoach(update, (c) => ({
              ...c,
              reviewedChanges: {
                ...c.reviewedChanges,
                [proposal.key!]: proposal.fingerprint!,
              },
            }))
          }
        >
          Potrjujem, da sem preveril spremembo naprave, izvedbe in počutja
        </button>
      )}
    </article>
  );
}
function HistoryReview({
  state,
  id,
  update,
}: {
  state: State;
  id: string;
  update: Update;
}) {
  const [ack, setAck] = useState<string[]>([]);
  const c = getCoach(state),
    p = preference(c, id);
  const rows = historicalEntries(state, id);
  return (
    <>
      {!rows.length ? (
        <p>Ni zgodovine te vaje. Za novo napravo uporabi poskusno serijo.</p>
      ) : (
        rows.slice(0, 8).map(({ w, e, key }) => {
          const linked =
            c.historyLinks[key]?.fingerprint === historyFingerprint(w, e) &&
            c.historyLinks[key]?.device === p.identity &&
            c.historyLinks[key]?.rom === p.rom &&
            c.historyLinks[key]?.convention === p.convention;
          return (
            <div key={key} className="coach-history-line">
              <strong>
                {dateLabel(w.date, true)} · {e.name}
              </strong>
              <span>
                {e.sets
                  .filter((a) => a.done)
                  .map((a) => `${num(a.weight)} kg × ${a.reps}`)
                  .join(" / ")}
              </span>
              <small>
                {e.equipment || "Točna naprava ni zapisana"} · zgodovinski
                način: {modes[e.mode]} · izvor se ohrani.
              </small>
              {linked ? (
                <span className="badge">Primerljivost potrjena</span>
              ) : (
                <>
                  <label className="check-label">
                    <input
                      type="checkbox"
                      checked={ack.includes(key)}
                      onChange={(v) =>
                        setAck(
                          v.target.checked
                            ? [...ack, key]
                            : ack.filter((a) => a !== key),
                        )
                      }
                    />
                    Potrjujem isto točno napravo, način zapisa, izvedbo in da so
                    opravljene neogrevalne serije delovne.
                  </label>
                  <button
                    className="button secondary"
                    disabled={
                      !ack.includes(key) ||
                      !p.identity.trim() ||
                      !p.rom.trim() ||
                      !p.convention
                    }
                    onClick={() =>
                      setCoach(update, (config) => ({
                        ...config,
                        historyLinks: {
                          ...config.historyLinks,
                          [key]: {
                            catalogId: id,
                            device: p.identity,
                            rom: p.rom,
                            convention: p.convention,
                            fingerprint: historyFingerprint(w, e),
                            workingSetsConfirmed: true,
                          },
                        },
                      }))
                    }
                  >
                    Potrdi primerljivost zapisa
                  </button>
                  <p>
                    Najprej v nastavitvah trenerja vnesi identiteto naprave,
                    način zapisa in izvedbo. Izvornih podatkov ne spreminjamo.
                  </p>
                </>
              )}
            </div>
          );
        })
      )}
    </>
  );
}
export function BusyDevice({
  state,
  index,
  move,
  replace,
}: {
  state: State;
  index: number;
  move: () => void;
  replace: (id: string, permanent: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const e = state.active?.exercises[index];
  if (!e || e.cardio) return null;
  const options = alternatives(state, e.coach?.catalogId ?? e.id);
  const pending = e.sets.some((a) => !a.done && a.kind !== "warmup");
  return (
    <div className="busy-device">
      <button
        className="text-button"
        disabled={!!e.coach?.retired}
        onClick={() => setOpen(!open)}
      >
        <Shuffle size={14} /> Naprava je zasedena
      </button>
      {open && (
        <div className="busy-options">
          <button
            className="button secondary"
            onClick={() => {
              move();
              setOpen(false);
            }}
          >
            Prestavi vajo na konec
          </button>
          <p>
            Opravljene serije ostanejo pri prvotni vaji. Zamenja se samo
            preostali načrt. Teža se pridobi iz zgodovine alternative ali jo
            določiš z uvodno serijo.
          </p>
          {!pending ? (
            <p>Vse delovne serije so že opravljene.</p>
          ) : options.length ? (
            options.map((a) => (
              <div key={a.id} className="coach-alternative">
                <h3>{a.name}</h3>
                <p>{a.difference}</p>
                <span className="subtle">
                  {historicalEntries(state, a.id).length
                    ? "Obstaja zgodovina; primerljivost naprave je treba preveriti."
                    : "Brez zgodovine · uvodno določanje obremenitve."}
                </span>
                <div className="actions">
                  <button
                    className="button secondary"
                    onClick={() => {
                      replace(a.id, false);
                      setOpen(false);
                    }}
                  >
                    Zamenjaj samo danes
                  </button>
                  <button
                    className="text-button"
                    onClick={() => {
                      replace(a.id, true);
                      setOpen(false);
                    }}
                  >
                    Trajno spremeni program
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p>
              Ni potrjene razpoložljive alternative istega gibalnega vzorca.
              Nastavi naprave v Moj trener ali uporabi ročno zamenjavo. Leg
              Extension ni celotna zamenjava za Leg Press.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
export function CoachExerciseInfo({
  e,
  state,
  change,
}: {
  e: Exercise;
  state: State;
  change: (e: Exercise) => void;
}) {
  const cat = byId(e.coach?.catalogId ?? "");
  if (!e.coach || !cat) return null;
  const draft = e.coach.trialDraft ?? {};
  const patch = (v: Partial<typeof draft>) =>
    change({
      ...e,
      coach: {
        ...e.coach!,
        trialDraft: { ...draft, ...v },
        trialLogged: false,
      },
    });
  const result =
    draft.weight !== undefined &&
    draft.reps !== undefined &&
    draft.rir !== undefined
      ? calibrationProposal(
          e,
          draft.weight,
          draft.reps,
          draft.rir,
          !!draft.formGood,
          !!draft.pain,
        )
      : undefined;
  return (
    <div className="coach-exercise-info">
      <details>
        <summary>Navodila, sedež in razlog izbire</summary>
        <p>{cat.instructions}</p>
        <p>
          {e.coach.reason} {e.coach.seat && `Sedež / opore: ${e.coach.seat}.`}{" "}
          Izvedba: {e.coach.rom || "še ni potrjena"}.
        </p>
      </details>
      {!e.coach.retired && (
        <>
          <label className="check-label">
            <input
              type="checkbox"
              checked={!!e.coach.formGood}
              onChange={(v) =>
                change({
                  ...e,
                  coach: { ...e.coach!, formGood: v.target.checked },
                })
              }
            />
            Potrjujem dobro, nadzorovano izvedbo opravljenih delovnih serij.
          </label>
          {e.coach.calibration ? (
            <div className="calibration">
              <h3>Uvodno določanje obremenitve</h3>
              <label>
                Najmanjši razpoložljivi korak te naprave (kg)
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={e.increment}
                  onChange={(v) =>
                    change({
                      ...e,
                      increment: Math.max(0.1, +v.target.value),
                      coach: { ...e.coach!, stepConfirmed: false },
                    })
                  }
                />
              </label>
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={!!e.coach.stepConfirmed}
                  onChange={(v) =>
                    change({
                      ...e,
                      coach: { ...e.coach!, stepConfirmed: v.target.checked },
                    })
                  }
                />
                Potrjujem korak obremenitve na tej napravi.
              </label>
              <p>
                Izberi lahko, udobno poskusno serijo. Ne testiraj maksimalnega
                dviga. Vnesi dejanski rezultat in rezervo.
              </p>
              <div className="field-grid">
                <label>
                  Dejanska poskusna teža (kg)
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={draft.weight ?? ""}
                    onChange={(v) =>
                      patch({
                        weight:
                          v.target.value === ""
                            ? undefined
                            : Math.max(0, +v.target.value),
                      })
                    }
                  />
                </label>
                <label>
                  Dejanske ponovitve
                  <input
                    type="number"
                    min="1"
                    max="40"
                    value={draft.reps ?? ""}
                    onChange={(v) =>
                      patch({
                        reps:
                          v.target.value === ""
                            ? undefined
                            : Math.max(
                                1,
                                Math.min(40, Math.floor(+v.target.value)),
                              ),
                      })
                    }
                  />
                </label>
                <label>
                  RIR poskusne serije
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={draft.rir ?? ""}
                    onChange={(v) =>
                      patch({
                        rir:
                          v.target.value === ""
                            ? undefined
                            : Math.max(0, Math.min(10, +v.target.value)),
                      })
                    }
                  />
                </label>
              </div>
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={!!draft.formGood}
                  onChange={(v) => patch({ formGood: v.target.checked })}
                />
                Poskusna izvedba je bila nadzorovana in udobna.
              </label>
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={!!draft.pain}
                  onChange={(v) => patch({ pain: v.target.checked })}
                />
                Poskusna serija je povzročila bolečino.
              </label>
              <button
                className="button secondary"
                disabled={!result || !!e.coach.trialLogged}
                onClick={() =>
                  change({
                    ...e,
                    pain: e.pain || !!draft.pain,
                    coach: { ...e.coach!, trialLogged: true },
                    sets: [
                      {
                        ...emptySet(),
                        weight: draft.weight!,
                        reps: draft.reps!,
                        rir: draft.rir,
                        kind: "warmup",
                        done: true,
                      },
                      ...e.sets,
                    ],
                  })
                }
              >
                Shrani opravljeno poskusno serijo
              </button>
              {result && e.coach.trialLogged && (
                <div className="notice">
                  <span>
                    {result.reason}
                    {result.weight !== undefined
                      ? ` Naslednji poskus / načrt: ${num(result.weight)} kg.`
                      : ""}
                  </span>
                  {result.weight !== undefined && (
                    <button
                      className="text-button"
                      onClick={() =>
                        change({
                          ...e,
                          coach: { ...e.coach!, calibration: false },
                          sets: e.sets.map((a) =>
                            a.done
                              ? a
                              : {
                                  ...a,
                                  weight: result.weight!,
                                  loadPending: false,
                                },
                          ),
                        })
                      }
                    >
                      Potrdi predlagano obremenitev
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <button
              className="text-button"
              onClick={() =>
                change({
                  ...e,
                  coach: { ...e.coach!, calibration: true, trialLogged: false },
                })
              }
            >
              Ponovno določi obremenitev
            </button>
          )}
        </>
      )}
    </div>
  );
}
function Evidence() {
  return (
    <details>
      <summary>Raziskovalni viri in praktična pravila</summary>
      <p>
        Izbor vaj je knjižnica možnosti. Raziskave ne določajo najboljše vaje
        zate osebno; merila aplikacije niso razvrstitev po EMG ali kalorijah.
      </p>
      <p>
        Viri pregledani 15. 10. 2026. Pragovi za RIR, premor, spremembo teže,
        tedenski obseg in osebno izhodišče HRV ostajajo praktična pravila
        aplikacije; ti viri jih ne potrjujejo kot osebne ali klinične meje.
      </p>
      <ul>
        <li>
          <a
            href="https://acsm.org/resistance-training-guidelines-update-2026/"
            target="_blank"
            rel="noreferrer"
          >
            ACSM · smernice 2026 ↗
          </a>
          <p>
            Rednost in individualna prilagoditev sta pomembni. Za hipertrofijo
            omenjajo približno 10 serij na mišično skupino tedensko; začetnih 8
            v aplikaciji je uredljiva produktna nastavitev.
          </p>
        </li>
        <li>
          <a
            href="https://pubmed.ncbi.nlm.nih.gov/37582807/"
            target="_blank"
            rel="noreferrer"
          >
            Haugen in sod. · naprave in proste uteži ↗
          </a>
          <p>
            Metaanaliza ni zaznala razlike v hipertrofiji; prirast moči je
            specifičen načinu vadbe. Kilogramov med napravami ne pretvarjamo.
          </p>
        </li>
        <li>
          <a
            href="https://pubmed.ncbi.nlm.nih.gov/37414459/"
            target="_blank"
            rel="noreferrer"
          >
            Currier in sod. · obremenitve, serije in frekvenca ↗
          </a>
          <p>
            Različni programi izboljšajo moč in mišično maso glede na nevadbo;
            višje obremenitve izstopajo pri moči, več serij pri hipertrofiji. To
            ni en optimalen osebni program.
          </p>
        </li>
        <li>
          <a
            href="https://pubmed.ncbi.nlm.nih.gov/33009197/"
            target="_blank"
            rel="noreferrer"
          >
            Maeo in sod. · upogib kolen ↗
          </a>
          <p>
            V 12-tedenski raziskavi pri 20 zdravih odraslih je sedeči upogib
            bolj povečal volumen zadnjih stegenskih mišic kot ležeči. To ne
            dokazuje najboljše ali najvarnejše vaje za posameznika.
          </p>
        </li>
        <li>
          <a
            href="https://developer.apple.com/documentation/healthkit/hkquantitytypeidentifier/heartratevariabilitysdnn"
            target="_blank"
            rel="noreferrer"
          >
            Apple HealthKit · HRV SDNN ↗
          </a>
          <p>
            HealthKit beleži SDNN iz intervalov med normalnimi utripi, običajno
            v milisekundah. PWA nima neposredne povezave HealthKit; sprejema
            lahko izbrane podatke prek Bližnjic in ne izračunava regeneracije.
          </p>
        </li>
      </ul>
    </details>
  );
}

const patternLabels: Record<string, string> = {
  "leg-push": "potisk z nogami",
  "knee-flexion": "upogib kolena",
  "knee-extension": "izteg kolena",
  "hip-extension": "izteg kolka",
  calf: "dvig na prste",
  "horizontal-push": "horizontalni potisk",
  "horizontal-pull": "horizontalni vlek",
  "vertical-push": "potisk nad glavo",
  "vertical-pull": "vertikalni vlek",
  "rear-delt": "zadnji del ramen",
  "lateral-raise": "stranski dvig",
  "chest-fly": "razmik za prsi",
  "elbow-extension": "izteg komolca",
  "elbow-flexion": "upogib komolca",
  trunk: "stabilizacija trupa",
  "trunk-machine": "trup na napravi",
};
