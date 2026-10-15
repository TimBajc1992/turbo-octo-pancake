import { useEffect, useRef, useState } from "react";
export function PwaUpdate({
  saved,
  manual = false,
}: {
  saved: boolean;
  manual?: boolean;
}) {
  const [waiting, setWaiting] = useState<ServiceWorker>();
  const [info, setInfo] = useState("");
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
  ) : manual ? (
    <>
      <button
        className="button secondary"
        onClick={async () => {
          setInfo("Preverjam posodobitev …");
          try {
            const registration =
              await navigator.serviceWorker?.getRegistration();
            if (!registration) {
              setInfo(
                "Osveži stran, ko si povezan z internetom. Lokalnih podatkov ne briši.",
              );
              return;
            }
            await registration.update();
            if (registration.waiting) setWaiting(registration.waiting);
            setInfo(
              registration.installing
                ? "Nova različica se pripravlja. Ko je pripravljena, izberi Posodobi."
                : "Preverjanje je končano. Razpoložljiva posodobitev se prikaže z gumbom Posodobi.",
            );
          } catch {
            setInfo(
              "Posodobitve ni mogoče preveriti. Preveri internet in poskusi znova; podatki ostanejo shranjeni.",
            );
          }
        }}
      >
        Preveri posodobitev aplikacije
      </button>
      <p role="status">{info}</p>
    </>
  ) : null;
}
