# Visual review checkpoint

This standalone preview contains the actual rigged CC0 human mesh, original gym equipment, rest-space muscle tint and geometric exercise animation. It does not import the workout app, database, synchronization or profile. Browser verification on 390 × 844 checked four reference exercises, playback, scrubbing and rotation, with no browser errors and zero IndexedDB/local-storage accesses.

The isolated review contains Machine Chest Press, Pec Deck, Cable Triceps Pushdown and Overhead Cable Extension. Version 2 adds a leaner, more defined athlete and a constrained elbow/forearm solver. The workout app now integrates the viewer and a catalogue of 132 entries, with 131 rendered exercise posters; the generic unspecified trunk machine intentionally has no invented movement. See `docs/exercise-anatomy.md` for the implementation and data-preservation checks.

Build: `npx vite build --config previews/exercise-3d/vite.config.ts`. Include the MakeHuman CC0, Three.js MIT and Meshoptimizer MIT license files when distributing the output. The existing main app and its service worker were byte-identical before and after publishing this preview.

The MakeHuman source revision, file hashes and generated model hash are in `src/assets/athlete-source.json`; the core-asset license is beside the generated model. The Instagram screenshots identify MyFitCoach as the visual reference; none of its images, models or animations are included in the preview.
