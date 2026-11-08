import { test, expect, type Page } from "@playwright/test";
import {
  readWorkoutState,
  seedWorkout,
  workoutFixture,
} from "./workout-fixture";

async function simulate(
  page: Page,
  stalled:
    | "none"
    | "lookup"
    | "update"
    | "update-promise"
    | "update-silent"
    | "lookup-ready",
) {
  const source = workoutFixture();
  await seedWorkout(page, source);
  await page.addInitScript((stalled) => {
    if (!location.pathname.endsWith("/posodobi.html")) return;
    const never = () => new Promise(() => {});
    const registration = Object.assign(new EventTarget(), {
      scope: new URL("./", location.href).href,
      installing: null as (EventTarget & { state: string }) | null,
      update: () => {
        sessionStorage.setItem("synthetic-update-count", "1");
        if (stalled === "update-promise" || stalled === "update-silent") {
          queueMicrotask(() => {
            registration.installing = Object.assign(new EventTarget(), {
              state: "installed",
            });
            if (stalled !== "update-silent")
              registration.dispatchEvent(new Event("updatefound"));
          });
          return never();
        }
        return stalled === "update" ? never() : Promise.resolve();
      },
    });
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: {
        controller: stalled === "lookup-ready" ? { state: "activated" } : null,
        ready: Promise.resolve(registration),
        getRegistration: () =>
          stalled === "lookup" || stalled === "lookup-ready"
            ? never()
            : Promise.resolve(registration),
        register: () => {
          throw Error("Existing registration must be reused");
        },
      },
    });
  }, stalled);
  return source;
}

test("update helper reuses its existing registration without rewriting any workout", async ({
  page,
}) => {
  const source = await simulate(page, "none");
  const app = page.url();
  await page.goto("./posodobi.html");
  await page
    .getByRole("button", { name: "Posodobi in odpri TEŽIŠČE", exact: true })
    .click();
  await expect(page).toHaveURL(app);
  await expect(page.getByRole("heading", { name: /Tvoj tempo/ })).toBeVisible();
  expect(
    await page.evaluate(() => sessionStorage.getItem("synthetic-update-count")),
  ).toBe("1");
  expect(await readWorkoutState(page)).toEqual(source);
});

for (const stage of ["update-silent", "lookup-ready"] as const)
  test(`Safari ${stage} can use native worker state without changing saved data`, async ({
    page,
  }) => {
    const source = await simulate(page, stage);
    const app = page.url();
    await page.goto("./posodobi.html");
    await page
      .getByRole("button", { name: "Posodobi in odpri TEŽIŠČE", exact: true })
      .click();
    await expect(page).toHaveURL(app);
    await expect(
      page.getByRole("heading", { name: /Tvoj tempo/ }),
    ).toBeVisible();
    expect(await readWorkoutState(page)).toEqual(source);
  });

test("a worker installation progresses even when Safari leaves its update promise pending", async ({
  page,
}) => {
  const source = await simulate(page, "update-promise");
  const app = page.url();
  await page.goto("./posodobi.html");
  await page
    .getByRole("button", { name: "Posodobi in odpri TEŽIŠČE", exact: true })
    .click();
  await expect(page).toHaveURL(app);
  await expect(page.getByRole("heading", { name: /Tvoj tempo/ })).toBeVisible();
  expect(await readWorkoutState(page)).toEqual(source);
});

for (const stage of ["lookup", "update"] as const)
  test(`a stalled Safari ${stage} returns a retryable message and preserves all data`, async ({
    page,
  }) => {
    const source = await simulate(page, stage);
    await page.clock.install();
    await page.goto("./posodobi.html");
    const update = page.getByRole("button", {
      name: "Posodobi in odpri TEŽIŠČE",
      exact: true,
    });
    await update.click();
    await page.clock.fastForward(31000);
    await expect(update).toBeEnabled();
    await expect(page.getByRole("status")).toContainText(
      "Preverjanje traja predolgo",
    );
    expect(await readWorkoutState(page)).toEqual(source);
  });
