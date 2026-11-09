import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { House, Activity, Dumbbell, ArrowUpRight, Trophy } from "lucide-react";
import { IronToday, IronMark } from "../../src/iron/IronToday";
import { BodyProgress } from "../../src/BodyProgress";
import { FocusWorkout } from "../../src/FocusWorkout";
import { localDate, type State } from "../../src/model";
import demo from "./demo.json";
import "../../src/style.css";
import "../../src/iron.css";
import "../../src/midnight-bone.css";
import "./preview.css";

function Preview() {
  const [tab, setTab] = useState("today"),
    [state, setState] = useState<State>(demo as State),
    [message, setMessage] = useState("");
  const nav = [
    { id: "today", label: "Danes", Icon: House },
    { id: "progress", label: "Napredek", Icon: Activity },
    { id: "training", label: "Med vadbo", Icon: Dumbbell },
  ];
  const go = (id: string) => {
    setTab(id);
    window.scrollTo(0, 0);
  };
  const update = async (fn: (s: State) => State) => setState(fn);
  return (
    <div className={`iron-shell design-preview design-preview-${tab}`}>
      <aside className="design-preview-banner">
        <span>OBLIKOVNI PREDOGLED · VZORČNI PODATKI</span>
        <button
          onClick={() => {
            const today = localDate();
            setState((s) => ({
              ...s,
              profile: { ...s.profile, weeklyGoal: 1 },
              workouts: [
                ...s.workouts,
                { ...s.workouts[0], id: "preview-achievement", date: today },
              ],
            }));
            go("today");
          }}
        >
          <Trophy size={13} /> Primer dosežka
        </button>
      </aside>
      <aside className="iron-rail">
        <IronMark size={44} />
        <span className="iron-rail-caption">TVOJ PROSTOR</span>
        <nav aria-label="Predogled">
          {nav.map((n, i) => (
            <button
              key={n.id}
              className={tab === n.id ? "active" : ""}
              onClick={() => go(n.id)}
            >
              <small aria-hidden="true">0{i + 1}</small>
              <n.Icon size={21} />
              <span>{n.label}</span>
            </button>
          ))}
        </nav>
        <div className="iron-rail-bottom">
          <strong>
            V tvojem
            <br />
            <em>ritmu.</em>
          </strong>
          <span>MOČ & FORMA</span>
        </div>
      </aside>
      <div className="iron-main">
        <header className="iron-header">
          <a
            href="#"
            className="iron-wordmark"
            onClick={(e) => {
              e.preventDefault();
              go("today");
            }}
          >
            MOČ <i>&</i> FORMA <span>↗</span>
          </a>
          <div className="iron-header-right">
            <span className="iron-storage">
              <i />
              Polnočna modra in kost
            </span>
          </div>
        </header>
        <main className="iron-page">
          {tab === "today" ? (
            <IronToday
              state={{ ...state, active: undefined }}
              update={update}
              train={() => go("training")}
              habits={() =>
                setMessage("Navade lahko preizkusiš neposredno na tej strani.")
              }
              history={() =>
                setMessage("To je oblikovni predogled z vzorčnimi podatki.")
              }
              daily={() => go("progress")}
            />
          ) : tab === "progress" ? (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">TVOJI KORAKI SKOZI ČAS</span>
                  <h1>
                    Napredek <span>v tvojem ritmu.</span>
                  </h1>
                  <p>Obrisi, meritve in majhne spremembe.</p>
                </div>
              </div>
              <BodyProgress
                measurements={state.measurements}
                measure={() =>
                  setMessage("Predogled meritev uporablja vzorčne podatke.")
                }
              />
            </>
          ) : (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">EN SET NAENKRAT</span>
                  <h1>
                    Tvoja <span>vadba.</span>
                  </h1>
                  <p>Manj tipkanja. Več prostora za gibanje.</p>
                </div>
              </div>
              <FocusWorkout
                state={state}
                workout={state.active!}
                onChange={(w) => setState((s) => ({ ...s, active: w }))}
                onDone={() =>
                  setMessage("Serija je potrjena v vzorčnem treningu.")
                }
                onReplaceDevice={() => {}}
                showDetails={() => setMessage("Pregleduješ vzorčni trening.")}
              />
            </>
          )}
          {message && (
            <p className="notice" role="status" style={{ marginTop: 20 }}>
              {message}
              <button className="text-button" onClick={() => setMessage("")}>
                Zapri
              </button>
            </p>
          )}
        </main>
        <nav className="iron-dock" aria-label="Mobilni predogled">
          {nav.map((n) => (
            <button
              key={n.id}
              className={tab === n.id ? "active" : ""}
              onClick={() => go(n.id)}
            >
              <n.Icon size={20} />
              <span>{n.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<Preview />);
