const posters = import.meta.glob<string>("./assets/exercise-previews/*.webp", {
  eager: true,
  query: "?url",
  import: "default",
});
export const exercisePoster = (id: string) =>
  posters[`./assets/exercise-previews/${id}.webp`];
