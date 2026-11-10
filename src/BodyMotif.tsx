import { BodyModel } from "./BodyModel";
export { bodyPoint } from "./body-shape";

export function BodyMotif({
  ratio,
  weightRatio = 1,
  comparison = false,
  className = "",
  interactive = false,
}: {
  ratio?: number;
  weightRatio?: number;
  comparison?: boolean;
  className?: string;
  interactive?: boolean;
}) {
  return (
    <div className={`body-motif ${className}`}>
      <BodyModel
        ratio={ratio}
        weightRatio={weightRatio}
        comparison={comparison}
        interactive={interactive}
      />
    </div>
  );
}
