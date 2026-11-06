import React, { lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
const Iron = lazy(() => import("./IronEntry"));
const Legacy = lazy(() => import("./LegacyEntry"));
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
    void navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`, {
        scope: import.meta.env.BASE_URL,
        updateViaCache: "none",
      })
      .catch(console.error);
  });
