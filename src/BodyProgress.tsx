import { BodyMotif } from "./BodyMotif";
import { dateLabel, num, type Measurement } from "./model";
import { ArrowUpRight } from "lucide-react";

export function bodyProgress(measurements: Measurement[]) {
  const rows = measurements
    .filter((m) => Number.isFinite(m.value) && m.value > 0)
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date));
  const weights = rows.filter((m) => m.kind === "weight"),
    waists = rows.filter((m) => m.kind === "waist");
  return {
    weight: weights.at(-1),
    firstWeight: weights[0],
    waist: waists.at(-1),
    firstWaist: waists[0],
    ratio: waists.length > 1 ? waists.at(-1)!.value / waists[0].value : 1,
    weightRatio:
      weights.length > 1 ? weights.at(-1)!.value / weights[0].value : 1,
    hasWaistComparison: waists.length > 1,
    hasWeightComparison: weights.length > 1,
    hasComparison: waists.length > 1 || weights.length > 1,
  };
}

export function BodyProgress({
  measurements,
  measure,
}: {
  measurements: Measurement[];
  measure: (kind: "weight" | "waist") => void;
}) {
  const p = bodyProgress(measurements);
  return (
    <section className="body-progress panel" aria-label="Telo in tvoje meritve">
      <div className="body-progress-figure">
        <span className="eyebrow">TVOJA ZGODBA V OBRISU</span>
        <BodyMotif
          ratio={p.hasWaistComparison ? p.ratio : undefined}
          weightRatio={p.weightRatio}
          comparison={p.hasComparison}
        />
        <div className="body-progress-legend">
          <span>
            <i />
            Zdaj
          </span>
          {p.hasComparison && (
            <span>
              <i />
              Izhodišče
            </span>
          )}
        </div>
      </div>
      <div className="body-progress-copy">
        <span className="eyebrow">MAJHNE SPREMEMBE. TVOJ RITEM.</span>
        <h2>Napredek dobi obliko.</h2>
        <p>
          Meritve se spreminjajo. Vse, kar zabeležiš, ostane del tvoje zgodbe.
        </p>
        <div className="body-measures">
          {(
            [
              ["weight", "Telesna teža", "kg", p.weight, p.firstWeight],
              ["waist", "Obseg pasu", "cm", p.waist, p.firstWaist],
            ] as const
          ).map(([kind, label, unit, last, first]) => (
            <div className="body-measure" key={kind}>
              <div>
                <span>{label}</span>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => measure(kind)}
                >
                  {last ? "Dodaj" : "Prva meritev"}{" "}
                  <ArrowUpRight size={12} aria-hidden="true" />
                </button>
              </div>
              <strong>
                {last ? num(last.value) : "—"}
                <small>{unit}</small>
              </strong>
              <p>
                {last
                  ? dateLabel(last.date, true)
                  : "Tvoje izhodišče te še čaka."}
                {last && first && last.id !== first.id && (
                  <span className="body-measure-change">
                    {last.value - first.value > 0 ? "+" : ""}
                    {num(last.value - first.value)} {unit} od{" "}
                    {dateLabel(first.date)}
                  </span>
                )}
              </p>
            </div>
          ))}
        </div>
        <p className="body-progress-note">
          {p.hasComparison
            ? p.hasWaistComparison && p.hasWeightComparison
              ? "Shematski obris sledi spremembam telesne teže in obsega pasu."
              : p.hasWeightComparison
                ? "Shematski obris sledi spremembi telesne teže."
                : "Shematski obris sledi spremembi obsega pasu."
            : "Zabeleži težo ali obseg pasu za primerjavo obrisa skozi čas."}
        </p>
      </div>
    </section>
  );
}
