import { useEffect, useRef } from "react";

type V3 = [number, number, number];
const cross = (a: V3, b: V3): V3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const unit = (v: V3): V3 => {
  const length = Math.hypot(...v) || 1;
  return v.map((n) => n / length) as V3;
};
const noise = (n: number) => {
  const value = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return value - Math.floor(value);
};
const patina = (x: number, y: number) => {
  const a = Math.floor(x),
    b = Math.floor(y),
    u = x - a,
    v = y - b;
  const sx = u * u * (3 - 2 * u),
    sy = v * v * (3 - 2 * v);
  const top =
    noise(a * 17 + b * 59) * (1 - sx) + noise((a + 1) * 17 + b * 59) * sx;
  const bottom =
    noise(a * 17 + (b + 1) * 59) * (1 - sx) +
    noise((a + 1) * 17 + (b + 1) * 59) * sx;
  return top * (1 - sy) + bottom * sy;
};

// A lathed cast-iron plate: raised rim, recessed face and an open centre.
// Geometry, patina and lettering are drawn on-device, without images or app data.
export function MotionSculpture() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current!;
    const context = canvas.getContext("2d");
    if (!context) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let yaw = -0.46,
      pitch = 0.32,
      pending = 0,
      disposed = false;
    const segments = 192;
    const profile: [number, number][] = [
      [0.47, -0.18],
      [0.51, -0.25],
      [0.7, -0.25],
      [0.75, -0.16],
      [1.91, -0.16],
      [1.98, -0.25],
      [2.4, -0.25],
      [2.5, -0.15],
      [2.52, -0.04],
      [2.52, 0.15],
      [2.42, 0.27],
      [1.98, 0.27],
      [1.91, 0.17],
      ...Array.from({ length: 12 }, (_, i): [number, number] => [
        1.91 - ((i + 1) * 1.16) / 12,
        0.17,
      ]),
      [0.7, 0.27],
      [0.52, 0.27],
      [0.47, 0.18],
    ];
    const points: V3[][] = Array.from({ length: segments }, (_, i) => {
      const angle = (i / segments) * Math.PI * 2;
      return profile.map(([radius, z]) => [
        radius * Math.cos(angle),
        radius * Math.sin(angle),
        z,
      ]);
    });
    function draw() {
      pending = 0;
      const width = canvas.clientWidth,
        height = canvas.clientHeight;
      if (!width || !height) return;
      const ctx = context!;
      const ratio = Math.min(window.devicePixelRatio || 1, 1.75);
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, width, height);
      const scale = Math.min(width, height) * 0.164;
      const rotate = ([x, y, z]: V3): V3 => {
        const a = x * Math.cos(yaw) + z * Math.sin(yaw),
          b = -x * Math.sin(yaw) + z * Math.cos(yaw);
        const c = y * Math.cos(pitch) - b * Math.sin(pitch),
          d = y * Math.sin(pitch) + b * Math.cos(pitch);
        return [
          a * Math.cos(-0.15) - c * Math.sin(-0.15),
          a * Math.sin(-0.15) + c * Math.cos(-0.15),
          d,
        ];
      };
      const project = ([x, y, z]: V3) => {
        const perspective = 11 / (11 - z);
        return [
          width / 2 + x * scale * perspective,
          height / 2 + y * scale * perspective,
        ] as const;
      };
      const mesh = points.map((row) => row.map(rotate));
      const faces: { vertices: V3[]; z: number; color: string }[] = [];
      const light = unit([-1.2, -1.8, 2.7]);
      for (let i = 0; i < segments; i++)
        for (let j = 0; j < profile.length; j++) {
          const vertices = [
            mesh[i][j],
            mesh[(i + 1) % segments][j],
            mesh[(i + 1) % segments][(j + 1) % profile.length],
            mesh[i][(j + 1) % profile.length],
          ];
          const u = vertices[1].map((v, k) => v - vertices[0][k]) as V3;
          const v = vertices[3].map((v, k) => v - vertices[0][k]) as V3;
          const normal = unit(cross(u, v));
          if (normal[2] < 0) continue;
          const diffuse = Math.max(
            0,
            normal.reduce((sum, n, k) => sum + n * light[k], 0),
          );
          const radius =
            (profile[j][0] + profile[(j + 1) % profile.length][0]) / 2;
          const rim = radius > 1.96 || radius < 0.735;
          const angle = (i / segments) * Math.PI * 2;
          const x = Math.cos(angle) * radius,
            y = Math.sin(angle) * radius;
          const grain = (noise(i * 31 + j) - 0.5) * (rim ? 5 : 4);
          const patch =
            patina(x * 2.2, y * 2.2) * 0.65 +
            patina(x * 6.5 + 11, y * 6.5 - 8) * 0.35;
          const rust = Math.min(
            0.78,
            Math.max(0, patch - 0.53) * (rim ? 3.4 : 2.8),
          );
          const iron = rim ? [147, 155, 158] : [71, 78, 81];
          const shine = Math.pow(diffuse, 18) * (rim ? 0.48 : 0.08);
          const color = iron.map((n, k) => {
            const aged = n * (1 - rust) + [139, 74, 43][k] * rust;
            return Math.round(
              Math.min(
                255,
                Math.max(
                  0,
                  aged * (0.48 + diffuse * 0.64) * (1 - shine) +
                    240 * shine +
                    grain,
                ),
              ),
            );
          });
          faces.push({
            vertices,
            z: vertices.reduce((s, p) => s + p[2], 0) / 4,
            color: `rgb(${color.join(",")})`,
          });
        }
      faces.sort((a, b) => a.z - b.z);
      for (const face of faces) {
        ctx.beginPath();
        face.vertices.forEach((vertex, i) => {
          const [x, y] = project(vertex);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.closePath();
        ctx.fillStyle = face.color;
        ctx.strokeStyle = face.color;
        ctx.lineWidth = 0.65;
        ctx.fill();
        ctx.stroke();
      }
      // Fine, stable casting grain; no animation loop or per-frame randomness.
      for (let i = 0; i < 650; i++) {
        const angle = noise(i + 400) * Math.PI * 2,
          r = Math.sqrt(0.81 ** 2 + noise(i + 1700) * (1.86 ** 2 - 0.81 ** 2));
        const [x, y] = project(
          rotate([r * Math.cos(angle), r * Math.sin(angle), 0.172]),
        );
        ctx.fillStyle = i % 3 ? "#e2e8e518" : "#10171944";
        ctx.beginPath();
        ctx.arc(x, y, 0.28 + noise(i + 2900) * 0.45, 0, Math.PI * 2);
        ctx.fill();
      }
      const lettering = (
        text: string,
        x: number,
        y: number,
        size: number,
        angle = 0,
      ) => {
        const z = 0.18;
        const origin = project(rotate([x, y, z]));
        const right = project(
          rotate([x + Math.cos(angle), y + Math.sin(angle), z]),
        );
        const down = project(
          rotate([x - Math.sin(angle), y + Math.cos(angle), z]),
        );
        ctx.save();
        ctx.transform(
          right[0] - origin[0],
          right[1] - origin[1],
          down[0] - origin[0],
          down[1] - origin[1],
          origin[0],
          origin[1],
        );
        ctx.font = `700 ${size}px "Barlow Condensed", sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#1c2224";
        ctx.fillText(text, 0.014, 0.025);
        ctx.fillStyle = "#b9bebb";
        ctx.fillText(text, -0.008, -0.012);
        ctx.fillStyle = "#8f9899";
        ctx.fillText(text, 0, 0);
        ctx.restore();
      };
      const brand = "MOČ & FORMA";
      Array.from(brand).forEach((letter, i) => {
        const angle = -Math.PI / 2 + (i - (brand.length - 1) / 2) * 0.125;
        lettering(
          letter,
          Math.cos(angle) * 1.42,
          Math.sin(angle) * 1.42,
          0.35,
          angle + Math.PI / 2,
        );
      });
      lettering("20", 0, 1.05, 0.76);
      lettering("KG", 0, 1.62, 0.25);
    }
    const schedule = () => {
      if (!disposed && !pending) pending = requestAnimationFrame(draw);
    };
    const move = (event: PointerEvent) => {
      if (reduced.matches || event.pointerType === "touch") return;
      const rect = canvas.getBoundingClientRect();
      yaw =
        -0.46 +
        ((event.clientX - rect.left - rect.width / 2) / rect.width) * 0.4;
      pitch =
        0.32 +
        ((event.clientY - rect.top - rect.height / 2) / rect.height) * 0.25;
      schedule();
    };
    const leave = () => {
      yaw = -0.46;
      pitch = 0.32;
      schedule();
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(canvas);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerleave", leave);
    void document.fonts.ready.then(schedule);
    schedule();
    return () => {
      disposed = true;
      observer.disconnect();
      cancelAnimationFrame(pending);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerleave", leave);
    };
  }, []);
  return (
    <div className="motion-sculpture" aria-hidden="true">
      <div className="sculpture-grid" />
      <span className="sculpture-axis axis-top">+</span>
      <span className="sculpture-axis axis-bottom">+</span>
      <canvas ref={ref} />
      <div className="sculpture-caption">
        <span>CAST IRON / 001</span>
        <span>↗</span>
      </div>
    </div>
  );
}
