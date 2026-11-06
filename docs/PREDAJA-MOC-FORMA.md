# Predaja v uporabnikovo drugo nit

Ciljna nit: `01a14128-8b6e-70db-90ca-0174858a3067`.
Repozitorij: `TimBajc1992/turbo-octo-pancake`.

Uporabnik je 6. novembra 2026 izrecno odobril neposreden potisk pripravljenih sprememb v `main` in objavo na obstoječem naslovu Težišča z odgovorom »Odobrim!«, hkrati pa zahteval še naknadni ročni vnos opravljenega treninga. Prejšnji zastoj pri samodejnem pregledu je s tem razrešen; potrditve za isto objavo ne zahtevaj znova. Dejanski status objave, preverjanja in SHA so v `docs/moc-forma-release.json`. Upoštevaj morebitne lokalne spremembe v ciljnem okolju; ne prepisuj jih s ponastavitvijo delovnega drevesa.

Nova Moč & Forma ima potrjeni videz Stara šola, dejansko knjižnico Težišča, isti podatkovni model/shrambo ter samostojen naknadni vnos. Nadaljevanje naj uporabi `main`, najprej prebere `docs/moc-forma-migration.md` in preveri stanje Git. Sprememb, ki so že objavljene, ne objavljaj znova brez novih sprememb.

Priprava treningov je v `src/training.ts`, `src/TrainingBuilder.tsx`, razširjeni `src/ExerciseLibrary.tsx` ter novem vmesniku `src/iron/` in `src/iron.css`. Naknadni vnos je v `src/manualWorkout.ts` in `src/ManualWorkoutDialog.tsx`; dostopen je v Vadbi in Zgodovini. Ločen osnutek ne nadomesti aktivnega treninga. Zgodovina ostaja v `tezisce/state/current`; lokalna kopija pred prvim odprtjem je `moc-forma:safety:v1`. Lokalni povezovalni ključi in izvorni podatki se ohranijo. Osebnih datotek ne dodajaj v repo ali javno gradnjo.

Frontend ostane na `https://timbajc1992.github.io/turbo-octo-pancake/`, da ista naprava obdrži podatke in namestitev PWA. Cloudflare je obstoječe šifrirano zaledje `https://tezisce-sync.tim-bajc.workers.dev`; Workerja, D1 in ključev nismo spreminjali. Produkcijska statična vsebina se običajno objavi na veji `gh-pages` (stara glavna Actions objava ima zgodovinsko omejitev okolja). Nobenih pravil zaščite okolja ne spreminjaj za obvoz objave. Preveri dejanski novi `pages build and deployment`, ne starega neuspešnega poteka na `main`.

Klepeta in izbranega izvajalnega oblaka ni mogoče prenesti samo z Git spremembo. Ta datoteka prenese potrebno projektno stanje in odločitve v repozitorij, ki ga ciljna nit že uporablja.
