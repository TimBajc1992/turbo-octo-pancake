import { useEffect, useState } from "react";

/** Keep partial keystrokes out of persisted settings until they form a valid value. */
export function BoundedNumberInput({
  value,
  min,
  max,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  return (
    <input
      type="number"
      inputMode="numeric"
      required
      min={min}
      max={max}
      step={1}
      value={draft}
      onChange={(event) => {
        const text = event.target.value;
        setDraft(text);
        const number = Number(text);
        if (
          text !== "" &&
          Number.isInteger(number) &&
          number >= min &&
          number <= max
        )
          onChange(number);
      }}
      onBlur={() => {
        const number = Number(draft);
        const next =
          draft === "" || !Number.isFinite(number)
            ? value
            : Math.max(min, Math.min(max, Math.round(number)));
        setDraft(String(next));
        if (next !== value) onChange(next);
      }}
    />
  );
}
