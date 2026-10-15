import { readFileSync } from "node:fs";
import { previewPulse, applyPulse, undoImport } from "../src/importer";
import { initialState, completeSets } from "../src/model";
import { restoreBackup, backup } from "../src/db";
const p = previewPulse(readFileSync(process.argv[2], "utf8"), initialState());
const s = applyPulse(initialState(), p);
const again = applyPulse(
  s,
  previewPulse(readFileSync(process.argv[2], "utf8"), s),
);
if (again.workouts.length !== s.workouts.length || again.imports.length !== 1)
  throw Error("Duplicate import");
if (JSON.stringify(s.imports[0].raw) !== JSON.stringify(p.raw))
  throw Error("Raw not preserved");
const restored = restoreBackup(backup(s));
const undone = undoImport(restored, s.imports[0].id);
if (
  undone.state.workouts.length ||
  undone.state.measurements.length ||
  undone.state.daily.length ||
  undone.preserved
)
  throw Error("Backup/undo failure");
console.log(
  JSON.stringify(
    {
      stats: p.stats,
      completed: s.workouts.reduce((n, w) => n + completeSets(w).length, 0),
      warnings: p.warnings,
      dates: s.workouts.map((w) => w.date),
      duplicateSafe: true,
      backupUndoSafe: true,
    },
    null,
    2,
  ),
);
