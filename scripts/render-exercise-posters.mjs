import { chromium } from "@playwright/test";
import { access, mkdir, writeFile } from "node:fs/promises";
// Run against the local Vite dev server. Only the read-only renderer is opened.
const origin = process.env.POSTER_ORIGIN || "http://127.0.0.1:4181";
const browser = await chromium.launch({
  executablePath:
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || "/usr/bin/chromium",
  args: [
    "--no-sandbox",
    "--enable-unsafe-swiftshader",
    "--use-angle=swiftshader",
    "--disable-dev-shm-usage",
  ],
});
try {
  const page = await browser.newPage({
    viewport: { width: 480, height: 480 },
    deviceScaleFactor: 1,
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(
    process.env.POSTER_URL || `${origin}/previews/exercise-3d/render.html`,
  );
  await page.waitForFunction(
    () => window.renderExercise,
    {},
    { timeout: 30000 },
  );
  const exercises = await page.evaluate(() => window.exercises);
  if (process.env.POSTER_WITH_BODY === "1") {
    const body = await page.evaluate(() => window.renderBodyPoster());
    await writeFile("src/assets/body-anatomy.webp", Buffer.from(body,"base64"));
    console.log("Rendered the matching anatomical body poster.");
  }
  await mkdir("src/assets/exercise-previews", { recursive: true });
  let rendered = 0;
  for (const [i, exercise] of exercises.entries()) {
    if (
      process.env.POSTER_FAMILIES &&
      !process.env.POSTER_FAMILIES.split(",").includes(exercise.family)
    )
      continue;
    if (
      process.env.POSTER_SKIP_EXISTING === "1" &&
      (await access(`src/assets/exercise-previews/${exercise.id}.webp`).then(
        () => true,
        () => false,
      ))
    )
      continue;
    const { data, progress } = await page.evaluate(async (id) => {
      const data = await window.renderExercise(id);
      return { data, progress: window.lastPosterDebug.progress };
    }, exercise.id);
    if (Math.abs(progress - 0.45) > 1e-8)
      throw Error(`Wrong poster phase: ${exercise.id} (${progress})`);
    await writeFile(
      `src/assets/exercise-previews/${exercise.id}.webp`,
      Buffer.from(data, "base64"),
    );
    rendered++;
    if (i % 20 === 0)
      console.log(`${i + 1}/${exercises.length}: ${exercise.name}`);
  }
  if (errors.length) throw Error(errors.join("\n"));
  await mkdir("work", { recursive: true });
  await writeFile(
    "work/poster-catalog.json",
    JSON.stringify(exercises, null, 2),
  );
  console.log(
    `Rendered ${rendered} posters; catalogue contains ${exercises.length} specified movements.`,
  );
} finally {
  await browser.close();
}
