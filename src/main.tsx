import React, { lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
// Load the shared theme after the selected interface's CSS. Otherwise Vite can
// hoist it before the modern interface stylesheet and undo its final overrides.
const Iron = lazy(async () => {
  const entry = await import("./IronEntry");
  await import("./midnight-bone.css");
  return entry;
});
const Legacy = lazy(async () => {
  const entry = await import("./LegacyEntry");
  await import("./midnight-bone.css");
  return entry;
});
const legacy = localStorage.getItem("moc-forma:interface") === "legacy";
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Suspense
      fallback={<p style={{ padding: 30 }}>Pripravljam tvoj prostor …</p>}
    >
      {legacy ? <Legacy /> : <Iron />}
    </Suspense>
  </React.StrictMode>,
);
if (import.meta.env.PROD && "serviceWorker" in navigator)
  window.addEventListener("load", () => {
    // A controlled page already has a registration; PwaUpdate checks it once.
    // Starting another registration job during an offline reload can make
    // WebKit raise a native access-control error despite a working cached app.
    if (navigator.serviceWorker.controller || !navigator.onLine) return;
    void navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`, {
        scope: import.meta.env.BASE_URL,
        updateViaCache: "none",
      })
      .catch(console.error);
  });
