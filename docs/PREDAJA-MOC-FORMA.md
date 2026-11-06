# Predaja v uporabnikovo drugo nit

Ciljna nit: `01a14128-8b6e-70db-90ca-0174858a3067`.
Repozitorij: `TimBajc1992/turbo-octo-pancake`.

V tem repozitoriju je pripravljena nova Moč & Forma v potrjenem videzu Stara šola, z dejansko knjižnico Težišča in istim podatkovnim modelom/shrambo. Za nadaljevanje naj pomočnik v ciljni niti uporabi vejo `moc-forma-migration` in najprej prebere `docs/moc-forma-migration.md` in stanje Git. Upošteva naj morebitne lokalne spremembe v ciljnem okolju; naj jih ne prepiše s ponastavitvijo delovnega drevesa.

Zahteve uporabnika so izvedene v `src/training.ts`, `src/TrainingBuilder.tsx`, razširjeni `src/ExerciseLibrary.tsx` ter novem vmesniku `src/iron/` in `src/iron.css`. Zgodovina ostaja v `tezisce/state/current`; lokalna kopija pred prvim odprtjem je `moc-forma:safety:v1`. Lokalni povezovalni ključi in izvorni podatki se ohranijo. Osebnih datotek ne dodajaj v repo ali javno gradnjo.

Videz in te funkcije je uporabnik že odobril. Samodejni pregled odobritev je v tej seji ustavil neposreden potisk v `main`, ker zahteva izrecno potrditev tega načina produkcijske objave. Veja `moc-forma-migration` je že poslana v repozitorij; `main` in obstoječa produkcija sta za zdaj nespremenjena. Pred nadaljevanjem preveri, ali je uporabnik to izrecno dovoljenje že dal v nadaljevanju klepeta. Če ga je, ga ne sprašuj znova. Če so spremembe že objavljene, jih ne objavljaj znova brez novih sprememb. Preveri `docs/moc-forma-release.json`, če obstaja, in primerjaj SHA dejanske različice.

Programske vsebine klepeta in izbranega izvajalnega oblaka ni mogoče prenesti samo z Git spremembo. Ta datoteka prenese potrebno projektno stanje in odločitve v repozitorij, ki ga ciljna nit že uporablja.
