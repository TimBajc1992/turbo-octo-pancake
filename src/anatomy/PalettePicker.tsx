import { anatomyPalettes, useAnatomyPalette } from "./preferences";

export function PalettePicker() {
  const [value, change] = useAnatomyPalette();
  return (
    <div
      className="anatomy-palette-picker"
      role="group"
      aria-label="Barvna shema prikaza"
    >
      <span>{anatomyPalettes.find((p) => p.id === value)?.name}</span>
      <div>
        {anatomyPalettes.map((p) => (
          <button
            key={p.id}
            type="button"
            aria-label={p.name}
            title={p.name}
            aria-pressed={value === p.id}
            onClick={() => change(p.id)}
          >
            <span
              style={{
                background: `linear-gradient(135deg, ${p.primary} 0 50%, ${p.secondary} 50%)`,
              }}
            />
            <span className="palette-name">{p.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
