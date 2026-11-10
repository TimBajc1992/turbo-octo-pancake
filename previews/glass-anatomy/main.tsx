import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { BodyProgress } from "../../src/BodyProgress";
import { ExerciseSketch } from "../../src/ExerciseSketch";
import { byId } from "../../src/exerciseCatalog";
import "../../src/style.css";
import "../../src/iron.css";
import "../../src/midnight-bone.css";
import "./preview.css";

function Preview() {
  const [tab, setTab] = useState("progress"),
    [weight, setWeight] = useState(84),
    [waist, setWaist] = useState(90),
    [message, setMessage] = useState("");
  const measurements = [
    {
      id: "start-weight",
      kind: "weight" as const,
      date: "2026-09-01",
      value: 90,
    },
    {
      id: "start-waist",
      kind: "waist" as const,
      date: "2026-09-01",
      value: 100,
    },
    {
      id: "current-weight",
      kind: "weight" as const,
      date: "2026-11-10",
      value: weight,
    },
    {
      id: "current-waist",
      kind: "waist" as const,
      date: "2026-11-10",
      value: waist,
    },
  ];
  return (
    <main className="anatomy-preview">
      <header>
        <strong>MOČ & FORMA ↗</strong>
        <span>
          OBLIKOVNI PREDOGLED
          <br />
          VZORČNI PODATKI
        </span>
      </header>
      <div className="anatomy-intro">
        <span className="eyebrow">TELO. GIBANJE. NAPREDEK.</span>
        <h1>Anatomija v tvojem ritmu.</h1>
        <p>Podroben mišični model pri napredku in izvedbi vaj.</p>
      </div>
      <nav className="anatomy-tabs" aria-label="Izberi predogled">
        {[
          ["progress", "Napredek"],
          ["shoulders", "Ramena"],
          ["chest", "Prsi"],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            aria-pressed={tab === id}
            onClick={() => {
              setTab(id);
              setMessage("");
              window.scrollTo(0, 0);
            }}
          >
            {label}
          </button>
        ))}
      </nav>
      {tab === "progress" ? (
        <>
          <BodyProgress
            measurements={measurements}
            measure={() =>
              setMessage(
                "To je predogled. Vpliv vzorčnih meritev lahko preizkusiš spodaj.",
              )
            }
          />
          <details className="anatomy-simulation">
            <summary>Preizkusi vpliv meritev</summary>
            <p>
              Izhodišče v tem primeru: 90 kg in 100 cm. Drsnika spreminjata samo
              prikazne podatke na tej strani.
            </p>
            <label htmlFor="demo-weight">
              Teža <output>{weight} kg</output>
              <input
                id="demo-weight"
                type="range"
                min="60"
                max="115"
                step=".5"
                value={weight}
                onChange={(e) => setWeight(Number(e.target.value))}
              />
            </label>
            <label htmlFor="demo-waist">
              Obseg pasu <output>{waist} cm</output>
              <input
                id="demo-waist"
                type="range"
                min="75"
                max="120"
                step=".5"
                value={waist}
                onChange={(e) => setWaist(Number(e.target.value))}
              />
            </label>
          </details>
        </>
      ) : (
        <section aria-label="Prikaz vaje">
          <ExerciseSketch
            key={tab}
            exercise={byId(
              tab === "shoulders"
                ? "dumbbell_shoulder_press"
                : "dumbbell_bench_press",
            )!}
          />
        </section>
      )}
      {message && (
        <p role="status" className="notice">
          {message}
        </p>
      )}
      <footer>
        Predogled uporablja vzorčne podatke. Tvoji treningi, meritve in povezava
        naprav ostanejo v obstoječi aplikaciji.
      </footer>
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<Preview />);
