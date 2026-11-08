# Visual review checkpoint

This standalone preview contains the actual rigged CC0 human mesh, original gym equipment, rest-space muscle tint and geometric exercise animation. It does not import the workout app, database, synchronization or profile. Browser verification on 390 × 844 checked four reference exercises, playback, scrubbing and rotation, with no browser errors and zero IndexedDB/local-storage accesses.

The first review contains Machine Chest Press, Pec Deck, Cable Triceps Pushdown and Overhead Cable Extension. Integration into the workout app and completion/visual checking of every other pose are pending user feedback on this preview.

Build: `npx vite build --config previews/exercise-3d/vite.config.ts`. Include the MakeHuman CC0, Three.js MIT and Meshoptimizer MIT license files when distributing the output. The existing main app and its service worker were byte-identical before and after publishing this preview.

The MakeHuman source revision, file hashes and generated model hash are in `src/assets/athlete-source.json`; the core-asset license is beside the generated model. The Instagram screenshots identify MyFitCoach as the visual reference; none of its images, models or animations are included in the preview.
