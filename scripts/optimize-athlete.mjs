import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dedup, prune, meshopt } from "@gltf-transform/functions";
import { MeshoptEncoder } from "meshoptimizer";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
await MeshoptEncoder.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ "meshopt.encoder": MeshoptEncoder });
const doc = await io.read("src/assets/athlete.glb");
// Region names are used to highlight muscles. Equal-looking skin materials must
// remain separate, even though they share their neutral skin colour.
await doc.transform(
  dedup({ keepUniqueNames: true }),
  prune(),
  meshopt({ encoder: MeshoptEncoder, level: "high" }),
);
await io.write("src/assets/athlete-optimized.glb", doc);
const bytes = await readFile("src/assets/athlete-optimized.glb");
const provenance = JSON.parse(
  await readFile("src/assets/athlete-source.json", "utf8"),
);
provenance.output = {
  file: "athlete-optimized.glb",
  bytes: bytes.length,
  sha256: createHash("sha256").update(bytes).digest("hex"),
};
provenance.modifications =
  "Lean adult male muscle/proportion morphs, original pectoral/abdominal relief and upper-arm/deltoid volume sculpt, compression shorts, cropped hair, rigging and mesh optimization. No MyFitCoach assets are used.";
await writeFile(
  "src/assets/athlete-source.json",
  JSON.stringify(provenance, null, 2) + "\n",
);
