import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dedup, prune, meshopt } from "@gltf-transform/functions";
import { MeshoptEncoder } from "meshoptimizer";
await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.encoder": MeshoptEncoder });
const doc = await io.read("src/assets/athlete.glb");
// Region names are used to highlight muscles. Equal-looking skin materials must
// remain separate, even though they share their neutral skin colour.
await doc.transform(dedup({ keepUniqueNames: true }), prune(), meshopt({ encoder: MeshoptEncoder, level: "high" }));
await io.write("src/assets/athlete-optimized.glb", doc);
