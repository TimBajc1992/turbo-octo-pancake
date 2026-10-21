import { test, expect } from "@playwright/test";
import {
  readWorkoutState,
  seedWorkout,
  workoutFixture,
} from "./workout-fixture";

test("settings remain tappable below the iPhone status bar after opening and rotating", async ({
  page,
}) => {
  const before = workoutFixture();
  await page.setViewportSize({ width: 390, height: 844 });
  await seedWorkout(page, before);

  // Browser runners have no real iOS status bar. Model its inset and its
  // interception of taps so this reproduces the standalone launch failure.
  await page.evaluate(() => {
    const bar = document.createElement("div");
    bar.id = "simulated-ios-status-bar";
    Object.assign(bar.style, {
      position: "fixed",
      inset: "0 0 auto",
      background: "#191e18",
      zIndex: "2147483647",
    });
    document.body.append(bar);
  });
  for (const { width, height, inset } of [
    { width: 390, height: 844, inset: 59 },
    { width: 390, height: 844, inset: 20 },
    { width: 390, height: 844, inset: 0 },
    { width: 844, height: 390, inset: 0 },
    { width: 390, height: 844, inset: 59 },
  ]) {
    await page.setViewportSize({ width, height });
    await page.evaluate((inset) => {
      document.documentElement.style.setProperty(
        "--safe-area-top",
        `${inset}px`,
      );
      document.getElementById("simulated-ios-status-bar")!.style.height =
        `${inset}px`;
      window.scrollTo(0, 0);
    }, inset);

    const settings = page.getByRole("button", {
      name: "Nastavitve in profil",
      exact: true,
    });
    const box = await settings.boundingBox();
    expect(box!.y).toBeGreaterThanOrEqual(inset);
    expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    if (width <= 700) {
      const brand = await page.locator(".mobile-brand").boundingBox();
      expect(brand!.y).toBeGreaterThanOrEqual(inset);
    }
    await settings.tap();
    await expect(
      page.getByRole("heading", { name: /Nastavitve.*profil/ }),
    ).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, 0));
    await settings.tap();
    await expect(
      page.getByRole("heading", { name: /Tvoj tempo/ }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  expect(await readWorkoutState(page)).toEqual(before);
});

test.use({ hasTouch: true });
