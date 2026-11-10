import { expect, test, type Page } from "@playwright/test";
import { localDate, type State } from "../src/model";
import { readWorkoutState, workoutFixture } from "./workout-fixture";
import { bodyPoint, bodyShapeGLSL } from "../src/body-shape";

async function seed(page: Page, source: State) {
  await page.goto("./posodobi.html");
  await page.evaluate(async (source) => {
    const db = await new Promise<IDBDatabase>((resolve) => {
      const r = indexedDB.open("tezisce", 1);
      r.onupgradeneeded = () => r.result.createObjectStore("state");
      r.onsuccess = () => resolve(r.result);
    });
    await new Promise<void>((resolve) => {
      const tx = db.transaction("state", "readwrite");
      tx.objectStore("state").put(source, "current");
      tx.objectStore("state").put(
        { opaque: "palette-device-key" },
        "device:sync",
      );
      tx.oncomplete = () => resolve();
    });
    db.close();
  }, source);
  await page.goto("./");
  await expect(page.getByRole("heading", { name: /Živjo/ })).toBeVisible();
}
const nav = (page: Page) =>
  page
    .locator("nav:visible")
    .getByRole("button", { name: "Napredek", exact: true });

test("the measurement outline uses recorded waist data and retains the detailed chart and all existing records", async ({
  page,
}) => {
  test.setTimeout(90000);
  const s = workoutFixture(false);
  s.measurements = [
    { id: "first-waist", date: "2026-09-01", kind: "waist", value: 100 },
    { id: "last-waist", date: "2026-11-01", kind: "waist", value: 90 },
    { id: "weight", date: "2026-11-01", kind: "weight", value: 84.8 },
  ];
  await seed(page, s);
  await expect(page.locator(".achievement-stamp")).toHaveCount(0);
  await nav(page).click();
  await expect(page.locator(".body-current")).toHaveAttribute(
    "data-waist-ratio",
    "0.9000",
  );
  await expect(page.locator(".body-progress")).toContainText("84,8");
  await expect(page.locator(".body-progress")).toContainText("90");
  await page.getByRole("button", { name: "Obseg pasu", exact: true }).click();
  await page.getByText("Podroben graf meritev", { exact: false }).click();
  await expect(page.getByRole("img", { name: /Graf:.*100 cm/ })).toBeVisible();
  expect(await readWorkoutState(page)).toEqual(s);
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 950 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  const colours = await page.evaluate(() => ({
    background: getComputedStyle(document.body).backgroundColor,
    ink: getComputedStyle(document.body).color,
  }));
  expect(colours).toEqual({
    background: "rgb(242, 238, 230)",
    ink: "rgb(31, 42, 68)",
  });
  expect(
    await page
      .getByRole("button", { name: "Dodaj meritev", exact: true })
      .evaluate((e) => ({
        background: getComputedStyle(e).backgroundColor,
        color: getComputedStyle(e).color,
      })),
  ).toEqual({ background: "rgb(31, 42, 68)", color: "rgb(242, 238, 230)" });
  expect(
    await page
      .locator(".body-measure strong")
      .first()
      .evaluate((e) => getComputedStyle(e).fontFamily),
  ).toContain("IBM Plex Mono");
});

test("gold marks an earned weekly goal while navigating remains read-only", async ({
  page,
}) => {
  const s = workoutFixture(false);
  s.profile.weeklyGoal = 1;
  s.workouts[0].date = localDate();
  await seed(page, s);
  await expect(page.locator(".achievement-stamp")).toBeVisible();
  await expect(page.locator(".achievement-stamp")).toContainText("DOSEŽEN");
  expect(
    await page
      .locator(".achievement-stamp")
      .evaluate((e) => getComputedStyle(e).borderTopColor),
  ).toBe("rgb(176, 141, 87)");
  await nav(page).click();
  await expect(page.locator(".achievement-stamp")).toHaveCount(0);
  expect(await readWorkoutState(page)).toEqual(s);
});

test("GPU body deformation agrees with the measured poster on both sides and preserves head and feet", async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.goto("./posodobi.html");
  const points = [
    [-0.13, 1.1, 0.14],
    [0.13, 1.1, 0.14],
    [-0.3, 1.25, 0.06],
    [0.3, 1.25, 0.06],
    [0.04, 1.7, 0.12],
    [-0.2, 0.03, 0.1],
  ];
  const shapes = [
    { waist: undefined, weight: 0.8 },
    { waist: 0.9, weight: 1.1 },
    { waist: 1.35, weight: 0.56 },
  ];
  const result = await page.evaluate(
    ({ source, points, shapes }) => {
      const gl = document.createElement("canvas").getContext("webgl2");
      if (!gl) return null;
      const compile = (kind: number, text: string) => {
        const s = gl.createShader(kind)!;
        gl.shaderSource(s, text);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
          throw Error(gl.getShaderInfoLog(s) || "Body shader failed");
        return s;
      };
      const vertex = compile(
        gl.VERTEX_SHADER,
        "#version 300 es\nprecision highp float;layout(location=0) in vec3 position;uniform vec3 shape;out vec3 measured;\n" +
          source +
          "\nvoid main(){measured=measuredBody(position,shape);gl_Position=vec4(measured,1.);}",
      );
      const fragment = compile(
        gl.FRAGMENT_SHADER,
        "#version 300 es\nprecision highp float;out vec4 colour;void main(){colour=vec4(0.);}",
      );
      const program = gl.createProgram()!;
      gl.attachShader(program, vertex);
      gl.attachShader(program, fragment);
      gl.transformFeedbackVaryings(program, ["measured"], gl.SEPARATE_ATTRIBS);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS))
        throw Error(gl.getProgramInfoLog(program) || "Body program failed");
      const vao = gl.createVertexArray();
      gl.bindVertexArray(vao);
      const input = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, input);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array(points.flat()),
        gl.STATIC_DRAW,
      );
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
      const output = gl.createBuffer();
      gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER, output);
      gl.bufferData(
        gl.TRANSFORM_FEEDBACK_BUFFER,
        points.length * 3 * 4,
        gl.DYNAMIC_COPY,
      );
      gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, output);
      gl.useProgram(program);
      const frames: number[][] = [];
      for (const shape of shapes) {
        gl.uniform3f(
          gl.getUniformLocation(program, "shape"),
          shape.waist === undefined ? 0 : 1,
          shape.waist ?? 1,
          shape.weight,
        );
        gl.enable(gl.RASTERIZER_DISCARD);
        gl.beginTransformFeedback(gl.POINTS);
        gl.drawArrays(gl.POINTS, 0, points.length);
        gl.endTransformFeedback();
        gl.disable(gl.RASTERIZER_DISCARD);
        const values = new Float32Array(points.length * 3);
        gl.getBufferSubData(gl.TRANSFORM_FEEDBACK_BUFFER, 0, values);
        frames.push(Array.from(values));
      }
      gl.deleteBuffer(input);
      gl.deleteBuffer(output);
      gl.deleteVertexArray(vao);
      gl.deleteProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      return frames;
    },
    { source: bodyShapeGLSL, points, shapes },
  );
  if (result) {
    for (const [index, shape] of shapes.entries())
      for (const [i, [x, y, z]] of points.entries()) {
        const svgX = 180 + (x * 360) / 1.56,
          svgY = ((1.87 - y) * 450) / 1.95;
        const newX = bodyPoint(svgX, svgY, shape.waist, shape.weight)[0];
        const scale = (newX - 180) / (svgX - 180);
        const expected = [x * scale, y, 0.02 + (z - 0.02) * scale];
        for (let axis = 0; axis < 3; axis++) {
          expect(Number.isFinite(result[index][i * 3 + axis])).toBe(true);
          expect(result[index][i * 3 + axis]).toBeCloseTo(expected[axis], 4);
        }
      }
  } else {
    expect(process.env.TEST_BROWSER).toBe("webkit");
    const s = workoutFixture(false);
    await seed(page, s);
    await nav(page).click();
    await expect(page.locator(".body-current")).toHaveAttribute(
      "data-renderer",
      "poster",
      { timeout: 30000 },
    );
    await expect(page.locator(".body-model-poster")).toHaveAttribute(
      "data-ready",
      "true",
    );
    expect(
      (
        await page
          .locator(".body-model-poster")
          .evaluate((c: HTMLCanvasElement) => c.toDataURL())
      ).length,
    ).toBeGreaterThan(10000);
    expect(await readWorkoutState(page)).toEqual(s);
  }
});

test("weight alone changes the same natural silhouette on progress and home without rewriting measurements", async ({
  page,
}) => {
  test.setTimeout(120000);
  const s = workoutFixture(false);
  s.measurements = [
    { id: "initial-weight", date: "2026-09-01", kind: "weight", value: 100 },
    { id: "current-weight", date: "2026-11-01", kind: "weight", value: 80 },
  ];
  await seed(page, s);
  await expect(page.locator(".body-current")).toHaveAttribute(
    "data-weight-ratio",
    "0.8000",
  );
  await nav(page).click();
  await expect(page.locator(".body-current")).toHaveAttribute(
    "data-weight-ratio",
    "0.8000",
  );
  await expect(page.locator(".body-current")).not.toHaveAttribute(
    "data-renderer",
    "loading",
    { timeout: 60000 },
  );
  const pixels = async () => {
    const model = page.locator(".body-current");
    const webgl = (await model.getAttribute("data-renderer")) === "webgl";
    const canvas = model.locator(
      webgl ? ".body-model-mount canvas" : ".body-model-poster",
    );
    if (!webgl) await expect(canvas).toHaveAttribute("data-ready", "true");
    return canvas.evaluate((c: HTMLCanvasElement) => c.toDataURL());
  };
  const current = await pixels();
  await page
    .locator(".body-progress-legend")
    .getByRole("button", { name: "Izhodišče", exact: true })
    .click();
  await expect(page.locator(".body-current")).toHaveAttribute(
    "data-weight-ratio",
    "1.0000",
  );
  await expect.poll(pixels).not.toBe(current);
  expect(await readWorkoutState(page)).toEqual(s);
  await page
    .locator(".body-progress-legend")
    .getByRole("button", { name: "Zdaj", exact: true })
    .click();
  await expect(page.locator(".body-current")).toHaveAttribute(
    "data-weight-ratio",
    "0.8000",
  );
  await expect.poll(pixels).toBe(current);
  await expect(page.locator(".body-progress-note")).toHaveText(
    "Anatomski prikaz ponazarja spremembo telesne teže.",
  );
  expect(await readWorkoutState(page)).toEqual(s);
});
