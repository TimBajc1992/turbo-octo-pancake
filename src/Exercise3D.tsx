import { useEffect, useRef, useState } from "react";
import { LoaderCircle, Pause, Play, RotateCcw, RotateCw } from "lucide-react";
import type { Candidate } from "./exerciseCatalog";
import type { MuscleRegion } from "./exerciseAnatomy";
import { exercisePoster } from "./exercise-preview-assets";
import type { ExerciseScene } from "./exercise3d/scene";

export function Exercise3D({
  exercise,
  selected,
}: {
  exercise: Candidate;
  selected?: MuscleRegion;
}) {
  const stage = useRef<HTMLDivElement>(null),
    mount = useRef<HTMLDivElement>(null);
  const scene = useRef<ExerciseScene | undefined>(undefined);
  const [ready, setReady] = useState(false),
    [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(false),
    [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const phase = useRef(0),
    selectedRef = useRef(selected);
  selectedRef.current = selected;
  useEffect(() => {
    let stopped = false;
    setReady(false);
    setFailed(false);
    setPlaying(false);
    setProgress(0);
    phase.current = 0;
    if (!visible) return;
    const start = async () => {
      try {
        const { ExerciseScene } = await import("./exercise3d/scene");
        if (stopped || !mount.current) return;
        const viewer = new ExerciseScene(mount.current, exercise);
        scene.current = viewer;
        await viewer.ready;
        if (stopped) return;
        viewer.highlight(selectedRef.current);
        setReady(true);
      } catch {
        if (!stopped) setFailed(true);
      }
    };
    void start();
    return () => {
      stopped = true;
      scene.current?.dispose();
      scene.current = undefined;
    };
  }, [exercise.id, visible]);
  useEffect(() => {
    scene.current?.highlight(selected);
  }, [selected]);
  useEffect(() => {
    const hidden = () => {
      if (document.hidden) setPlaying(false);
    };
    document.addEventListener("visibilitychange", hidden);
    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(entry.isIntersecting);
        if (!entry.isIntersecting) setPlaying(false);
      },
      { rootMargin: "100px" },
    );
    if (stage.current) observer.observe(stage.current);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", hidden);
    };
  }, []);
  useEffect(() => {
    if (!playing || !ready) return;
    let frame = 0,
      previous = performance.now(),
      lastDraw = 0;
    const animate = (time: number) => {
      phase.current += (Math.min(time - previous, 250) / 4400) * Math.PI * 2;
      previous = time;
      if (time - lastDraw > 32) {
        const p = (1 - Math.cos(phase.current)) / 2;
        scene.current?.setProgress(p);
        setProgress(p);
        lastDraw = time;
      }
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [playing, ready]);
  const position = (p: number) => {
    setPlaying(false);
    phase.current = Math.acos(1 - 2 * p);
    setProgress(p);
    scene.current?.setProgress(p);
  };
  return (
    <div className="exercise-3d">
      <div
        className="exercise-3d-stage"
        ref={stage}
        role="img"
        aria-label={`${exercise.name}: 3D prikaz izvedbe z označenimi mišicami`}
        data-renderer={ready ? "webgl" : failed ? "poster" : "loading"}
      >
        {!ready && exercisePoster(exercise.id) && (
          <img
            className="exercise-3d-poster"
            src={exercisePoster(exercise.id)}
            alt=""
            aria-hidden="true"
          />
        )}
        <div
          className="exercise-3d-mount"
          ref={mount}
          style={{ opacity: ready ? 1 : 0 }}
        />
        <span className="exercise-3d-badge">
          3D · {failed ? "PREDOGLED" : playing ? "GIB V TEKU" : "IZVEDBA VAJE"}
        </span>
        {!ready && !failed && (
          <span className="exercise-3d-loading" role="status">
            <LoaderCircle size={17} /> Pripravljam 3D …
          </span>
        )}
        {ready && <span className="exercise-3d-hint">Povleci za zasuk</span>}
      </div>
      <div className="movement-controls">
        <button
          type="button"
          className="visual-play"
          disabled={!ready}
          aria-label={
            playing ? "Ustavi prikaz gibanja" : "Predvajaj prikaz gibanja"
          }
          onClick={() => setPlaying(!playing)}
        >
          {playing ? <Pause size={18} /> : <Play size={18} />}
          {playing ? "Premor" : "Predvajaj"}
        </button>
        <button
          type="button"
          className="visual-reset"
          disabled={!ready}
          aria-label="Vrni gib na začetek"
          onClick={() => position(0)}
        >
          <RotateCcw size={18} />
        </button>
        <label>
          <span className="sr-only">Položaj giba</span>
          <input
            type="range"
            min="0"
            max="100"
            value={Math.round(progress * 100)}
            disabled={!ready}
            onChange={(event) => position(Number(event.target.value) / 100)}
          />
        </label>
      </div>
      <div className="movement-positions">
        <button type="button" disabled={!ready} onClick={() => position(0)}>
          01 · Začetek
        </button>
        <button type="button" disabled={!ready} onClick={() => position(1)}>
          02 · Zaključek
        </button>
      </div>
      <div className="exercise-3d-camera">
        <button
          type="button"
          disabled={!ready}
          aria-label="Zavrti 3D prikaz levo"
          onClick={() => scene.current?.rotate(-Math.PI / 4)}
        >
          <RotateCcw size={16} /> Levo
        </button>
        <button
          type="button"
          disabled={!ready}
          aria-label="Zavrti 3D prikaz desno"
          onClick={() => scene.current?.rotate(Math.PI / 4)}
        >
          Desno <RotateCw size={16} />
        </button>
      </div>
      {failed && (
        <p className="visual-caption">
          Prikazan je shranjeni predogled. Animacija v tem brskalniku ni na
          voljo; mišice si lahko ogledaš tudi v zavihku Mišice.
        </p>
      )}
    </div>
  );
}
