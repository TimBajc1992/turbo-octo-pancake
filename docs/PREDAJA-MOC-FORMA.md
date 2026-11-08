> Posodobitev 8. 11. 2026: trenutna izdaja je **0.4.0**, izvor `d54ad53981ce71f6a60b8530efd2c59829be39d0`, Pages `af52d2ce1735aea4d88f78a767ce5e0c46703ca1`. PR #9 je združen. Knjižnica ima 132 vnosov in 131 konkretnih 3D prikazov. Preverjenih je 117 enotskih preizkusov ter po 44 tokov v Chromiumu in WebKitu, vključno s staro posodobitvijo in nespremenjeno zgodovino/ključi. Ista zbirka `tezisce/state/current` in Cloudflare ostajata ohranjena. Trenutni podatki objave so v `docs/moc-forma-release.json`, podrobnosti prikaza pa v `docs/exercise-anatomy.md`. Spodnje besedilo o prvi prenovi ostaja zgodovinska podlaga.

# Predaja v uporabnikovo drugo nit

Ciljna nit: `01a14128-8b6e-70db-90ca-0174858a3067`.
Repozitorij: `TimBajc1992/turbo-octo-pancake`.

**Objavljeno 6. novembra 2026:** aplikacijska koda `93df5cb3154d1567ddc6a09a2cc721f10f5f82c5` je v `main`; statična objava je `eb50d62f6c9c7009372a81f84222f45025a2f0f0` na `gh-pages`. GitHub Pages je uspešno objavil na istem naslovu; preverjanje Chromium/WebKit in obstoječi potek Cloudflare sta uspešna. Ne objavljaj znova brez novih sprememb. Praktična navodila so v `docs/UPORABA-MOC-FORMA.md`.

Uporabnik je 6. novembra 2026 izrecno odobril neposreden potisk pripravljenih sprememb v `main` in objavo na obstoječem naslovu Težišča z odgovorom »Odobrim!«, hkrati pa zahteval še naknadni ročni vnos opravljenega treninga. Prejšnji zastoj pri samodejnem pregledu je s tem razrešen; potrditve za isto objavo ne zahtevaj znova. Dejanski status objave, preverjanja in SHA so v `docs/moc-forma-release.json`. Upoštevaj morebitne lokalne spremembe v ciljnem okolju; ne prepisuj jih s ponastavitvijo delovnega drevesa.

Nova Moč & Forma ima potrjeni videz Stara šola, dejansko knjižnico Težišča, isti podatkovni model/shrambo ter samostojen naknadni vnos. Nadaljevanje naj uporabi `main`, najprej prebere `docs/moc-forma-migration.md` in preveri stanje Git. Sprememb, ki so že objavljene, ne objavljaj znova brez novih sprememb.

Priprava treningov je v `src/training.ts`, `src/TrainingBuilder.tsx`, razširjeni `src/ExerciseLibrary.tsx` ter novem vmesniku `src/iron/` in `src/iron.css`. Naknadni vnos je v `src/manualWorkout.ts` in `src/ManualWorkoutDialog.tsx`; dostopen je v Vadbi in Zgodovini. Ločen osnutek ne nadomesti aktivnega treninga. Zgodovina ostaja v `tezisce/state/current`; lokalna kopija pred prvim odprtjem je `moc-forma:safety:v1`. Lokalni povezovalni ključi in izvorni podatki se ohranijo. Osebnih datotek ne dodajaj v repo ali javno gradnjo.

Frontend ostane na `https://timbajc1992.github.io/turbo-octo-pancake/`, da ista naprava obdrži podatke in namestitev PWA. Cloudflare je obstoječe šifrirano zaledje `https://tezisce-sync.tim-bajc.workers.dev`; Workerja, D1 in ključev nismo spreminjali. Produkcijska statična vsebina se običajno objavi na veji `gh-pages` (stara glavna Actions objava ima zgodovinsko omejitev okolja). Nobenih pravil zaščite okolja ne spreminjaj za obvoz objave. Preveri dejanski novi `pages build and deployment`, ne starega neuspešnega poteka na `main`.

Klepeta in izbranega izvajalnega oblaka ni mogoče prenesti samo z Git spremembo. Ta datoteka prenese potrebno projektno stanje in odločitve v repozitorij, ki ga ciljna nit že uporablja.
