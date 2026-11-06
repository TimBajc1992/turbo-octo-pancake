import { CloudSyncPanel } from "./CloudSyncPanel";
import { useCloudSync } from "./useCloudSync";
import { HealthShortcutsPanel } from "./HealthShortcutsPanel";
import { applyHealthTransfer, takeHealthFragment } from "./healthShortcuts";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Activity,
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Dumbbell,
  Flame,
  Heart,
  History,
  House,
  Info,
  MoreHorizontal,
  Pause,
  Plus,
  RotateCcw,
  Settings,
  ShieldCheck,
  Target,
  Trash2,
  Upload,
  Watch,
  X,
  Zap,
} from "lucide-react";
import { backup, loadState, restoreBackup, saveState } from "./db";
import { applyPulse, previewPulse, undoImport, type Preview } from "./importer";
import {
  completeSets,
  dateLabel,
  emptySet,
  exerciseComparisonKey,
  initialState,
  lastExercise,
  localDate,
  modes,
  newExercise,
  nextSessionDate,
  num,
  plannedExercise,
  records,
  rolling,
  streak,
  suggestion,
  uid,
  weekStart,
  weeklyAverages,
  type Exercise,
  type Measurement,
  type Profile,
  type State,
  type Template,
  type Workout,
} from "./model";
import { PwaUpdate } from "./PwaUpdate";
import { CoachPanel, BusyDevice, CoachExerciseInfo } from "./Trainer";
import { FocusWorkout } from "./FocusWorkout";
import { ExerciseLibraryButton } from "./ExerciseLibrary";
import { prepareWorkoutLoads } from "./loadAdvice";
import {
  getCoach,
  replaceDevice,
  replacementWorkout,
  reconcileExercise,
} from "./coach";
type Tab = "today" | "training" | "progress" | "history";
const tabs = [
  { id: "today" as Tab, label: "Danes", icon: House },
  { id: "training" as Tab, label: "Trening", icon: Dumbbell },
  { id: "progress" as Tab, label: "Napredek", icon: BarChart3 },
  { id: "history" as Tab, label: "Zgodovina", icon: History },
];
function Button({
  children,
  onClick,
  secondary = false,
  disabled = false,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  secondary?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`${secondary ? "button secondary" : "button"} ${className}`}
    >
      {children}
    </button>
  );
}
function Modal({
  title,
  children,
  close,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
}) {
  const el = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = el.current;
    d?.showModal();
    return () => d?.close();
  }, []);
  return (
    <dialog
      ref={el}
      aria-label={title}
      onCancel={close}
      onClick={(e) => {
        if (e.target === el.current) close();
      }}
    >
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
function Empty({
  title,
  detail,
  action,
}: {
  title: string;
  detail: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <Activity size={28} />
      <h3>{title}</h3>
      <p>{detail}</p>
      {action}
    </div>
  );
}
function Chart({
  rows,
  unit,
  compact = false,
}: {
  rows: { date: string; value: number }[];
  unit: string;
  compact?: boolean;
}) {
  if (!rows.length)
    return (
      <div className={`chart-empty ${compact ? "compact" : ""}`}>
        <div className="empty-grid" />
        <span>Prva meritev je začetek tvoje zgodbe.</span>
      </div>
    );
  const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date));
  const W = 680,
    H = compact ? 120 : 210;
  const top = 20,
    bottom = H - 30;
  let min = Math.min(...sorted.map((r) => r.value)),
    max = Math.max(...sorted.map((r) => r.value));
  const padding = Math.max((max - min) * 0.25, 1);
  min -= padding;
  max += padding;
  const time = (s: string) => new Date(s + "T12:00:00Z").getTime();
  const start = time(sorted[0].date),
    end = time(sorted.at(-1)!.date);
  const x = (d: string) =>
    48 + ((time(d) - start) / Math.max(end - start, 1)) * (W - 70);
  const y = (v: number) => bottom - ((v - min) / (max - min)) * (bottom - top);
  const points = sorted.map((r) => `${x(r.date)},${y(r.value)}`).join(" ");
  return (
    <svg
      className={`chart ${compact ? "compact" : ""}`}
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`Graf: ${sorted.map((r) => `${dateLabel(r.date)} ${num(r.value)} ${unit}`).join("; ")}`}
    >
      <defs>
        <linearGradient
          id={compact ? "fill-c" : "fill"}
          x1="0"
          y1="0"
          x2="0"
          y2="1"
        >
          <stop offset="0%" stopColor="#c5ed88" stopOpacity=".17" />
          <stop offset="100%" stopColor="#c5ed88" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.5, 1].map((f) => (
        <g key={f}>
          <line
            x1="48"
            x2={W - 22}
            y1={top + f * (bottom - top)}
            y2={top + f * (bottom - top)}
            stroke="#343a34"
            strokeDasharray="3 6"
          />
          {!compact && (
            <text x="0" y={top + f * (bottom - top) + 4}>
              {num(max - f * (max - min))}
            </text>
          )}
        </g>
      ))}
      {sorted.length > 1 && (
        <>
          <polygon
            points={`${x(sorted[0].date)},${bottom} ${points} ${x(sorted.at(-1)!.date)},${bottom}`}
            fill={`url(#${compact ? "fill-c" : "fill"})`}
          />
          <polyline
            points={points}
            fill="none"
            stroke="#c5ed88"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
        </>
      )}
      {sorted.map((r, i) => (
        <circle
          key={i}
          cx={x(r.date)}
          cy={y(r.value)}
          r={sorted.length > 30 ? 2 : 4}
          fill="#c5ed88"
        >
          <title>
            {dateLabel(r.date, true)}: {num(r.value)} {unit}
          </title>
        </circle>
      ))}
      <text x="48" y={H - 5}>
        {dateLabel(sorted[0].date)}
      </text>
      {sorted.length > 1 && (
        <text x={W - 22} y={H - 5} textAnchor="end">
          {dateLabel(sorted.at(-1)!.date)}
        </text>
      )}
    </svg>
  );
}
function WorkoutArt() {
  return (
    <svg className="workout-art" viewBox="0 0 400 320" aria-hidden="true">
      <defs>
        <radialGradient id="halo">
          <stop stopColor="#b6d780" stopOpacity=".15" />
          <stop offset="1" stopColor="#b6d780" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="210" cy="165" r="170" fill="url(#halo)" />
      <g fill="none" stroke="#aebc9b" strokeWidth="1" opacity=".25">
        <ellipse cx="210" cy="276" rx="145" ry="22" />
        <ellipse cx="210" cy="276" rx="120" ry="16" />
        <path d="M35 276H380M210 15V304M60 230L350 315M350 230L60 315" />
      </g>
      <g
        fill="none"
        stroke="#c8dfa5"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="239" cy="65" r="19" />
        <path d="M227 84L199 133L162 157L186 199L157 256L121 265M220 91L240 137L268 153M198 133L234 153L256 202L235 257L269 265M207 107L169 95L141 112M222 106L262 96L283 113" />
        <path d="M121 265H158L165 258M235 258L232 266H271" />
        <path d="M98 101L307 101" strokeWidth="5" />
        <path
          d="M106 83V120M116 77V126M290 77V126M300 83V120"
          strokeWidth="9"
        />
      </g>
      <g fill="#b5d98a" opacity=".6">
        <circle cx="199" cy="133" r="5" />
        <circle cx="186" cy="199" r="5" />
        <circle cx="256" cy="202" r="5" />
      </g>
      <text x="285" y="225" fill="#97a187" fontSize="10" letterSpacing="3">
        01 / 04
      </text>
    </svg>
  );
}
const initialHealthTransfer = takeHealthFragment();
export default function App() {
  const [healthTransfer, setHealthTransfer] = useState(initialHealthTransfer);
  const [healthResult, setHealthResult] = useState("");
  const handledHealth = useRef<string | undefined>(undefined);
  const [state, setState] = useState<State>();
  const [tab, setTab] = useState<Tab>("today");
  const [settings, setSettings] = useState(false);
  const [modal, setModal] = useState<
    "weight" | "waist" | "profile" | "import" | "daily" | null
  >(null);
  const [editing, setEditing] = useState<Measurement>();
  const [toast, setToast] = useState("");
  const [storage, setStorage] = useState("Nalaganje …");
  const [fatal, setFatal] = useState("");
  const queue = useRef(Promise.resolve());
  const [preview, setPreview] = useState<Preview>();
  const [replacements, setReplacements] = useState<string[]>([]);
  const [importError, setImportError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const restoreRef = useRef<HTMLInputElement>(null);
  const [restore, setRestore] = useState<State>();
  const [now, setNow] = useState(Date.now());
  const [historyOpen, setHistoryOpen] = useState<string>();
  const [templateOpen, setTemplateOpen] = useState<string>();
  const [detailedWorkout, setDetailedWorkout] = useState(false);
  const [progressKind, setProgressKind] = useState<
    "weight" | "waist" | "strength"
  >("weight");
  useEffect(() => {
    let mounted = true;
    loadState()
      .then((s) => {
        if (mounted) {
          setState(s);
          setStorage("Shranjeno v tej napravi");
        }
      })
      .catch((e) =>
        setFatal(
          "Lokalne zbirke ni mogoče odpreti. Preveri nastavitve zasebnosti brskalnika. " +
            String(e),
        ),
      );
    return () => {
      mounted = false;
    };
  }, []);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 5500);
    return () => clearTimeout(t);
  }, [toast]);
  const latest = useRef(state);
  latest.current = state;
  function update(fn: (s: State) => State) {
    const previous = latest.current;
    if (!previous) return Promise.resolve();
    const next = fn(previous);
    latest.current = next;
    setState(next);
    setStorage("Shranjujem …");
    const saved = queue.current
      .catch(() => {})
      .then(() => saveState(next, previous))
      .then(() => {
        if (latest.current === next) setStorage("Shranjeno v tej napravi");
      });
    queue.current = saved.catch((error) => {
      setStorage("Napaka shranjevanja");
      setToast(
        error instanceof Error && error.message.includes("drugem zavihku")
          ? error.message
          : "Podatkov ni bilo mogoče shraniti. Izvozi varnostno kopijo in sprosti prostor.",
      );
    });
    return saved;
  }
  const cloudSync = useCloudSync(state, update, storage, latest);
  useEffect(() => {
    const receive = () => {
      const value = takeHealthFragment();
      if (value !== undefined) {
        handledHealth.current = undefined;
        setHealthTransfer(value);
      }
    };
    window.addEventListener("hashchange", receive);
    return () => window.removeEventListener("hashchange", receive);
  }, []);
  useEffect(() => {
    if (
      !state ||
      healthTransfer === undefined ||
      handledHealth.current === healthTransfer
    )
      return;
    handledHealth.current = healthTransfer;
    try {
      const next = applyHealthTransfer(state, healthTransfer);
      update(() => next);
      setHealthResult(
        "Prenos Apple Health iz Bližnjic je sprejet. Preveri podatke v Nastavitve → Apple Health.",
      );
    } catch (error) {
      setHealthResult((error as Error).message);
    }
    setHealthTransfer(undefined);
  }, [state, healthTransfer]);
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (storage !== "Shranjeno v tej napravi") {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [storage]);
  if (fatal)
    return (
      <main className="boot">
        <h1>TEŽIŠČE</h1>
        <p>{fatal}</p>
        <button onClick={() => location.reload()}>Poskusi znova</button>
      </main>
    );
  if (!state)
    return (
      <main className="boot">
        <h1>
          TEŽIŠČE
          <span>
            <ArrowUpRight size={27} />
          </span>
        </h1>
        <p>Pripravljamo tvoj prostor za napredek …</p>
      </main>
    );
  const weights = state.measurements
    .filter((m) => m.kind === "weight")
    .sort((a, b) => a.date.localeCompare(b.date));
  const waists = state.measurements
    .filter((m) => m.kind === "waist")
    .sort((a, b) => a.date.localeCompare(b.date));
  const lastWeight = weights.at(-1),
    firstWeight = weights[0],
    lastWaist = waists.at(-1);
  const weightDelta =
    lastWeight && firstWeight
      ? lastWeight.value - firstWeight.value
      : undefined;
  const doneWorkouts = state.workouts.filter((w) =>
    w.exercises.some((e) => e.sets.some((a) => a.done)),
  );
  const thisWeek = doneWorkouts.filter(
    (w) => w.date >= weekStart() && w.date <= localDate(),
  );
  const next =
    state.templates[state.nextTemplate % Math.max(1, state.templates.length)];
  const recent = [...state.workouts]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 3);
  const todayName = new Date().toLocaleDateString("sl-SI", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  function openMeasure(kind: "weight" | "waist", entry?: Measurement) {
    setEditing(entry);
    setModal(kind);
  }
  function start(t: Template) {
    if (state!.active) {
      setTab("training");
      return;
    }
    if (!t.exercises.length) {
      setTemplateOpen(t.id);
      setTab("training");
      setToast(
        "Najprej dodaj vaje v predlogo ali uporabi zadnji trening iz zgodovine.",
      );
      return;
    }
    const active: Workout = {
      id: uid(),
      date: localDate(),
      name: t.name,
      splitId: t.id,
      durationMin: 0,
      reviewDuration: false,
      note: "",
      source: "manual",
      measuredAt: new Date().toISOString(),
      startedAt: Date.now(),
      exercises: t.exercises.map(plannedExercise),
    };
    update((s) => ({ ...s, active: prepareWorkoutLoads(s, active) }));
    setTab("training");
  }
  function saveActive(w: Workout) {
    update((s) => ({ ...s, active: w }));
  }
  function download() {
    const blob = new Blob([backup(state!)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `tezisce-varnostna-kopija-${localDate()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  async function readFile(file: File | undefined, isRestore = false) {
    if (!file) return;
    try {
      if (file.size > 15 * 1024 * 1024)
        throw Error("Datoteka je prevelika (največ 15 MB).");
      const text = await file.text();
      if (isRestore) {
        setRestore(restoreBackup(text));
        return;
      }
      setPreview(previewPulse(text, latest.current!));
      setReplacements([]);
      setImportError("");
      setModal("import");
    } catch (e) {
      setImportError((e as Error).message);
      setModal("import");
    }
  }
  const lastDateInfo = lastWeight
    ? dateLabel(lastWeight.date, true)
    : "Brez meritev";
  const activeDone = state.active ? completeSets(state.active).length : 0;
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setTab("today");
            setSettings(false);
          }}
        >
          TEŽIŠČE
          <span>
            <ArrowUpRight size={27} />
          </span>
        </a>
        <div className="brand-sub">MANJ KILOGRAMOV. VEČ MOČI.</div>
        <div className="nav-caption">TVOJ PROSTOR</div>
        <nav>
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setTab(t.id);
                setSettings(false);
              }}
              className={tab === t.id && !settings ? "selected" : ""}
            >
              <t.icon size={20} />
              {t.label}
              {t.id === "training" && state.active && (
                <span className="nav-dot" />
              )}
              {tab === t.id && !settings && (
                <ChevronRight size={15} className="nav-arrow" />
              )}
            </button>
          ))}
        </nav>
        <div className="side-note">
          <div className="mini-mark">
            <Zap size={18} />
          </div>
          <h3>Vsak trening šteje.</h3>
          <p>
            Majhni koraki.
            <br />
            Dolgoročna sprememba.
          </p>
          <span>
            OSTANI V GIBANJU <ArrowUpRight size={14} />
          </span>
        </div>
        <div className="side-bottom">
          <ShieldCheck size={16} />
          <span>Tvoji podatki. Samo tvoji.</span>
        </div>
        <button className="profile-button" onClick={() => setSettings(true)}>
          <div className="avatar">
            {state.profile.name
              ? state.profile.name.slice(0, 1).toUpperCase()
              : "T"}
          </div>
          <div>
            <strong>{state.profile.name || "Moj profil"}</strong>
            <small>Osebni prostor</small>
          </div>
          <Settings size={17} />
        </button>
      </aside>
      <div className="main-wrap">
        <header className="topbar">
          <span className="breadcrumb">
            Moj prostor <ChevronRight size={13} />{" "}
            <strong>
              {settings ? "Nastavitve" : tabs.find((t) => t.id === tab)?.label}
            </strong>
          </span>
          <a
            className="brand mobile-brand"
            href="#"
            onClick={() => {
              setTab("today");
              setSettings(false);
            }}
          >
            TEŽIŠČE
            <span>
              <ArrowUpRight size={27} />
            </span>
          </a>
          <div className="header-right">
            <PwaUpdate saved={storage === "Shranjeno v tej napravi"} />
            <span className="local-status">
              <span className="status-dot" />
              {storage}
            </span>
            <button
              aria-label="Nastavitve in profil"
              className="icon-button"
              onClick={() => setSettings(!settings)}
            >
              <Settings size={19} />
            </button>
          </div>
        </header>
        {cloudSync.device && (
          <p className="notice" role="status">
            Naprave: {cloudSync.status}
          </p>
        )}
        {healthResult && (
          <div className="notice" role="status">
            <p>
              {healthResult}{" "}
              {storage === "Shranjeno v tej napravi"
                ? "Podatki so shranjeni v tej napravi."
                : storage}
            </p>
            <button
              className="text-button"
              onClick={() => {
                setSettings(true);
                setHealthResult("");
              }}
            >
              Odpri nastavitve prenosa
            </button>
            <button className="text-button" onClick={() => setHealthResult("")}>
              Zapri obvestilo
            </button>
          </div>
        )}
        <main>
          {settings ? (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">TVOJ PROSTOR</div>
                  <h1>
                    Nastavitve <span>& profil.</span>
                  </h1>
                  <p>Preprosto. Zasebno. Pod tvojim nadzorom.</p>
                </div>
              </div>
              <div className="settings-grid">
                <section className="panel">
                  <div className="section-title">
                    <h2>Osebni profil</h2>
                    <Target size={18} />
                  </div>
                  <p>
                    {state.profile.confirmed
                      ? "Profil je potrjen."
                      : "Pred osebnimi priporočili potrdi svoje podatke in cilj."}
                  </p>
                  <dl className="profile-details">
                    <div>
                      <dt>Ime</dt>
                      <dd>{state.profile.name || "Ni nastavljeno"}</dd>
                    </div>
                    <div>
                      <dt>Cilj</dt>
                      <dd>{state.profile.goal || "Ni potrjen"}</dd>
                    </div>
                    <div>
                      <dt>Višina</dt>
                      <dd>
                        {state.profile.heightCm
                          ? `${num(state.profile.heightCm)} cm`
                          : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt>Tedenski cilj</dt>
                      <dd>
                        {state.profile.weeklyGoal
                          ? `${state.profile.weeklyGoal} treningi`
                          : "Ni nastavljen"}
                      </dd>
                    </div>
                    <div>
                      <dt>Ciljna teža</dt>
                      <dd>
                        {state.profile.targetWeight
                          ? `${num(state.profile.targetWeight)} kg`
                          : "Ni nastavljena"}
                      </dd>
                    </div>
                  </dl>
                  <Button onClick={() => setModal("profile")}>
                    Uredi in potrdi profil <ArrowRight size={16} />
                  </Button>
                </section>
                <section className="panel">
                  <div className="section-title">
                    <h2>Podatki & zasebnost</h2>
                    <ShieldCheck size={18} />
                  </div>
                  <p>Različica 0.3.1 · hiter trening in knjižnica vaj</p>
                  <PwaUpdate
                    saved={storage === "Shranjeno v tej napravi"}
                    manual
                  />
                  <p>
                    Vsi podatki so shranjeni v brskalniku te naprave
                    (IndexedDB). Šifrirano sinhronizacijo med napravami lahko
                    omogočiš spodaj. Brisanje podatkov brskalnika jih lahko
                    odstrani.
                  </p>
                  <div className="stack">
                    <Button secondary onClick={() => fileRef.current?.click()}>
                      <Upload size={17} /> Uvozi zgodovino Pulse
                    </Button>
                    <Button secondary onClick={download}>
                      <Download size={17} /> Izvozi celotno varnostno kopijo
                    </Button>
                    <Button
                      secondary
                      onClick={() => restoreRef.current?.click()}
                    >
                      <RotateCcw size={17} /> Obnovi varnostno kopijo
                    </Button>
                    <Button
                      secondary
                      onClick={() => {
                        navigator.storage
                          ?.persist()
                          .then((v) =>
                            setToast(
                              v
                                ? "Trajno shranjevanje je odobreno. Še vedno priporočamo varnostne kopije."
                                : "Brskalnik trajnega shranjevanja ni odobril. Redno izvozi kopijo.",
                            ),
                          );
                      }}
                    >
                      Zaprosi za trajno shranjevanje
                    </Button>
                  </div>
                </section>
                <section className="panel">
                  <div className="section-title">
                    <h2>Apple Health</h2>
                    <Watch size={20} />
                  </div>
                  <HealthShortcutsPanel state={state} update={update} />
                  <Button secondary onClick={() => setModal("daily")}>
                    <Plus size={16} /> Ročni dnevni vnos
                  </Button>
                </section>
                <CloudSyncPanel sync={cloudSync} state={state} />
                <section className="panel">
                  <div className="section-title">
                    <h2>Namesti na iPhone</h2>
                    <ArrowUpRight size={18} />
                  </div>
                  <p>
                    Odpri aplikacijo prek HTTPS v Safariju. Izberi Deli → Dodaj
                    na začetni zaslon. Po prvem spletnem obisku bo produkcijska
                    različica na voljo tudi brez povezave.
                  </p>
                  <p>
                    Počitek se izračuna iz časovne oznake. Opozorila pri
                    zaklenjenem telefonu niso zagotovljena.
                  </p>
                </section>
              </div>
              {state.imports.length > 0 && (
                <section className="panel imports">
                  <h2>Uvozni paketi</h2>
                  {state.imports.map((b) => (
                    <div key={b.id} className="import-row">
                      <div>
                        <strong>{b.source}</strong>
                        <p>
                          {new Date(b.at).toLocaleString("sl-SI")} ·{" "}
                          {b.changes.length} zapisov
                          {b.undone ? " · Razveljavljeno" : ""}
                        </p>
                        <details>
                          <summary>Opozorila in izvorne vrednosti</summary>
                          <ul>
                            {b.warnings.map((w, i) => (
                              <li key={i}>{w}</li>
                            ))}
                          </ul>
                          <pre>{JSON.stringify(b.raw, null, 2)}</pre>
                        </details>
                      </div>
                      {!b.undone && (
                        <Button
                          secondary
                          onClick={() => {
                            const r = undoImport(state, b.id);
                            update(() => r.state);
                            setToast(
                              `Uvoz razveljavljen. Ohranjenih pozneje spremenjenih zapisov: ${r.preserved}.`,
                            );
                          }}
                        >
                          Razveljavi uvoz
                        </Button>
                      )}
                    </div>
                  ))}
                </section>
              )}
            </>
          ) : tab === "today" ? (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">{todayName}</div>
                  <h1>
                    Tvoj tempo.
                    <br className="mobile-break" />
                    <span> Tvoj napredek.</span>
                  </h1>
                  <p>Vsak korak šteje. Nadaljuj tam, kjer si ostal.</p>
                </div>
                <button
                  className="text-button"
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload size={16} /> Uvozi zgodovino
                </button>
              </div>
              {!state.profile.confirmed && (
                <div className="onboarding-strip">
                  <div>
                    <span className="tiny-icon">
                      <Target size={18} />
                    </span>
                    <span>
                      <strong>Najprej spoznajmo tvoje cilje.</strong> Potrdi
                      profil in sestavi program po svoji meri.
                    </span>
                  </div>
                  <button onClick={() => setModal("profile")}>
                    Uredi profil <ArrowRight size={16} />
                  </button>
                </div>
              )}
              <CoachPanel
                state={state}
                update={update}
                editProfile={() => setModal("profile")}
                start={(w) => {
                  update((s) => ({ ...s, active: prepareWorkoutLoads(s, w) }));
                  setTab("training");
                }}
              />
              <div className="dashboard-top">
                <section className="hero-card">
                  <div className="hero-content">
                    <span className="eyebrow">
                      <span className="status-dot" />
                      {state.active ? "TRENING V TEKU" : "TVOJ NASLEDNJI KORAK"}
                    </span>
                    <div className="hero-title">
                      <h2>
                        {state.active?.name || next?.name || "Tvoj trening"}
                      </h2>
                      <span className="outline-tag">
                        {state.active
                          ? "Aktivno"
                          : nextSessionDate(state.profile)
                            ? dateLabel(nextSessionDate(state.profile)!)
                            : "Prilagodljivo"}
                      </span>
                    </div>
                    <p>
                      {state.active
                        ? "Moč gradiš serijo za serijo. Nadaljuj."
                        : next?.exercises.length
                          ? "Danes naredi nekaj zase. Pripravljen na novo serijo?"
                          : "Sestavi trening ali nadaljuj z vajami iz svoje zgodovine."}
                    </p>
                    <div className="hero-meta">
                      <span>
                        <Dumbbell size={16} />
                        {state.active?.exercises.length ??
                          next?.exercises.length ??
                          0}{" "}
                        vaj
                      </span>
                      <span>
                        <Clock size={16} />
                        {state.profile.time} min na voljo
                      </span>
                    </div>
                    <Button
                      onClick={() =>
                        state.active
                          ? setTab("training")
                          : next
                            ? start(next)
                            : setTab("training")
                      }
                    >
                      {state.active
                        ? "Nadaljuj trening"
                        : next?.exercises.length
                          ? "Začni trening"
                          : "Pripravi trening"}{" "}
                      <ArrowRight size={19} />
                    </Button>
                  </div>
                  <WorkoutArt />
                  <div className="hero-bottom">
                    <span>
                      01 <span>/ TVOJ PROGRAM</span>
                    </span>
                    <button onClick={() => setTab("training")}>
                      Poglej program <ArrowUpRight size={14} />
                    </button>
                  </div>
                </section>
                <section className="week-card">
                  <div className="section-title">
                    <h2>Ta teden</h2>
                    <span className="subtle">
                      {dateLabel(weekStart())} — danes
                    </span>
                  </div>
                  <div className="week-number">
                    {thisWeek.length}
                    <span>
                      {state.profile.weeklyGoal
                        ? ` / ${state.profile.weeklyGoal}`
                        : " treningov"}
                    </span>
                  </div>
                  <p>
                    {state.profile.weeklyGoal
                      ? "Opravljenih treningov od ponedeljka"
                      : "Tedenski cilj še ni nastavljen"}
                  </p>
                  <div className="week-days">
                    {["P", "T", "S", "Č", "P", "S", "N"].map((d, i) => {
                      const date = new Date(weekStart() + "T12:00:00");
                      date.setDate(date.getDate() + i);
                      const day = localDate(date);
                      const done = thisWeek.some((w) => w.date === day);
                      return (
                        <div key={i}>
                          <span>{d}</span>
                          <div
                            title={dateLabel(day, true)}
                            className={`${done ? "day-done" : ""} ${day === localDate() ? "day-today" : ""}`}
                          >
                            {done ? <Check size={16} /> : date.getDate()}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="week-footer">
                    <Flame size={16} />
                    <span>
                      {streak(state.workouts)} zaporednih aktivnih tednov
                    </span>
                  </div>
                </section>
              </div>
              <div className="metrics-grid">
                <section className="metric-card">
                  <div className="section-title">
                    <span>Telesna teža</span>
                    <button
                      className="icon-button"
                      aria-label="Dodaj težo"
                      onClick={() => openMeasure("weight")}
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                  <div className="metric-value">
                    {lastWeight ? num(lastWeight.value) : "—"}
                    <span>kg</span>
                  </div>
                  <div className="metric-foot">
                    <span>{lastDateInfo}</span>
                    <span className="metric-symbol">
                      <Activity size={21} />
                    </span>
                  </div>
                </section>
                <section className="metric-card">
                  <div className="section-title">
                    <span>Sprememba teže</span>
                    <ArrowDownLeft size={19} />
                  </div>
                  <div
                    className={`metric-value ${weightDelta !== undefined && weightDelta < 0 ? "lime" : ""}`}
                  >
                    {weightDelta === undefined
                      ? "—"
                      : `${weightDelta > 0 ? "+" : ""}${num(weightDelta)}`}
                    <span>kg</span>
                  </div>
                  <div className="metric-foot">
                    <span>
                      {firstWeight
                        ? `od ${dateLabel(firstWeight.date, true)}`
                        : "od prve meritve"}
                    </span>
                    {weights.length > 1 && (
                      <span className="small-badge">
                        {num(
                          (Math.abs(weightDelta!) / firstWeight.value) * 100,
                        )}{" "}
                        %
                      </span>
                    )}
                  </div>
                </section>
                <section className="metric-card">
                  <div className="section-title">
                    <span>Obseg pasu</span>
                    <button
                      className="icon-button"
                      aria-label="Dodaj obseg pasu"
                      onClick={() => openMeasure("waist")}
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                  <div className="metric-value">
                    {lastWaist ? num(lastWaist.value) : "—"}
                    <span>cm</span>
                  </div>
                  <div className="metric-foot">
                    <span>
                      {lastWaist
                        ? dateLabel(lastWaist.date, true)
                        : "Brez meritev"}
                    </span>
                    <span className="metric-symbol">
                      <Target size={21} />
                    </span>
                  </div>
                </section>
              </div>
              <div className="dashboard-middle">
                <section className="panel weight-panel">
                  <div className="section-title">
                    <div>
                      <h2>Lažji korak. Močnejši ti.</h2>
                      <p>Telesna teža skozi čas</p>
                    </div>
                    <button
                      className="text-button"
                      onClick={() => {
                        setProgressKind("weight");
                        setTab("progress");
                      }}
                    >
                      Napredek <ArrowUpRight size={16} />
                    </button>
                  </div>
                  <Chart rows={weights} unit="kg" />
                  <div className="chart-caption">
                    <span>
                      <i /> Posamezne meritve
                    </span>
                    <span>
                      {weights.length} meritev · brez dodanih vmesnih vrednosti
                    </span>
                  </div>
                </section>
                <section className="panel insight-card">
                  <span className="eyebrow">
                    <Zap size={15} /> POGLED NA NAPREDEK
                  </span>
                  <h2>
                    {weights.length > 1
                      ? "Doslednost premika meje."
                      : "Tvoja zgodba se začne tukaj."}
                  </h2>
                  <p>
                    {weights.length > 1
                      ? `Od prve meritve se je teža spremenila za ${num(weightDelta!)} kg. V zgodovini imaš ${doneWorkouts.length} opravljenih treningov.`
                      : "Dodaj prvo meritev ali uvozi zgodovino. Tako bo tvoj naslednji korak temeljil na dejanskih podatkih."}
                  </p>
                  <div className="insight-divider" />
                  <span className="label">NASLEDNJI KORAK</span>
                  <p>
                    {!state.profile.confirmed
                      ? "Potrdi cilje in omejitve. Program in obremenitve prilagodi svojemu počutju."
                      : "Opravljene serije beleži sproti. Pri vajah potrdi opremo in ciljni razpon ponovitev."}
                  </p>
                  <button
                    className="text-button"
                    onClick={() =>
                      state.profile.confirmed
                        ? setTab("training")
                        : setModal("profile")
                    }
                  >
                    {state.profile.confirmed
                      ? "Odpri program"
                      : "Dopolni profil"}{" "}
                    <ArrowRight size={16} />
                  </button>
                </section>
              </div>
              <div className="section-title recent-title">
                <h2>
                  Zadnji treningi{" "}
                  <span className="count">{state.workouts.length}</span>
                </h2>
                <button
                  className="text-button"
                  onClick={() => setTab("history")}
                >
                  Vsa zgodovina <ArrowRight size={15} />
                </button>
              </div>
              <section className="recent-list">
                {recent.length ? (
                  recent.map((w) => (
                    <button
                      key={w.id}
                      className="recent-row"
                      onClick={() => {
                        setHistoryOpen(w.id);
                        setTab("history");
                      }}
                    >
                      <span className="workout-icon">
                        <Dumbbell size={21} />
                      </span>
                      <div>
                        <strong>{w.name}</strong>
                        <small>{dateLabel(w.date, true)}</small>
                      </div>
                      <span className="recent-stat">
                        {completeSets(w).length}
                        <small>serij</small>
                      </span>
                      <span className="recent-duration">
                        <Clock size={14} />
                        {w.reviewDuration
                          ? "Za preverjanje"
                          : `${num(w.durationMin, 0)} min`}
                      </span>
                      <ChevronRight size={18} />
                    </button>
                  ))
                ) : (
                  <Empty
                    title="Prostor za tvoje prve zmage"
                    detail="Tukaj bodo tvoji opravljeni treningi. Uvozi zgodovino ali sestavi prvi trening."
                  />
                )}
              </section>
              <div className="bottom-note">
                <ShieldCheck size={14} />{" "}
                {cloudSync.device
                  ? cloudSync.status
                  : "Lokalno shranjeno · naprave poveži v nastavitvah."}
              </div>
            </>
          ) : tab === "training" ? (
            <>
              <div
                className={`page-heading ${state.active ? "active-workout-heading" : ""}`}
              >
                <div>
                  <div className="eyebrow">SERIJO ZA SERIJO</div>
                  <h1>{state.active ? "Tvoj trening." : "Tvoj program."}</h1>
                  <p>
                    {state.active
                      ? "Načrt ni rezultat. Potrdi vsako opravljeno serijo."
                      : "Trener pripravi vaje, serije in ponovitve glede na tvojo opremo in današnji čas."}
                  </p>
                </div>
                {state.active ? (
                  <button
                    className="button secondary workout-view-toggle"
                    onClick={() => setDetailedWorkout(!detailedWorkout)}
                  >
                    {detailedWorkout ? "Hiter pogled" : "Vse serije"}
                  </button>
                ) : (
                  <div className="actions">
                    <ExerciseLibraryButton state={state} />
                    <Button
                      secondary
                      onClick={() =>
                        update((s) => ({
                          ...s,
                          templates: [
                            ...s.templates,
                            { id: uid(), name: "Nov trening", exercises: [] },
                          ],
                        }))
                      }
                    >
                      <Plus size={17} /> Dodaj trening
                    </Button>
                  </div>
                )}
              </div>
              {state.active ? (
                <>
                  <div className="active-toolbar">
                    <div>
                      <span className="live-dot" /> V TEKU{" "}
                      <strong>
                        {Math.floor(
                          (now - (state.active.startedAt ?? now)) / 60000,
                        )}
                        :
                        {String(
                          Math.floor(
                            (now - (state.active.startedAt ?? now)) / 1000,
                          ) % 60,
                        ).padStart(2, "0")}
                      </strong>
                    </div>
                    <span>
                      {activeDone} /{" "}
                      {state.active.exercises
                        .filter((e) => !e.cardio)
                        .reduce((n, e) => n + e.sets.length, 0)}{" "}
                      serij
                    </span>
                    <div className="workout-rest" aria-label="Počitek">
                      <Clock size={15} />
                      <span className="rest-label">Počitek</span>
                      <strong>
                        {state.restUntil
                          ? state.restUntil > now
                            ? `${Math.ceil((state.restUntil - now) / 1000)} s`
                            : "Končan"
                          : "—"}
                      </strong>
                      {state.restUntil && (
                        <button
                          className="icon-button"
                          aria-label="Preskoči počitek"
                          onClick={() =>
                            update((s) => ({ ...s, restUntil: undefined }))
                          }
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                  {state.active.cardioPlan && (
                    <section className="panel">
                      <h2>Kardio · današnji načrt</h2>
                      <p>
                        {state.active.cardioPlan.warmup} min ogrevanja +{" "}
                        {state.active.cardioPlan.minutes -
                          state.active.cardioPlan.warmup -
                          state.active.cardioPlan.cooldown}{" "}
                        min osrednjega dela + {state.active.cardioPlan.cooldown}{" "}
                        min umirjanja. {state.active.cardioPlan.intensity}{" "}
                        {state.active.cardioPlan.type === "treadmill"
                          ? `Naklon: ${state.active.cardioPlan.incline} %.`
                          : ""}
                      </p>
                      <p>
                        Spodaj vnesi dejanske opravljene minute in potrdi
                        aktivnost. Kardio ne premakne zaporedja moči.
                      </p>
                    </section>
                  )}
                  {detailedWorkout ? (
                    <WorkoutEditor
                      workout={state.active}
                      state={state}
                      onChange={saveActive}
                      onReplaceDevice={(index, id, permanent) =>
                        update((s) => replaceDevice(s, index, id, permanent))
                      }
                      onDone={(rest) =>
                        update((s) => ({
                          ...s,
                          restUntil: Date.now() + rest * 1000,
                        }))
                      }
                    />
                  ) : (
                    <FocusWorkout
                      workout={state.active}
                      state={state}
                      onChange={saveActive}
                      onReplaceDevice={(index, id, permanent) =>
                        update((s) => replaceDevice(s, index, id, permanent))
                      }
                      onDone={(rest) =>
                        update((s) => ({
                          ...s,
                          restUntil:
                            rest > 0 ? Date.now() + rest * 1000 : undefined,
                        }))
                      }
                      showDetails={() => setDetailedWorkout(true)}
                    />
                  )}
                  <section className="panel workout-finish">
                    <details>
                      <summary>Opomba treninga</summary>
                      <label>
                        Opomba treninga
                        <textarea
                          value={state.active.note}
                          onChange={(e) =>
                            saveActive({
                              ...state.active!,
                              note: e.target.value,
                            })
                          }
                        />
                      </label>
                    </details>
                    <div className="actions">
                      <Button
                        onClick={() => {
                          const active = state.active!;
                          if (
                            !completeSets(active).length &&
                            !active.exercises.some(
                              (e) => e.cardio && e.sets.some((s) => s.done),
                            )
                          ) {
                            setToast(
                              "Potrdi vsaj eno opravljeno serijo ali kardio aktivnost.",
                            );
                            return;
                          }
                          update((s) => ({
                            ...s,
                            workouts: [
                              ...s.workouts,
                              {
                                ...active,
                                finishedAt: Date.now(),
                                durationMin: Math.round(
                                  (Date.now() - active.startedAt!) / 60000,
                                ),
                              },
                            ],
                            active: undefined,
                            restUntil: undefined,
                            nextTemplate:
                              s.nextTemplate +
                              (active.exercises.some(
                                (e) =>
                                  !e.cardio &&
                                  e.sets.some(
                                    (a) => a.done && a.kind !== "warmup",
                                  ),
                              )
                                ? 1
                                : 0),
                          }));
                          setToast("Trening je shranjen. Dober korak naprej.");
                          setTab("history");
                        }}
                      >
                        Zaključi trening <Check size={18} />
                      </Button>
                      <Button
                        secondary
                        onClick={() => {
                          if (
                            confirm(
                              "Zavrži aktivni trening? Vnesene serije bodo odstranjene.",
                            )
                          )
                            update((s) => ({
                              ...s,
                              active: undefined,
                              restUntil: undefined,
                            }));
                        }}
                      >
                        Zavrzi trening
                      </Button>
                    </div>
                  </section>
                </>
              ) : (
                <>
                  <CoachPanel
                    state={state}
                    update={update}
                    programs
                    editProfile={() => setModal("profile")}
                    start={(w) => {
                      update((s) => ({
                        ...s,
                        active: prepareWorkoutLoads(s, w),
                      }));
                      setTab("training");
                    }}
                  />
                  {!state.profile.confirmed && (
                    <div className="notice">
                      <Info size={18} />
                      <span>
                        Osebni program še ni potrjen. Zgodovina in ročno
                        sestavljanje sta na voljo.
                      </span>
                      <button
                        className="text-button"
                        onClick={() => setModal("profile")}
                      >
                        Uredi profil
                      </button>
                    </div>
                  )}
                  <div className="program-grid">
                    {state.templates.map((t, i) => (
                      <section
                        key={t.id}
                        className={`panel program-card ${i === state.nextTemplate % state.templates.length ? "next-program" : ""}`}
                      >
                        <div className="section-title">
                          <span className="program-index">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          {i ===
                            state.nextTemplate % state.templates.length && (
                            <span className="badge">Naslednji</span>
                          )}
                        </div>
                        <h2>{t.name}</h2>
                        <p>
                          {t.exercises.length} vaj ·{" "}
                          {t.exercises.reduce((n, e) => n + e.sets.length, 0)}{" "}
                          načrtovanih serij
                        </p>
                        <div className="program-exercises">
                          {t.exercises.length ? (
                            t.exercises.map((e, j) => (
                              <span key={j}>{e.name}</span>
                            ))
                          ) : (
                            <span>Predloga še nima vaj</span>
                          )}
                        </div>
                        <button
                          className="text-button"
                          disabled={
                            i === state.nextTemplate % state.templates.length
                          }
                          onClick={() =>
                            update((s) => ({ ...s, nextTemplate: i }))
                          }
                        >
                          {i === state.nextTemplate % state.templates.length
                            ? "Naslednji v zaporedju"
                            : "Nastavi kot naslednji"}
                        </button>
                        <div className="actions">
                          <Button onClick={() => start(t)}>
                            {t.exercises.length
                              ? "Začni trening"
                              : "Dodaj vaje"}{" "}
                            <ArrowRight size={17} />
                          </Button>
                          <button
                            className="icon-button"
                            aria-label={`Uredi ${t.name}`}
                            onClick={() => setTemplateOpen(t.id)}
                          >
                            <Settings size={19} />
                          </button>
                        </div>
                      </section>
                    ))}
                  </div>
                  <section className="panel">
                    <h2>Uporabi vaje iz zgodovine</h2>
                    <p>
                      Izberi zadnji trening skupine kot izhodišče. Obremenitve
                      ostanejo zgodovinske, serije pa nepotrjene. To ni
                      samodejno potrjen program.
                    </p>
                    <div className="actions">
                      {["legs", "push", "pull", "upper"].map((split) => {
                        const w = [...state.workouts]
                          .filter((w) => w.splitId.toLowerCase() === split)
                          .sort((a, b) => b.date.localeCompare(a.date))[0];
                        return (
                          <Button
                            key={split}
                            secondary
                            disabled={!w}
                            onClick={() => {
                              if (!w) return;
                              const template: Template = {
                                id: uid(),
                                name: w.name,
                                exercises: structuredClone(w.exercises).map(
                                  (e) => ({
                                    ...e,
                                    confirmed: false,
                                    sets: e.sets.map((a) => ({
                                      ...a,
                                      id: uid(),
                                      done: false,
                                    })),
                                  }),
                                ),
                              };
                              update((s) => ({
                                ...s,
                                templates: [...s.templates, template],
                              }));
                              setTemplateOpen(template.id);
                            }}
                          >
                            {split.charAt(0).toUpperCase() + split.slice(1)}{" "}
                            {w && <small>{dateLabel(w.date)}</small>}
                          </Button>
                        );
                      })}
                    </div>
                  </section>
                </>
              )}
            </>
          ) : tab === "progress" ? (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">POGLEJ, KAKO DALEČ SI PRIŠEL</div>
                  <h1>
                    Napredek <span>v tvojem ritmu.</span>
                  </h1>
                  <p>Resnične meritve. Pregledne primerjave.</p>
                </div>
                <Button
                  onClick={() =>
                    openMeasure(progressKind === "waist" ? "waist" : "weight")
                  }
                >
                  <Plus size={17} /> Dodaj meritev
                </Button>
              </div>
              <div className="segmented">
                {(
                  [
                    { id: "weight", label: "Telesna teža" },
                    { id: "waist", label: "Obseg pasu" },
                    { id: "strength", label: "Moč" },
                  ] as const
                ).map((k) => (
                  <button
                    key={k.id}
                    className={progressKind === k.id ? "active" : ""}
                    onClick={() => setProgressKind(k.id)}
                  >
                    {k.label}
                  </button>
                ))}
              </div>
              {progressKind === "strength" ? (
                <Strength state={state} />
              ) : (
                <>
                  <section className="panel">
                    <div className="section-title">
                      <div>
                        <h2>
                          {progressKind === "weight"
                            ? "Telesna teža"
                            : "Obseg pasu"}
                        </h2>
                        <p>Posamezne meritve po dejanskih datumih</p>
                      </div>
                      <span className="metric-value small">
                        {(progressKind === "weight" ? lastWeight : lastWaist)
                          ? num(
                              (progressKind === "weight"
                                ? lastWeight
                                : lastWaist)!.value,
                            )
                          : "—"}
                        <span>{progressKind === "weight" ? "kg" : "cm"}</span>
                      </span>
                    </div>
                    <Chart
                      rows={progressKind === "weight" ? weights : waists}
                      unit={progressKind === "weight" ? "kg" : "cm"}
                    />
                    {(progressKind === "weight" ? weights : waists).length >
                      1 && (
                      <p>
                        Sprememba od prve meritve:{" "}
                        <strong>
                          {num(
                            (progressKind === "weight" ? weights : waists).at(
                              -1,
                            )!.value -
                              (progressKind === "weight" ? weights : waists)[0]
                                .value,
                          )}{" "}
                          {progressKind === "weight" ? "kg" : "cm"}
                        </strong>
                      </p>
                    )}
                  </section>
                  {progressKind === "weight" && weights.length > 0 && (
                    <div className="two-col">
                      <section className="panel">
                        <h2>Tedenska povprečja</h2>
                        <p>Manjkajoči dnevi niso ničle.</p>
                        {weeklyAverages(weights).map((r) => (
                          <div className="data-row" key={r.date}>
                            <span>Teden {dateLabel(r.date)}</span>
                            <strong>{num(r.value)} kg</strong>
                            <span className="subtle">{r.count} meritev</span>
                          </div>
                        ))}
                      </section>
                      <section className="panel">
                        <h2>7-dnevno drseče povprečje</h2>
                        <p>
                          Iz razpoložljivih meritev, brez zapolnjevanja praznih
                          dni.
                        </p>
                        <Chart rows={rolling(weights)} unit="kg" compact />
                        <div className="notice">
                          <Info size={17} />
                          <span>
                            {rolling(weights).at(-1)!.count} meritev v zadnjem
                            oknu.{" "}
                            {rolling(weights).at(-1)!.count < 4
                              ? "Redki podatki — trend je manj zanesljiv."
                              : "Povprečje opisuje le izmerjene dneve."}
                          </span>
                        </div>
                      </section>
                    </div>
                  )}
                  <section className="panel">
                    <h2>Vse meritve</h2>
                    {(progressKind === "weight" ? weights : waists).length ? (
                      [...(progressKind === "weight" ? weights : waists)]
                        .reverse()
                        .map((m) => (
                          <div className="data-row" key={m.id}>
                            <span>{dateLabel(m.date, true)}</span>
                            <strong>
                              {num(m.value)} {m.kind === "weight" ? "kg" : "cm"}
                            </strong>
                            <button
                              className="text-button"
                              onClick={() => openMeasure(m.kind, m)}
                            >
                              Uredi <ChevronRight size={14} />
                            </button>
                          </div>
                        ))
                    ) : (
                      <Empty
                        title="Še ni meritev"
                        detail="Dodaj prvo meritev ali uvozi zgodovino Pulse."
                      />
                    )}
                  </section>
                </>
              )}
              <section className="panel">
                <span className="eyebrow">TEDENSKI POGLED</span>
                <h2>Opazovanja</h2>
                <p>
                  Ta teden: {thisWeek.length} treningov z opravljenimi serijami.
                  Veljavno zabeleženo trajanje:{" "}
                  {num(
                    thisWeek
                      .filter((w) => !w.reviewDuration)
                      .reduce((s, w) => s + w.durationMin, 0),
                    0,
                  )}{" "}
                  min. {thisWeek.filter((w) => w.reviewDuration).length} trajanj
                  izločenih za preverjanje.
                </p>
                <h3>Predlog</h3>
                <p>
                  Beleži serije in meritve dosledno. Sprememba teže sama ne
                  pove, koliko maščobe ali mišic se je spremenilo.
                </p>
              </section>
            </>
          ) : (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">TVOJE DELO OSTANE ZAPISANO</div>
                  <h1>
                    Zgodovina <span>tvojih korakov.</span>
                  </h1>
                  <p>
                    {state.workouts.length} treningov ·{" "}
                    {state.workouts.reduce(
                      (n, w) => n + completeSets(w).length,
                      0,
                    )}{" "}
                    opravljenih serij
                  </p>
                </div>
                <Button secondary onClick={() => fileRef.current?.click()}>
                  <Upload size={17} /> Uvozi zgodovino
                </Button>
              </div>
              {state.workouts.length ? (
                [...state.workouts]
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map((w) => (
                    <section className="panel history-card" key={w.id}>
                      <button
                        className="history-heading"
                        onClick={() =>
                          setHistoryOpen(
                            historyOpen === w.id ? undefined : w.id,
                          )
                        }
                      >
                        <span className="workout-icon">
                          <Dumbbell size={22} />
                        </span>
                        <div>
                          <h2>{w.name}</h2>
                          <p>
                            {dateLabel(w.date, true)} · {completeSets(w).length}{" "}
                            opravljenih serij
                          </p>
                        </div>
                        <span className="subtle">
                          {w.reviewDuration
                            ? "Trajanje za preverjanje"
                            : `${num(w.durationMin, 0)} min`}
                        </span>
                        <ChevronDown
                          className={historyOpen === w.id ? "rotate" : ""}
                          size={19}
                        />
                      </button>
                      {historyOpen === w.id && (
                        <>
                          <div className="notice">
                            <Info size={17} />
                            <span>
                              {w.batchId
                                ? "Uvožen trening. Izvorne vrednosti ostajajo v uvoznem paketu. Vrsta serije in način obremenitve nista potrjena."
                                : "Lokalno zabeležen trening."}
                              {w.avgHr
                                ? ` Povprečni utrip iz vira: ${w.avgHr}/min.`
                                : ""}
                            </span>
                          </div>
                          <div className="field-grid">
                            <label>
                              Datum
                              <input
                                type="date"
                                value={w.date}
                                onChange={(e) => {
                                  if (e.target.value)
                                    update((s) => ({
                                      ...s,
                                      workouts: s.workouts.map((a) =>
                                        a.id === w.id
                                          ? {
                                              ...a,
                                              date: e.target.value,
                                              modifiedAt:
                                                new Date().toISOString(),
                                            }
                                          : a,
                                      ),
                                    }));
                                }}
                              />
                            </label>
                            <label>
                              Trajanje (min)
                              <input
                                type="number"
                                min="0"
                                value={w.durationMin}
                                onChange={(e) =>
                                  update((s) => ({
                                    ...s,
                                    workouts: s.workouts.map((a) =>
                                      a.id === w.id
                                        ? {
                                            ...a,
                                            durationMin: Math.max(
                                              0,
                                              +e.target.value,
                                            ),
                                            modifiedAt:
                                              new Date().toISOString(),
                                          }
                                        : a,
                                    ),
                                  }))
                                }
                              />
                            </label>
                          </div>
                          {w.reviewDuration && (
                            <Button
                              secondary
                              onClick={() =>
                                update((s) => ({
                                  ...s,
                                  workouts: s.workouts.map((a) =>
                                    a.id === w.id
                                      ? {
                                          ...a,
                                          reviewDuration: false,
                                          modifiedAt: new Date().toISOString(),
                                        }
                                      : a,
                                  ),
                                }))
                              }
                            >
                              Potrdi prikazano trajanje
                            </Button>
                          )}
                          <WorkoutEditor
                            workout={w}
                            state={state}
                            historical
                            onChange={(value) =>
                              update((s) => ({
                                ...s,
                                workouts: s.workouts.map((a) =>
                                  a.id === w.id
                                    ? {
                                        ...value,
                                        modifiedAt: new Date().toISOString(),
                                      }
                                    : a,
                                ),
                              }))
                            }
                          />
                          <label>
                            Opomba
                            <textarea
                              value={w.note}
                              onChange={(e) =>
                                update((s) => ({
                                  ...s,
                                  workouts: s.workouts.map((a) =>
                                    a.id === w.id
                                      ? {
                                          ...a,
                                          note: e.target.value,
                                          modifiedAt: new Date().toISOString(),
                                        }
                                      : a,
                                  ),
                                }))
                              }
                            />
                          </label>
                        </>
                      )}
                    </section>
                  ))
              ) : (
                <section className="panel">
                  <Empty
                    title="Zgodovina čaka nate"
                    detail="Uvozi datoteko pulse-zgodovina.json. Pred shranjevanjem preveri vsebino in opozorila."
                    action={
                      <Button onClick={() => fileRef.current?.click()}>
                        <Upload size={17} /> Izberi datoteko
                      </Button>
                    }
                  />
                </section>
              )}
              {state.daily.length > 0 && (
                <section className="panel">
                  <h2>Dnevni zapisi · izvor je naveden pri zapisu</h2>
                  <p>
                    Stari hr ima neznan pomen. Ničle aktivnosti niso dokaz
                    neaktivnosti.
                  </p>
                  {[...state.daily]
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .map((d) => (
                      <div key={d.id} className="data-row">
                        <span>
                          {dateLabel(d.date, true)}
                          {d.source === "apple-shortcuts"
                            ? ` · Apple Health prek Bližnjic (${d.sourceId})`
                            : " · ročni/stari vir"}
                        </span>
                        <strong>
                          {d.steps === undefined ? "—" : num(d.steps, 0)}{" "}
                          korakov
                        </strong>
                        <span className="subtle">
                          {d.hr === undefined
                            ? ""
                            : d.source === "manual"
                              ? `Srčni utrip: ${d.hr}/min`
                              : `hr: ${d.hr} (neznan pomen)`}
                        </span>
                      </div>
                    ))}
                </section>
              )}
            </>
          )}
        </main>
        <footer>
          <span>
            TEŽIŠČE <ArrowUpRight size={13} className="footer-cross" />
          </span>
          <span>Manj kilogramov. Več moči.</span>
          <span>Majhni koraki, vsak dan.</span>
        </footer>
      </div>
      <nav className="bottom-nav" aria-label="Glavna navigacija">
        {tabs.map((t) => (
          <button
            key={t.id}
            className={t.id === tab && !settings ? "selected" : ""}
            onClick={() => {
              setTab(t.id);
              setSettings(false);
            }}
          >
            <t.icon size={21} />
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
      <input
        type="file"
        accept=".json,application/json"
        hidden
        ref={fileRef}
        onChange={(e) => {
          readFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <input
        type="file"
        accept=".json,application/json"
        hidden
        ref={restoreRef}
        onChange={(e) => {
          readFile(e.target.files?.[0], true);
          e.target.value = "";
        }}
      />
      {toast && (
        <div className="toast" role="status">
          <Check size={18} />
          {toast}
          <button
            className="icon-button"
            aria-label="Zapri obvestilo"
            onClick={() => setToast("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
      {(modal === "weight" || modal === "waist") && (
        <Modal
          title={modal === "weight" ? "Telesna teža" : "Obseg pasu"}
          close={() => setModal(null)}
        >
          <MeasurementForm
            kind={modal}
            value={editing}
            save={(m) => {
              update((s) => ({
                ...s,
                measurements: editing
                  ? s.measurements.map((a) => (a.id === editing.id ? m : a))
                  : [...s.measurements, m],
              }));
              setModal(null);
              setToast("Meritev shranjena.");
            }}
            remove={
              editing
                ? () => {
                    update((s) => ({
                      ...s,
                      measurements: s.measurements.filter(
                        (m) => m.id !== editing.id,
                      ),
                    }));
                    setModal(null);
                  }
                : undefined
            }
          />
        </Modal>
      )}
      {modal === "profile" && (
        <Modal title="Tvoj profil. Tvoj cilj." close={() => setModal(null)}>
          <ProfileForm
            profile={state.profile}
            save={(p) => {
              update((s) => ({ ...s, profile: p }));
              setModal(null);
              setToast(
                "Profil potrjen. Program lahko sestaviš v zavihku Trening.",
              );
            }}
          />
        </Modal>
      )}
      {modal === "daily" && (
        <Modal title="Ročni dnevni zapis" close={() => setModal(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const day = String(f.get("date"));
              const steps = f.get("steps") ? Number(f.get("steps")) : undefined;
              const optional = (key: string) =>
                f.get(key) ? Number(f.get(key)) : undefined;
              update((s) => ({
                ...s,
                daily: [
                  ...s.daily,
                  {
                    id: uid(),
                    date: day,
                    steps,
                    hr: optional("hr"),
                    moveKcal: optional("moveKcal"),
                    exerciseMin: optional("exerciseMin"),
                    standHours: optional("standHours"),
                    sleepHours: optional("sleepHours"),
                    source: "manual",
                    measuredAt: new Date().toISOString(),
                    note: String(f.get("note")),
                    raw: {
                      source: "manual",
                      measuredAt: new Date().toISOString(),
                    },
                  },
                ],
              }));
              setModal(null);
              setToast("Dnevni zapis shranjen.");
            }}
          >
            <label>
              Datum
              <input
                name="date"
                type="date"
                defaultValue={localDate()}
                required
                max={localDate()}
              />
            </label>
            <label>
              Koraki
              <input type="number" name="steps" min="0" step="1" />
            </label>
            <div className="field-grid">
              <label>
                Srčni utrip (meritev / min)
                <input name="hr" type="number" min="20" max="250" />
              </label>
              <label>
                Aktivna energija (kcal)
                <input name="moveKcal" type="number" min="0" step="1" />
              </label>
              <label>
                Vadba (min)
                <input name="exerciseMin" type="number" min="0" step="1" />
              </label>
              <label>
                Stanje (ure)
                <input
                  name="standHours"
                  type="number"
                  min="0"
                  max="24"
                  step="1"
                />
              </label>
              <label>
                Spanje (ure)
                <input
                  name="sleepHours"
                  type="number"
                  min="0"
                  max="24"
                  step="0.1"
                />
              </label>
            </div>
            <p>
              Neizpolnjena polja ostanejo neznana. Srčni utrip ni samodejno
              utrip v mirovanju.
            </p>
            <label>
              Opomba
              <textarea name="note" />
            </label>
            <button className="button" type="submit">
              Shrani zapis
            </button>
          </form>
        </Modal>
      )}
      {modal === "import" && (
        <Modal
          title="Uvoz zgodovine Pulse"
          close={() => {
            setModal(null);
            setPreview(undefined);
            setImportError("");
          }}
        >
          {importError ? (
            <>
              <div className="notice danger">{importError}</div>
              <Button secondary onClick={() => fileRef.current?.click()}>
                Izberi drugo datoteko
              </Button>
            </>
          ) : preview ? (
            <>
              <p>
                Predogled dejanske datoteke. Podatki bodo shranjeni samo v tej
                napravi.
              </p>
              <div className="import-stats">
                {Object.entries({
                  Treningi: preview.stats.workouts,
                  Serije: preview.stats.sets,
                  "Opravljene serije": preview.stats.done,
                  Vaje: preview.stats.exercises,
                  "Meritve teže": preview.stats.weight,
                  "Meritve pasu": preview.stats.waist,
                  "Dnevni zapisi": preview.stats.daily,
                  Kardio: preview.stats.cardio,
                }).map(([k, v]) => (
                  <div key={k}>
                    <strong>{v}</strong>
                    <span>{k}</span>
                  </div>
                ))}
              </div>
              <div className="notice">
                <Info size={18} />
                <span>
                  {preview.duplicates} nespremenjenih zapisov bo preskočenih.{" "}
                  {preview.conflicts.length} konfliktov.
                </span>
              </div>
              {preview.conflicts.map((c) => (
                <label className="check-label" key={c.id}>
                  <input
                    type="checkbox"
                    checked={replacements.includes(c.id)}
                    onChange={(e) =>
                      setReplacements(
                        e.target.checked
                          ? [...replacements, c.id]
                          : replacements.filter((id) => id !== c.id),
                      )
                    }
                  />
                  Zamenjaj spremenjeni zapis: {c.label} (sicer ohrani
                  trenutnega)
                </label>
              ))}
              <details open>
                <summary>Opozorila in preverjanje</summary>
                <ul className="warning-list">
                  {preview.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </details>
              <div className="actions">
                <Button
                  onClick={() => {
                    update((s) => applyPulse(s, preview, replacements));
                    setModal(null);
                    setPreview(undefined);
                    setToast(
                      "Uvoz končan. Oglej si zgodovino in potrdi osebni profil.",
                    );
                  }}
                >
                  Potrdi uvoz <Check size={17} />
                </Button>
                <Button secondary onClick={() => fileRef.current?.click()}>
                  Druga datoteka
                </Button>
              </div>
            </>
          ) : (
            <>
              <p>
                Izberi pulse-zgodovina.json. Prikazali bomo predogled pred
                uvozom.
              </p>
              <Button onClick={() => fileRef.current?.click()}>
                Izberi datoteko
              </Button>
            </>
          )}
        </Modal>
      )}
      {restore && (
        <Modal
          title="Obnovitev varnostne kopije"
          close={() => setRestore(undefined)}
        >
          <p>
            Kopija vsebuje {restore.workouts.length} treningov in{" "}
            {restore.measurements.length} meritev. Obnovitev bo zamenjala vse
            trenutne lokalne podatke, vključno z aktivnim treningom.
          </p>
          <div className="notice">
            <Info size={18} />
            <span>
              Pred obnovitvijo izvozi trenutno kopijo. Ta korak ne združi
              podatkov.
            </span>
          </div>
          <div className="actions">
            <Button secondary onClick={download}>
              Izvozi trenutno kopijo
            </Button>
            <Button
              onClick={() => {
                update(() => restore);
                setRestore(undefined);
                setToast("Varnostna kopija obnovljena.");
              }}
            >
              Zamenjaj in obnovi
            </Button>
          </div>
        </Modal>
      )}
      {templateOpen && state.templates.find((t) => t.id === templateOpen) && (
        <Modal
          title="Uredi predlogo treninga"
          close={() => setTemplateOpen(undefined)}
        >
          <TemplateEditor
            template={state.templates.find((t) => t.id === templateOpen)!}
            state={state}
            change={(t) =>
              update((s) => ({
                ...s,
                templates: s.templates.map((a) => (a.id === t.id ? t : a)),
              }))
            }
            remove={() => {
              if (confirm("Odstrani predlogo? Zgodovina ostane shranjena.")) {
                update((s) => ({
                  ...s,
                  templates: s.templates.filter((t) => t.id !== templateOpen),
                }));
                setTemplateOpen(undefined);
              }
            }}
          />
          <Button onClick={() => setTemplateOpen(undefined)}>
            Končano <Check size={16} />
          </Button>
        </Modal>
      )}
    </div>
  );
}
function MeasurementForm({
  kind,
  value,
  save,
  remove,
}: {
  kind: "weight" | "waist";
  value?: Measurement;
  save: (m: Measurement) => void;
  remove?: () => void;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        save({
          ...value,
          id: value?.id ?? uid(),
          date: String(f.get("date")),
          value: Number(f.get("value")),
          kind,
          source: value?.source ?? "manual",
          measuredAt: value?.measuredAt ?? new Date().toISOString(),
          modifiedAt: new Date().toISOString(),
        });
      }}
    >
      <p>Vnesi dejansko izmerjeno vrednost. Datum lahko spremeniš.</p>
      <div className="field-grid">
        <label>
          {kind === "weight" ? "Teža (kg)" : "Obseg (cm)"}
          <input
            type="number"
            name="value"
            autoFocus
            min="1"
            max={kind === "weight" ? 600 : 400}
            step="0.1"
            inputMode="decimal"
            required
            defaultValue={value?.value}
          />
        </label>
        <label>
          Datum meritve
          <input
            type="date"
            name="date"
            defaultValue={value?.date ?? localDate()}
            max={localDate()}
            required
          />
        </label>
      </div>
      <div className="actions">
        <button className="button" type="submit">
          Shrani meritev <Check size={17} />
        </button>
        {remove && (
          <Button
            secondary
            onClick={() => {
              if (confirm("Izbriši to meritev?")) remove();
            }}
          >
            <Trash2 size={16} /> Izbriši
          </Button>
        )}
      </div>
    </form>
  );
}
function ProfileForm({
  profile: p,
  save,
}: {
  profile: Profile;
  save: (p: Profile) => void;
}) {
  const [schedule, setSchedule] = useState(p.schedule);
  const [days, setDays] = useState(p.days);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (schedule === "days" && !days.length) {
          alert("Izberi vsaj en dan treninga.");
          return;
        }
        const f = new FormData(e.currentTarget);
        const optional = (k: string) =>
          f.get(k) ? Number(f.get(k)) : undefined;
        save({
          ...p,
          name: String(f.get("name")),
          goal: String(f.get("goal")),
          time: Number(f.get("time")),
          equipment: String(f.get("equipment")),
          experience: String(f.get("experience")),
          limitations: String(f.get("limitations")),
          age: optional("age"),
          heightCm: optional("height"),
          targetWeight: optional("target"),
          weeklyGoal: optional("weekly"),
          schedule,
          days,
          confirmed: true,
        });
      }}
    >
      <p>
        Potrdi profil, nato bo Moj trener pripravil trening glede na tvojo
        opremo, razpoložljivi čas in počutje.
      </p>
      <label>
        Kako te kličemo?
        <input
          name="name"
          defaultValue={p.name}
          maxLength={60}
          placeholder="Tvoje ime"
        />
      </label>
      <label>
        Cilj
        <select name="goal" defaultValue={p.goal} required>
          <option value="" disabled>
            Izberi svoj cilj
          </option>
          <option>Hujšanje in ohranjanje moči</option>
          <option>Izboljšanje moči</option>
          <option>Splošna telesna pripravljenost</option>
        </select>
      </label>
      <div className="field-grid">
        <label>
          Starost
          <input
            name="age"
            type="number"
            min="16"
            max="110"
            defaultValue={p.age}
          />
        </label>
        <label>
          Višina (cm)
          <input
            name="height"
            type="number"
            min="100"
            max="250"
            step="0.1"
            defaultValue={p.heightCm}
          />
        </label>
        <label>
          Čas na trening (min)
          <input
            name="time"
            type="number"
            min="10"
            max="240"
            step="5"
            required
            defaultValue={p.time}
          />
        </label>
        <label>
          Treningi na teden (neobvezno)
          <input
            name="weekly"
            type="number"
            min="1"
            max="7"
            defaultValue={p.weeklyGoal}
          />
        </label>
        <label>
          Ciljna teža (kg, neobvezno)
          <input
            name="target"
            type="number"
            min="30"
            max="400"
            step="0.1"
            defaultValue={p.targetWeight}
          />
        </label>
      </div>
      {p.weightKg && (
        <p className="notice">
          Uvožen profil: {num(p.weightKg)} kg in {num(p.waistCm ?? 0)} cm brez
          datuma. To nista novi meritvi.
        </p>
      )}
      <label>
        Razpoložljiva oprema
        <input
          name="equipment"
          required
          defaultValue={p.equipment}
          placeholder="Npr. fitnes, palica, ročke, naprave"
        />
      </label>
      <label>
        Izkušnje
        <select name="experience" required defaultValue={p.experience}>
          <option value="" disabled>
            Izberi
          </option>
          <option>Začetnik</option>
          <option>Redno treniram</option>
          <option>Izkušen</option>
        </select>
      </label>
      <label>
        Omejitve, poškodbe in posebnosti
        <textarea
          name="limitations"
          required
          defaultValue={p.limitations}
          placeholder="Opiši omejitve ali vpiši »Brez znanih omejitev«"
        />
      </label>
      <label>
        Razpored
        <select
          value={schedule}
          onChange={(e) => setSchedule(e.target.value as Profile["schedule"])}
        >
          <option value="flexible">
            Prilagodljivo zaporedje brez fiksnih dni
          </option>
          <option value="days">Izbrani dnevi v tednu</option>
        </select>
      </label>
      {schedule === "days" && (
        <div className="day-picker">
          {["Pon", "Tor", "Sre", "Čet", "Pet", "Sob", "Ned"].map((d, i) => (
            <button
              type="button"
              key={d}
              className={days.includes(i) ? "active" : ""}
              onClick={() =>
                setDays(
                  days.includes(i) ? days.filter((a) => a !== i) : [...days, i],
                )
              }
            >
              {d}
            </button>
          ))}
        </div>
      )}
      <label className="check-label">
        <input type="checkbox" required />
        Potrjujem, da so podatki in omejitve pravilni.
      </label>
      <button className="button" type="submit">
        Potrdi profil <Check size={17} />
      </button>
    </form>
  );
}
function ExerciseConfig({
  e,
  change,
}: {
  e: Exercise;
  change: (e: Exercise) => void;
}) {
  return (
    <details className="exercise-config">
      <summary>
        Nastavitve vaje in načrta <Settings size={14} />
      </summary>
      <div className="field-grid">
        <label>
          Ime vaje
          <input
            value={e.name}
            onChange={(v) => change({ ...e, name: v.target.value })}
          />
        </label>
        <label>
          Način obremenitve
          <select
            value={e.mode}
            onChange={(v) =>
              change({
                ...e,
                mode: v.target.value as Exercise["mode"],
                confirmed: false,
              })
            }
          >
            {Object.entries(modes).map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Točna oprema / naprava
          <input
            value={e.equipment}
            onChange={(v) =>
              change({ ...e, equipment: v.target.value, confirmed: false })
            }
            placeholder="Neznana, dokler je ne potrdiš"
          />
        </label>
        <label>
          Najmanjši korak (kg)
          <input
            type="number"
            min="0.1"
            step="0.1"
            value={e.increment}
            onChange={(v) =>
              change({
                ...e,
                increment: Math.max(0.1, +v.target.value),
                confirmed: false,
              })
            }
          />
        </label>
        <label>
          Spodnja meja ponovitev
          <input
            type="number"
            min="1"
            max={e.maxReps}
            value={e.minReps}
            onChange={(v) =>
              change({
                ...e,
                minReps: Math.max(1, Math.min(e.maxReps, +v.target.value)),
                confirmed: false,
              })
            }
          />
        </label>
        <label>
          Zgornja meja ponovitev
          <input
            type="number"
            min={e.minReps}
            max="100"
            value={e.maxReps}
            onChange={(v) =>
              change({
                ...e,
                maxReps: Math.max(e.minReps, +v.target.value),
                confirmed: false,
              })
            }
          />
        </label>
        <label>
          Počitek (sekunde)
          <input
            type="number"
            min="0"
            max="900"
            step="5"
            value={e.rest}
            onChange={(v) =>
              change({ ...e, rest: Math.max(0, +v.target.value) })
            }
          />
        </label>
      </div>
      <label className="check-label">
        <input
          type="checkbox"
          checked={e.confirmed}
          disabled={e.mode === "unknown" || !e.equipment.trim()}
          onChange={(v) => change({ ...e, confirmed: v.target.checked })}
        />
        Potrjujem opremo, način beleženja, razpon in korak obremenitve.
      </label>
      <small>
        Za zgodovino ne ugibaj načina obremenitve ali vrste serij. Primerjajo se
        le ista identiteta, način in oprema.
      </small>
    </details>
  );
}
function AddExercise({
  state,
  add,
}: {
  state: State;
  add: (e: Exercise) => void;
}) {
  const [name, setName] = useState("");
  const [selected, setSelected] = useState("");
  const pool = [
    ...new Map(
      [
        ...state.workouts.flatMap((w) => w.exercises),
        ...state.templates.flatMap((t) => t.exercises),
      ].map((e) => [e.id, e]),
    ).values(),
  ];
  return (
    <div className="add-exercise">
      <ExerciseLibraryButton
        state={state}
        onChoose={add}
        label="Izberi iz knjižnice vaj"
      />
      <div className="field-grid">
        <label>
          Obstoječa vaja
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            <option value="">Izberi iz svoje zbirke</option>
            {pool.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Ali nova vaja
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ime nove vaje"
            maxLength={100}
          />
        </label>
      </div>
      <div className="actions">
        <Button
          secondary
          disabled={!name.trim() && !selected}
          onClick={() => {
            const e = pool.find((e) => e.id === selected);
            add(
              e && !name.trim() ? plannedExercise(e) : newExercise(name.trim()),
            );
            setName("");
            setSelected("");
          }}
        >
          <Plus size={16} /> Dodaj vajo
        </Button>
        <Button
          secondary
          onClick={() => {
            const e = newExercise(name.trim() || "Kardio");
            add({
              ...e,
              cardio: true,
              sets: [{ ...emptySet(), weight: 0, reps: 20 }],
            });
            setName("");
          }}
        >
          <Activity size={16} /> Dodaj kardio
        </Button>
      </div>
    </div>
  );
}
function TemplateEditor({
  template: t,
  state,
  change,
  remove,
}: {
  template: Template;
  state: State;
  change: (t: Template) => void;
  remove: () => void;
}) {
  function setExercise(i: number, e: Exercise) {
    change({ ...t, exercises: t.exercises.map((x, j) => (i === j ? e : x)) });
  }
  return (
    <>
      <label>
        Ime treninga
        <input
          value={t.name}
          onChange={(e) => change({ ...t, name: e.target.value })}
        />
      </label>
      {t.exercises.map((e, i) => (
        <div className="template-exercise" key={i}>
          <div className="section-title">
            <h3>
              {i + 1}. {e.name}
              {e.cardio ? " · kardio" : ""}
            </h3>
            <button
              className="icon-button"
              aria-label="Odstrani vajo"
              onClick={() =>
                change({
                  ...t,
                  exercises: t.exercises.filter((_, j) => i !== j),
                })
              }
            >
              <Trash2 size={16} />
            </button>
          </div>
          {e.cardio ? (
            <p>Trajanje (minute) se vnese med treningom.</p>
          ) : (
            <>
              <label>
                Število načrtovanih serij
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={e.sets.length}
                  onChange={(v) => {
                    const n = Math.min(12, Math.max(1, +v.target.value));
                    setExercise(i, {
                      ...e,
                      sets: Array.from(
                        { length: n },
                        (_, k) => e.sets[k] ?? emptySet(),
                      ),
                    });
                  }}
                />
              </label>
              <ExerciseConfig e={e} change={(v) => setExercise(i, v)} />
            </>
          )}
        </div>
      ))}
      <AddExercise
        state={state}
        add={(e) => change({ ...t, exercises: [...t.exercises, e] })}
      />
      <div className="actions">
        <Button secondary onClick={remove}>
          <Trash2 size={16} /> Odstrani predlogo
        </Button>
      </div>
    </>
  );
}
function WorkoutEditor({
  workout: w,
  state,
  onChange,
  onDone,
  historical = false,
  onReplaceDevice,
}: {
  onReplaceDevice?: (index: number, id: string, permanent: boolean) => void;
  workout: Workout;
  state: State;
  onChange: (w: Workout) => void;
  onDone?: (rest: number) => void;
  historical?: boolean;
}) {
  const [replace, setReplace] = useState<number>();
  function change(i: number, e: Exercise) {
    onChange(reconcileExercise(w, i, e));
  }
  return (
    <div className="workout-editor">
      {w.exercises.map((e, i) => {
        const last = lastExercise(
          { ...state, workouts: state.workouts.filter((x) => x.id !== w.id) },
          e,
        );
        const proposed = suggestion(
          { ...state, workouts: state.workouts.filter((x) => x.id !== w.id) },
          e,
        );
        return (
          <section className="panel exercise-card" key={`${e.id}-${i}`}>
            <div className="section-title">
              <div className="exercise-title">
                <span className="exercise-number">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <h2>{e.name}</h2>
                  <span className="subtle">
                    {e.cardio ? "Kardio · minute" : modes[e.mode]}
                    {e.equipment ? ` · ${e.equipment}` : ""}
                  </span>
                </div>
              </div>
              <button
                className="text-button"
                onClick={() => setReplace(replace === i ? undefined : i)}
              >
                Zamenjaj
              </button>
            </div>
            {!historical && onReplaceDevice && (
              <BusyDevice
                state={state}
                index={i}
                move={() => {
                  const rows = [...w.exercises];
                  const item = rows.splice(i, 1)[0];
                  onChange({ ...w, exercises: [...rows, item] });
                }}
                replace={(id, permanent) => onReplaceDevice(i, id, permanent)}
              />
            )}
            {replace === i && (
              <div className="notice replace-box">
                <p>
                  Zamenjava ustvari nove prazne serije. Prejšnje obremenitve se
                  ne prenesejo.
                </p>
                <AddExercise
                  state={state}
                  add={(v) => {
                    onChange(
                      replacementWorkout(w, i, {
                        ...v,
                        sets: v.sets.map(() => ({
                          ...emptySet(),
                          weight: 0,
                          loadPending: true,
                        })),
                      }),
                    );
                    setReplace(undefined);
                  }}
                />
                <button
                  className="text-button"
                  onClick={() => {
                    if (
                      confirm("Odstrani vajo in njene serije iz tega treninga?")
                    )
                      onChange({
                        ...w,
                        exercises: w.exercises.filter((_, j) => i !== j),
                      });
                  }}
                >
                  Odstrani vajo
                </button>
              </div>
            )}
            {!e.cardio && (
              <>
                <div className="previous-result">
                  <History size={15} />
                  <span>
                    {last
                      ? `Zadnji primerljivi · ${dateLabel(last.date, true)}: ${last.exercise.sets
                          .filter((s) => s.done)
                          .map((s) => `${num(s.weight)} × ${s.reps}`)
                          .join(" / ")}`
                      : "Ni prejšnjega primerljivega opravljenega rezultata."}
                  </span>
                  {last && !historical && (
                    <button
                      className="text-button"
                      onClick={() => {
                        const previous = last.exercise.sets.filter(
                          (s) => s.done,
                        );
                        change(i, {
                          ...e,
                          sets: e.sets.map((s, j) => {
                            const p = previous[j];
                            return p && !s.done
                              ? {
                                  ...s,
                                  weight: p.weight,
                                  reps: p.reps,
                                  loadPending: false,
                                }
                              : s;
                          }),
                        });
                      }}
                    >
                      Kopiraj vrednosti
                    </button>
                  )}
                </div>
                {!historical && !e.coach && (
                  <details className="suggestion">
                    <summary>
                      <Zap size={16} /> Predlog naslednje serije{" "}
                      <ChevronDown size={14} />
                    </summary>
                    <strong>
                      {num(proposed.weight)} kg × {proposed.reps}
                    </strong>
                    <p>{proposed.reason}</p>
                    <small>Podlaga: {proposed.basis}</small>
                    {proposed.canApply && (
                      <Button
                        secondary
                        onClick={() =>
                          change(i, {
                            ...e,
                            sets: e.sets.map((s) =>
                              s.done
                                ? s
                                : {
                                    ...s,
                                    weight: proposed.weight,
                                    reps: proposed.reps,
                                  },
                            ),
                          })
                        }
                      >
                        Uporabi v nepotrjenih serijah
                      </Button>
                    )}
                  </details>
                )}
              </>
            )}
            {e.coach && (
              <CoachExerciseInfo
                e={e}
                state={state}
                change={(v) => change(i, v)}
              />
            )}
            <div className="sets-table">
              <div className="sets-header">
                <span>Serija</span>
                <span>{e.cardio ? "Vrsta" : "Vrsta"}</span>
                <span>{e.cardio ? "—" : "kg"}</span>
                <span>{e.cardio ? "Minute" : "Pon."}</span>
                <span>
                  RIR{" "}
                  <span title="Koliko ponovitev bi še lahko naredil">ⓘ</span>
                </span>
                <span>✓</span>
              </div>
              {e.sets.map((s, j) => (
                <div
                  key={s.id}
                  className={`set-row ${s.done ? "set-done" : ""}`}
                >
                  <span className="set-number">{j + 1}</span>
                  <select
                    aria-label={`Vrsta serije ${j + 1} ${e.name}`}
                    disabled={e.cardio}
                    value={s.kind}
                    onChange={(v) =>
                      change(i, {
                        ...e,
                        sets: e.sets.map((a, k) =>
                          j === k
                            ? { ...a, kind: v.target.value as typeof s.kind }
                            : a,
                        ),
                      })
                    }
                  >
                    <option value="unknown">Neznana</option>
                    <option value="warmup">Ogrevanje</option>
                    <option value="work">Delovna</option>
                  </select>
                  <input
                    aria-label={`Teža serije ${j + 1} ${e.name}`}
                    disabled={e.cardio}
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.1"
                    value={s.loadPending ? "" : s.weight}
                    placeholder={s.loadPending ? "Vnesi kg" : ""}
                    onChange={(v) =>
                      change(i, {
                        ...e,
                        sets: e.sets.map((a, k) =>
                          j === k
                            ? {
                                ...a,
                                weight: Math.max(0, +v.target.value),
                                loadPending: v.target.value === "",
                              }
                            : a,
                        ),
                      })
                    }
                  />
                  <input
                    aria-label={`${e.cardio ? "Minute" : "Ponovitve"} serije ${j + 1} ${e.name}`}
                    type="number"
                    inputMode="numeric"
                    min="0"
                    max="999"
                    step="1"
                    value={s.reps}
                    onChange={(v) =>
                      change(i, {
                        ...e,
                        sets: e.sets.map((a, k) =>
                          j === k
                            ? {
                                ...a,
                                reps: Math.min(
                                  999,
                                  Math.max(0, Math.floor(+v.target.value)),
                                ),
                              }
                            : a,
                        ),
                      })
                    }
                  />
                  <input
                    aria-label={`RIR serije ${j + 1} ${e.name}: koliko ponovitev bi še lahko naredil`}
                    disabled={e.cardio}
                    placeholder="—"
                    type="number"
                    inputMode="numeric"
                    min="0"
                    max="10"
                    value={s.rir ?? ""}
                    onChange={(v) =>
                      change(i, {
                        ...e,
                        sets: e.sets.map((a, k) =>
                          j === k
                            ? {
                                ...a,
                                rir:
                                  v.target.value === ""
                                    ? undefined
                                    : Math.min(
                                        10,
                                        Math.max(0, +v.target.value),
                                      ),
                              }
                            : a,
                        ),
                      })
                    }
                  />
                  <button
                    aria-label={`${s.done ? "Razveljavi" : "Potrdi"} serijo ${j + 1} ${e.name}`}
                    aria-pressed={s.done}
                    title={
                      s.loadPending
                        ? "Najprej vnesi dejansko obremenitev"
                        : "Potrdi ali razveljavi serijo"
                    }
                    disabled={!s.done && !!s.loadPending}
                    className="set-check"
                    onClick={() => {
                      if (!s.done && (s.reps <= 0 || s.loadPending)) return;
                      change(i, {
                        ...e,
                        sets: e.sets.map((a, k) =>
                          j === k ? { ...a, done: !a.done } : a,
                        ),
                      });
                      if (!s.done) onDone?.(e.rest);
                    }}
                  >
                    <Check size={18} />
                  </button>
                </div>
              ))}
            </div>
            <div className="set-actions">
              <button
                className="text-button"
                onClick={() =>
                  change(i, {
                    ...e,
                    sets: [
                      ...e.sets,
                      { ...emptySet(), loadPending: !!e.coach, weight: 0 },
                    ],
                  })
                }
              >
                <Plus size={15} /> Dodaj serijo
              </button>
              {e.sets.length > 1 && (
                <button
                  className="text-button subtle"
                  onClick={() => {
                    if (
                      e.sets.at(-1)!.done &&
                      !confirm("Odstrani zadnjo opravljeno serijo?")
                    )
                      return;
                    change(i, { ...e, sets: e.sets.slice(0, -1) });
                  }}
                >
                  Odstrani zadnjo
                </button>
              )}
              <span>
                {e.sets.filter((s) => s.done).length} / {e.sets.length}{" "}
                opravljeno
              </span>
            </div>
            {!e.cardio && (
              <>
                <p className="rir-help">
                  RIR (neobvezno): koliko ponovitev bi še lahko naredil. Prazno
                  pomeni neznano.
                </p>
                <ExerciseConfig e={e} change={(v) => change(i, v)} />
              </>
            )}
            <div className="exercise-notes">
              <label>
                Opomba
                <input
                  placeholder="Počutje, izvedba, posebnosti …"
                  value={e.note}
                  onChange={(v) => change(i, { ...e, note: v.target.value })}
                />
              </label>
              <label
                className={`check-label pain-check ${e.pain ? "pain-active" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={e.pain}
                  onChange={(v) => change(i, { ...e, pain: v.target.checked })}
                />
                Bolečina
              </label>
            </div>
            {e.pain && (
              <div className="notice danger">
                Ne povečuj obremenitve. Vajo prilagodi ali prekini; pri
                vztrajajoči bolečini se posvetuj s strokovnjakom.
              </div>
            )}
          </section>
        );
      })}
      <section className="panel">
        <h3>Prilagodi trening</h3>
        <AddExercise
          state={state}
          add={(e) => onChange({ ...w, exercises: [...w.exercises, e] })}
        />
      </section>
    </div>
  );
}
function Strength({ state }: { state: State }) {
  const all = records(state);
  const options = [
    ...new Map(
      all.map((r) => [exerciseComparisonKey(r.exercise), r.exercise]),
    ).entries(),
  ];
  const [selected, setSelected] = useState("");
  const key = selected || options[0]?.[0];
  const exercise = options.find(([id]) => id === key)?.[1];
  const matches = all.filter((r) => exerciseComparisonKey(r.exercise) === key);
  const [repCount, setRepCount] = useState(10);
  const [load, setLoad] = useState(0);
  const events = exercise
    ? state.workouts
        .flatMap((w) =>
          w.exercises
            .filter(
              (e) =>
                exerciseComparisonKey(e) === exerciseComparisonKey(exercise),
            )
            .flatMap((e) =>
              e.sets.filter((s) => s.done).map((s) => ({ ...s, date: w.date })),
            ),
        )
        .sort((a, b) => a.date.localeCompare(b.date))
    : [];
  const known =
    !!exercise &&
    exercise.mode !== "unknown" &&
    !!exercise.equipment.trim() &&
    (!exercise.coach || (!!exercise.coach.rom && !!exercise.coach.convention));
  return (
    <>
      {options.length ? (
        <>
          <section className="panel">
            <label>
              Vaja in zabeležena oprema
              <select value={key} onChange={(e) => setSelected(e.target.value)}>
                {options.map(([id, e]) => (
                  <option key={id} value={id}>
                    {e.name} · {modes[e.mode]}{" "}
                    {e.equipment && `· ${e.equipment}`}{" "}
                    {e.coach?.rom && `· ${e.coach.rom}`}{" "}
                    {e.coach?.convention &&
                      `· zapis ${e.coach.convention === "stack" ? "na skladu" : e.coach.convention === "one-side" ? "ene strani" : "dodanih plošč"}`}
                  </option>
                ))}
              </select>
            </label>
            {!known && (
              <div className="notice">
                <Info size={17} />
                <span>
                  Način obremenitve, naprava ali izvedba še niso potrjeni.
                  Rezultati so prikazani kot shranjeni, primerljivost opreme ni
                  potrjena. Ocene 1RM ne izračunavamo.
                </span>
              </div>
            )}
            <h2>
              {known
                ? "Osebni rekordi po številu ponovitev"
                : "Največje shranjene vrednosti po ponovitvah"}
            </h2>
            <p>
              Izračunano iz opravljenih serij. Pri neznani opremi to ni potrjena
              primerjava moči. Pri asistenci je manj pomoči boljši rezultat.
            </p>
            {matches
              .sort((a, b) => a.reps - b.reps)
              .map((r) => (
                <div key={r.reps} className="data-row">
                  <span>{r.reps} ponovitev</span>
                  <strong>{num(r.weight)} kg</strong>
                  <span>{dateLabel(r.date, true)}</span>
                </div>
              ))}
          </section>
          {known && (
            <div className="two-col">
              <section className="panel">
                <h2>Teža pri istih ponovitvah</h2>
                <label>
                  Število ponovitev
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={repCount}
                    onChange={(e) => setRepCount(+e.target.value)}
                  />
                </label>
                <Chart
                  rows={events
                    .filter((e) => e.reps === repCount)
                    .map((s) => ({ date: s.date, value: s.weight }))}
                  unit="kg"
                />
              </section>
              <section className="panel">
                <h2>Ponovitve pri isti teži</h2>
                <label>
                  Teža (kg)
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={load}
                    onChange={(e) => setLoad(+e.target.value)}
                  />
                </label>
                <Chart
                  rows={events
                    .filter((e) => e.weight === load)
                    .map((s) => ({ date: s.date, value: s.reps }))}
                  unit="pon."
                />
              </section>
            </div>
          )}
          <section className="panel">
            <h2>Opravljene serije</h2>
            {[...events].reverse().map((e, i) => (
              <div className="data-row" key={i}>
                <span>{dateLabel(e.date, true)}</span>
                <strong>
                  {num(e.weight)} kg × {e.reps}
                </strong>
                <span className="subtle">
                  {e.kind === "unknown"
                    ? "Vrsta neznana"
                    : e.kind === "work"
                      ? "Delovna"
                      : "Ogrevanje"}
                </span>
              </div>
            ))}
          </section>
        </>
      ) : (
        <section className="panel">
          <Empty
            title="Moč se gradi s ponavljanjem"
            detail="Ko boš opravil prve serije ali uvozil zgodovino, bodo tukaj rekordi in primerjave vaj."
          />
        </section>
      )}
    </>
  );
}
