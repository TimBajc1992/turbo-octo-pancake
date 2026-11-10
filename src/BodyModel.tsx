import { useEffect, useRef, useState } from "react";
import { bodyPoint } from "./body-shape";
import poster from "./assets/body-anatomy.webp";
import type { BodyScene } from "./exercise3d/body-scene";

type Shape = { ratio?: number; weightRatio: number; comparison: boolean };

/** Same measured deformation for a lightweight poster when WebGL is unavailable. */
function drawPoster(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  shape: Shape,
) {
  const scale = Math.min(devicePixelRatio || 1, 1.5);
  const width = Math.round(360 * scale),
    height = Math.round(450 * scale);
  canvas.width = width;
  canvas.height = height;
  const source = document.createElement("canvas");
  source.width = width;
  source.height = height;
  const context = source.getContext("2d", { willReadFrequently: true })!;
  context.drawImage(image, 0, 0, width, height);
  const pixels = context.getImageData(0, 0, width, height),
    out = context.createImageData(width, height);
  for (let y = 0; y < height; y++) {
    let left =
      bodyPoint(0, y / scale, shape.ratio, shape.weightRatio)[0] * scale;
    for (let x = 0; x < width; x++) {
      const right =
        bodyPoint(
          (x + 1) / scale,
          y / scale,
          shape.ratio,
          shape.weightRatio,
        )[0] * scale;
      for (
        let target = Math.max(0, Math.ceil(left));
        target < Math.min(width, Math.ceil(right));
        target++
      ) {
        const index = (y * width + target) * 4;
        const blend = Math.max(
          0,
          Math.min(1, (target + 0.5 - left) / (right - left || 1)),
        );
        const a = (y * width + x) * 4,
          b = (y * width + Math.min(width - 1, x + 1)) * 4;
        for (let channel = 0; channel < 4; channel++)
          out.data[index + channel] =
            pixels.data[a + channel] * (1 - blend) +
            pixels.data[b + channel] * blend;
      }
      left = right;
    }
  }
  const target = canvas.getContext("2d")!;
  if (shape.comparison) {
    const baseline = context.createImageData(width, height);
    for (let p = 0; p < baseline.data.length; p += 4) {
      baseline.data[p] = 195;
      baseline.data[p + 1] = 208;
      baseline.data[p + 2] = 218;
      baseline.data[p + 3] = pixels.data[p + 3] * 0.13;
    }
    target.putImageData(baseline, 0, 0);
  } else target.clearRect(0, 0, width, height);
  context.putImageData(out, 0, 0);
  target.drawImage(source, 0, 0);
  canvas.dataset.ready = "true";
}

export function BodyModel({
  ratio,
  weightRatio = 1,
  comparison = false,
  interactive = false,
}: {
  ratio?: number;
  weightRatio?: number;
  comparison?: boolean;
  interactive?: boolean;
}) {
  const root = useRef<HTMLDivElement>(null),
    mount = useRef<HTMLDivElement>(null),
    posterCanvas = useRef<HTMLCanvasElement>(null);
  const viewer = useRef<BodyScene | undefined>(undefined),
    image = useRef<HTMLImageElement | undefined>(undefined);
  const latest = useRef<Shape>({ ratio, weightRatio, comparison });
  latest.current = { ratio, weightRatio, comparison };
  const [seen, setSeen] = useState(false),
    [ready, setReady] = useState(false),
    [failed, setFailed] = useState(false);
  useEffect(() => {
    let stopped = false;
    const asset = new Image();
    asset.onload = () => {
      if (!stopped && posterCanvas.current) {
        image.current = asset;
        drawPoster(posterCanvas.current, asset, latest.current);
      }
    };
    asset.src = poster;
    return () => {
      stopped = true;
    };
  }, []);
  useEffect(() => {
    if (!ready && image.current && posterCanvas.current)
      drawPoster(posterCanvas.current, image.current, latest.current);
  }, [ratio, weightRatio, comparison, ready]);
  useEffect(() => {
    if (!interactive) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true);
          observer.disconnect();
        }
      },
      { rootMargin: "150px" },
    );
    if (root.current) observer.observe(root.current);
    return () => observer.disconnect();
  }, [interactive]);
  useEffect(() => {
    if (!seen) return;
    let stopped = false;
    let scene: BodyScene | undefined;
    const start = async () => {
      try {
        const { BodyScene } = await import("./exercise3d/body-scene");
        if (stopped || !mount.current) return;
        scene = new BodyScene(mount.current, true);
        viewer.current = scene;
        scene.renderer.domElement.style.touchAction = "pan-y";
        scene.renderer.domElement.addEventListener(
          "webglcontextlost",
          () => {
            if (!stopped) {
              setReady(false);
              setFailed(true);
            }
          },
          { once: true },
        );
        await scene.ready;
        if (stopped) return;
        const p = latest.current;
        scene.setBodyShape(p.ratio, p.weightRatio, p.comparison);
        setReady(true);
      } catch {
        if (!stopped) setFailed(true);
      }
    };
    void start();
    return () => {
      stopped = true;
      viewer.current = undefined;
      scene?.dispose();
    };
  }, [seen]);
  useEffect(() => {
    viewer.current?.setBodyShape(ratio, weightRatio, comparison);
  }, [ratio, weightRatio, comparison]);
  return (
    <div
      ref={root}
      className="body-current body-model"
      role="img"
      aria-label="Anatomski model sprememb telesne teže in pasu. S puščicama levo in desno zavrtiš pogled."
      tabIndex={ready ? 0 : undefined}
      data-renderer={
        ready && !failed
          ? "webgl"
          : failed || !interactive
            ? "poster"
            : "loading"
      }
      data-waist-ratio={(ratio ?? 1).toFixed(4)}
      data-weight-ratio={weightRatio.toFixed(4)}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
          e.preventDefault();
          viewer.current?.rotate(
            e.key === "ArrowLeft" ? -Math.PI / 6 : Math.PI / 6,
          );
        }
      }}
    >
      <canvas
        ref={posterCanvas}
        className="body-model-poster"
        aria-hidden="true"
        style={{ opacity: ready && !failed ? 0 : 1 }}
      />
      <div
        ref={mount}
        className="body-model-mount"
        aria-hidden="true"
        style={{ opacity: ready && !failed ? 1 : 0 }}
      />
      {ready && !failed && (
        <span className="body-model-hint">Povleci za pogled</span>
      )}
    </div>
  );
}
