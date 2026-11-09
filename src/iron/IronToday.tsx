import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  Check,
  ChevronRight,
  Clock,
  Dumbbell,
  Footprints,
  Leaf,
  Play,
  ShieldCheck,
  Trophy,
} from "lucide-react";
import { dateLabel, localDate, weekStart, type State } from "../model";
import {
  trainingLabels,
  trainingDescriptions,
  nextTrainingSuggestion,
} from "../training";
import { BodyMotif } from "../BodyMotif";
import { bodyProgress } from "../BodyProgress";
import { HabitRows, habitCount } from "./IronHabits";

export function IronMark({ size = 48 }: { size?: number }) {
  return (
    <svg
      className="iron-mark"
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
    >
      <rect width="48" height="48" rx="11" fill="currentColor" />
      <path
        d="M9 35V13h6l9 13 9-13h6v22h-7V25l-8 11-8-11v10H9Z"
        fill="#F2EEE6"
      />
      <path
        d="M33 39h6"
        stroke="#7D8FA8"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
export function IronToday({
  state,
  update,
  train,
  habits,
  history,
  daily,
}: {
  state: State;
  update: (fn: (s: State) => State) => Promise<void>;
  train: () => void;
  habits: () => void;
  history: () => void;
  daily: () => void;
}) {
  const today = localDate(),
    week = weekStart(),
    suggestion = nextTrainingSuggestion(state);
  const body = bodyProgress(state.measurements);
  const workouts = state.workouts.filter(
    (w) =>
      w.date >= week &&
      w.date <= today &&
      w.exercises.some((e) => e.sets.some((s) => s.done)),
  );
  const currentHabits = state.habits?.find((h) => h.date === today);
  const steps = state.daily
    .filter((d) => d.date === today && d.steps !== undefined)
    .at(-1)?.steps;
  const last = [...state.workouts].sort(
    (a, b) =>
      b.date.localeCompare(a.date) || (b.finishedAt ?? 0) - (a.finishedAt ?? 0),
  )[0];
  return (
    <>
      <div className="iron-page-heading">
        <div>
          <span className="eyebrow">
            {new Date(today + "T12:00:00").toLocaleDateString("sl-SI", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </span>
          <h1>
            Živjo{state.profile.name ? `, ${state.profile.name}` : ""}
            <em>.</em>
          </h1>
          <p>Vsak majhen korak nekaj spremeni.</p>
        </div>
        <button className="iron-date" onClick={habits}>
          <CalendarDays size={18} />
          {dateLabel(today)}
        </button>
      </div>
      <section className="iron-hero">
        <div className="iron-hero-copy">
          <span className="eyebrow">
            <i />
            {state.active ? "TVOJ SET TE ČAKA" : "OSEBNI DNEVNIK GIBANJA"}
          </span>
          <h2>
            {state.active ? "Nadaljuj" : "V tvojem"}
            <br />
            <em>{state.active ? "svoj set." : "ritmu."}</em>
          </h2>
          <p>
            {state.active
              ? "Tvoja vadba je shranjena. Nadaljuj tam, kjer si ostal."
              : "Ne potrebuješ popolnega tedna. Samo naslednji korak."}
          </p>
          <button className="button" onClick={train}>
            {state.active ? "Nadaljuj vadbo" : "Sestavi svoj trening"}
            <ArrowRight size={18} />
          </button>
        </div>
        <BodyMotif
          ratio={body.hasWaistComparison ? body.ratio : undefined}
          weightRatio={body.weightRatio}
        />
        {(state.profile.weeklyGoal ?? 0) > 0 &&
          workouts.length >= (state.profile.weeklyGoal ?? 0) && (
            <div className="achievement-stamp" role="status">
              <Trophy size={22} />
              <span>
                TEDENSKI CILJ
                <br />
                DOSEŽEN
              </span>
            </div>
          )}
        <span className="iron-hero-edge">MOČ / NAVADE / ŽIVLJENJE</span>
      </section>
      <div className="iron-stats">
        <div>
          <span className="iron-stat-icon">
            <Dumbbell size={21} />
          </span>
          <section>
            <small>VADBE TA TEDEN</small>
            <strong>
              {workouts.length}
              {state.profile.weeklyGoal ? (
                <span> / {state.profile.weeklyGoal}</span>
              ) : null}
            </strong>
            <p>Tvoj tedenski ritem</p>
          </section>
        </div>
        <div>
          <span className="iron-stat-icon">
            <Leaf size={21} />
          </span>
          <section>
            <small>DANAŠNJE NAVADE</small>
            <strong>
              {habitCount(currentHabits)}
              <span> / 4</span>
            </strong>
            <p>Majhne stvari štejejo</p>
          </section>
        </div>
        <button onClick={daily}>
          <span className="iron-stat-icon">
            <Footprints size={21} />
          </span>
          <section>
            <small>KORAKI DANES</small>
            <strong>
              {steps !== undefined ? steps.toLocaleString("sl-SI") : "—"}
            </strong>
            <p>{steps !== undefined ? "Zabeleženo" : "Dodaj dnevni vnos"} ↗</p>
          </section>
        </button>
      </div>
      <div className="iron-dashboard">
        <section className="iron-next panel">
          <div className="iron-section-head">
            <div>
              <span className="eyebrow">TVOJ NASLEDNJI KORAK</span>
              <h2>
                {state.active
                  ? state.active.name
                  : trainingLabels[suggestion.type]}
              </h2>
            </div>
            <span className="iron-tag">
              {state.active ? "V TEKU" : "PREDLOG"}
            </span>
          </div>
          <div className="iron-next-title">
            <span aria-hidden="true">
              {state.active
                ? "↗"
                : suggestion.type === "push"
                  ? "P"
                  : suggestion.type === "pull"
                    ? "P"
                    : suggestion.type === "legs"
                      ? "L"
                      : "F"}
              <i>+</i>
            </span>
            <div>
              <small>
                {state.active
                  ? "VSE SE SPROTI SHRANJUJE"
                  : "VRSTO PREDLAGAMO. VAJE IZBEREŠ TI."}
              </small>
              <h3>
                {state.active
                  ? "En set naenkrat."
                  : trainingDescriptions[suggestion.type]}
              </h3>
              <p>
                <Dumbbell size={15} />
                {state.active
                  ? `${state.active.exercises.length} vaj`
                  : "Izberi vaje iz knjižnice"}
                <Clock size={15} />
                {state.profile.time} min na voljo
              </p>
            </div>
          </div>
          <div className="iron-next-bottom">
            <span>Pripravljeno tudi brez povezave</span>
            <button onClick={train} aria-label="Odpri pripravo vadbe">
              <Play size={18} fill="currentColor" />
            </button>
          </div>
        </section>
        <section className="iron-today-habits">
          <div className="iron-section-head">
            <h2>Drobne navade</h2>
            <button className="text-button" onClick={habits}>
              Vse
              <ArrowUpRight size={15} />
            </button>
          </div>
          <HabitRows state={state} update={update} date={today} />
        </section>
        <section className="iron-week panel">
          <div className="iron-section-head">
            <h2>Tvoj teden</h2>
            <small>{dateLabel(week)} – danes</small>
          </div>
          <div className="iron-week-days">
            {Array.from({ length: 7 }, (_, i) => {
              const d = new Date(week + "T12:00:00");
              d.setDate(d.getDate() + i);
              const date = localDate(d),
                done = workouts.some((w) => w.date === date);
              return (
                <div key={date}>
                  <small>
                    {d.toLocaleDateString("sl-SI", { weekday: "short" })}
                  </small>
                  <span
                    className={`${done ? "done" : ""} ${date === today ? "today" : ""}`}
                  >
                    {done ? <Check size={19} /> : d.getDate()}
                  </span>
                  <small>{done ? "opravljeno" : "·"}</small>
                </div>
              );
            })}
          </div>
          <p>Treniraj v svojem ritmu. Tudi počitek je del napredka.</p>
        </section>
        <section className="iron-history-teaser panel">
          <span className="eyebrow">TVOJA ZGODOVINA GRE S TABO</span>
          <h2>
            {last
              ? "Prejšnji koraki. Nova forma."
              : "Tukaj se začne tvoja zgodba."}
          </h2>
          <p>
            {last
              ? `${last.name} · ${dateLabel(last.date, true)}. Vseh ${state.workouts.length} shranjenih treningov je v tvoji zgodovini.`
              : "Obstoječa zgodovina Težišča na tej napravi se odpre v novem videzu. Kopijo z druge naprave lahko obnoviš v nastavitvah."}
          </p>
          <button className="button secondary" onClick={history}>
            Poglej zgodovino
            <ArrowRight size={17} />
          </button>
        </section>
      </div>
      <p className="iron-footnote">
        <ShieldCheck size={15} />
        Tvoja zgodovina in povezava za sinhronizacijo ostaneta v obstoječi
        shrambi.
      </p>
    </>
  );
}
