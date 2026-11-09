import { useId } from "react";

/** Symbolic outline. Only the waist region responds to an actual waist ratio. */
export function bodyOutline(waist = 1) {
  const w = 35 * Math.max(0.8, Math.min(1.2, waist));
  return `M151 83Q142 99 119 103Q103 106 98 128L86 177L66 239Q61 256 69 264L76 257L84 236L104 195L116 160L121 191Q${180 - w} 215 ${180 - w} 235Q128 255 128 276L139 335L145 391L140 411Q137 420 149 420L165 416L163 391L166 338L180 284L194 338L197 391L195 416L211 420Q223 420 220 411L215 391L221 335L232 276Q232 255 ${180 + w} 235Q${180 + w} 215 239 191L244 160L256 195L276 236L284 257L291 264Q299 256 294 239L274 177L262 128Q257 106 241 103Q218 99 209 83`;
}

export function BodyMotif({
  ratio = 1,
  comparison = false,
  className = "",
}: {
  ratio?: number;
  comparison?: boolean;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={`body-motif ${className}`}>
      <svg viewBox="0 0 360 450" role="img" aria-labelledby={`${id}-title`}>
        <title id={`${id}-title`}>
          {comparison
            ? "Shematski obris spremembe izmerjenega pasu"
            : "Obris telesa"}
        </title>
        <g className="body-guide" aria-hidden="true">
          <ellipse cx="180" cy="224" rx="143" ry="161" />
          <path d="M180 13V438M34 230H326" />
          <path d="M85 40H105M95 30V50M263 399H283M273 389V409" />
        </g>
        {comparison && (
          <path
            className="body-baseline"
            d={bodyOutline(1)}
            data-outline="baseline"
          />
        )}
        <g className="body-current" data-waist-ratio={ratio.toFixed(4)}>
          <path d={bodyOutline(ratio)} />
          <path d="M152 56C152 23 208 23 208 56C208 96 152 96 152 56Z" />
          <path
            className="body-detail"
            d="M152 105Q180 122 208 105M180 119V183M140 143Q156 153 172 145M188 145Q204 153 220 143M180 198V247M147 279L157 317M213 279L203 317M148 358L155 383M212 358L205 383"
          />
        </g>
        {comparison && (
          <g className="body-waist-guide">
            <path d="M112 224H248" />
            <circle cx="112" cy="224" r="3" />
            <circle cx="248" cy="224" r="3" />
          </g>
        )}
      </svg>
      {!comparison && (
        <div className="body-motif-caption">
          <span>RAVNOTEŽJE</span>
          <span>V TVOJEM RITMU</span>
        </div>
      )}
    </div>
  );
}
