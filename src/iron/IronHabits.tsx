import { useState } from "react";
import { Check, Droplets, Leaf, Moon, Utensils } from "lucide-react";
import { localDate, type HabitDay, type State } from "../model";
type Update = (fn: (s: State) => State) => Promise<void>;
export const habitCount = (h?: HabitDay) =>
  h
    ? Number(h.protein) + Number(h.plants) + Number(h.water) + Number(!!h.sleep)
    : 0;
const habits = [
  {
    key: "protein",
    name: "Beljakovine",
    text: "Vir beljakovin ob obroku.",
    Icon: Utensils,
  },
  {
    key: "plants",
    name: "Zelenjava in sadje",
    text: "Nekaj svežega v dnevu.",
    Icon: Leaf,
  },
  {
    key: "water",
    name: "Trenutek za vodo",
    text: "Majhna navada, velik pomen.",
    Icon: Droplets,
  },
] as const;
export function HabitRows({
  state,
  update,
  date,
}: {
  state: State;
  update: Update;
  date: string;
}) {
  const row = state.habits?.find((h) => h.date === date);
  const set = (patch: Partial<HabitDay>) =>
    void update((s) => {
      const current = s.habits?.find((h) => h.date === date) ?? {
        id: date,
        date,
        protein: false,
        plants: false,
        water: false,
      };
      return {
        ...s,
        habits: [
          ...(s.habits ?? []).filter((h) => h.date !== date),
          { ...current, ...patch },
        ],
      };
    });
  return (
    <div className="iron-habit-rows">
      {habits.map((h) => (
        <div
          className={`iron-habit-row ${row?.[h.key] ? "done" : ""}`}
          key={h.key}
        >
          <span className="iron-stat-icon">
            <h.Icon size={20} />
          </span>
          <div>
            <strong>{h.name}</strong>
            <small>{row?.[h.key] ? "Danes poskrbljeno" : h.text}</small>
          </div>
          <button
            className="iron-habit-check"
            role="checkbox"
            aria-checked={!!row?.[h.key]}
            aria-label={h.name}
            onClick={() => set({ [h.key]: !row?.[h.key] })}
          >
            {row?.[h.key] && <Check size={17} />}
          </button>
        </div>
      ))}
      <div className="iron-habit-row">
        <span className="iron-stat-icon">
          <Moon size={20} />
        </span>
        <div>
          <strong>Spanje</strong>
          <small>
            {row?.sleep ? `${row.sleep} / 5` : "Kako si se naspal?"}
          </small>
        </div>
        <div className="iron-sleep">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              className={row?.sleep === n ? "selected" : ""}
              aria-label={`Spanje ${n} od 5`}
              aria-pressed={row?.sleep === n}
              onClick={() => set({ sleep: row?.sleep === n ? undefined : n })}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
export function IronHabits({
  state,
  update,
}: {
  state: State;
  update: Update;
}) {
  const [date, setDate] = useState(localDate()),
    count = habitCount(state.habits?.find((h) => h.date === date));
  return (
    <>
      <div className="iron-page-heading">
        <div>
          <span className="eyebrow">MAJHNE STVARI ŠTEJEJO</span>
          <h1>
            Tvoje navade<em>.</em>
          </h1>
          <p>Vsak dan priložnost za nekaj dobrega zase.</p>
        </div>
      </div>
      <div className="iron-habits-layout">
        <section className="panel">
          <div className="iron-section-head">
            <h2>Tvoj dan</h2>
            <span className="iron-tag">{count} / 4</span>
          </div>
          <label className="habit-date-label">
            Datum
            <input
              type="date"
              value={date}
              max={localDate()}
              onChange={(e) => e.target.value && setDate(e.target.value)}
            />
          </label>
          <HabitRows state={state} update={update} date={date} />
        </section>
        <aside className="panel iron-habit-note">
          <span className="eyebrow">BREZ PRITISKA</span>
          <h2>
            Dovolj je
            <br />
            <em>naslednji korak.</em>
          </h2>
          <p>
            Ni treba biti popoln. Izberi svoj ritem in opazi, kaj ti dobro dene.
            Vnosi navad ne spreminjajo zgodovine treningov ali meritev.
          </p>
        </aside>
      </div>
    </>
  );
}
