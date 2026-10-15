import { useEffect, useRef, useState } from "react";
export function PwaUpdate({ saved }: { saved: boolean }) {
  const [waiting, setWaiting] = useState<ServiceWorker>();
  const requested = useRef(false);
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let stopped = false;
    let registration: ServiceWorkerRegistration | undefined;
    const sync = () => {
      if (!stopped && registration?.waiting) setWaiting(registration.waiting);
    };
    const update = () => {
      registration?.installing?.addEventListener("statechange", sync);
      sync();
    };
    const reload = () => {
      if (requested.current) location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", reload);
    navigator.serviceWorker.getRegistration().then((r) => {
      if (stopped || !r) return;
      registration = r;
      sync();
      r.addEventListener("updatefound", update);
      r.update().catch(() => {});
    });
    return () => {
      stopped = true;
      registration?.removeEventListener("updatefound", update);
      navigator.serviceWorker.removeEventListener("controllerchange", reload);
    };
  }, []);
  return waiting ? (
    <button
      className="button secondary pwa-update"
      disabled={!saved}
      onClick={() => {
        requested.current = true;
        waiting.postMessage({ type: "SKIP_WAITING" });
      }}
    >
      Nova različica · Posodobi
    </button>
  ) : null;
}
