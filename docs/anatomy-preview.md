# Atlas vaj: vizualni predogled

Pripravljeno 8. novembra 2026 na podlagi uporabnikovega opisa prikaza vaj in sodelujočih mišic. Referenca https://www.instagram.com/p/DejKeMjsoE-/ v izvajalnem okolju ni dosegljiva (omrežno pravilo vrne 403); neposredne primerjave z objavo nismo opravili. Uporabnik je bil vprašan po imenu aplikacije. Za nadaljnjo natančno primerjavo lahko posreduje sliko ali video objave.

## Vključeno

- Knjižnica prikaže mišični predogled za vseh 55 vaj. Klik na ilustracijo odpre podrobnosti.
- Atlas od spredaj in zadaj loči glavno delo, pomoč pri gibu in stabilizacijo. Besedilne oznake, šrafura in obrobe dopolnijo barve.
- Izbira posamezne mišice poudari njeno lokacijo in pokaže ime, latinsko poimenovanje ter vlogo.
- Tri palete: Železo in baker (privzeta), Bron in oljka, Jeklo in modrina. Izbira se hrani samo kot vizualna nastavitev v `moc-forma:anatomy-palette`.
- Prikaz izvedbe ima nadzorovano shematsko SVG animacijo ter ločena začetni in končni položaj. Ne začne se samodejno; upošteva nastavitev za zmanjšano gibanje in se ustavi v ozadju.
- Prikaz je dosegljiv tudi pri aktivni vadbi in iz izbranega vrstnega reda vaj. Na telefonu ne premakne potrditve serije pod navigacijo.
- Podrobnosti prikažejo zadnje primerljive rezultate iz obstoječe zgodovine, kadar so na voljo.

## Podatki in izvedba

Podatkovni model, IndexedDB, izvirni katalog, zgodovina, ročni vnos, šifriranje in Cloudflare niso spremenjeni. Anatomske vloge so izključno vizualni sloj; kvota dveh vaj na glavno skupino ostaja določena v `training.ts`. Predogled na ločenem izvoru nima osebne zgodovine z uporabnikovega telefona.

Geometrija je prilagojena iz react-body-highlighter 2.0.5 (MIT, Copyright 2020 GV79). Licenca je vključena v `public/licenses/Body-Highlighter-LICENSE.txt`; odvisnosti med izvajanjem ni. Ilustracije, pisave in animacija so lokalne ter delujejo brez povezave. Mišične vloge opisujejo običajen poudarek izvedbe, brez izmišljenih odstotkov aktivacije.

Glavna koda je v `src/anatomy/`. Originalne sheme gibov ostanejo v `ExerciseSketch.tsx`; novi prikaz uporablja iste položaje. `ExerciseLibrary.tsx`, `FocusWorkout.tsx` in `TrainingBuilder.tsx` odpirajo anatomske podrobnosti brez spreminjanja opravljene vadbe.

## Preverjanje

`npm test`: 114 uspešnih testov. Produkcijska gradnja za `/turbo-octo-pancake/` je uspešna. Celoten Chromium nabor na računalniku in telefonu: 36 uspešnih preizkusov, vključno s prehodom stare objave, naknadnim vnosom, ohranitvijo celotne zgodovine in aktivne vadbe, barvnimi nastavitvami, kontrolami animacije, delovanjem brez povezave in axe WCAG A/AA. WebKit v tej lokalni seji ni nameščen; teh novih prikazov z njim nismo preverjali.

Ta nadgradnja se pripravlja v ločeni veji in na ločenem Netlify predogledu. Podatki prejšnje produkcijske objave so v `docs/moc-forma-release.json`. Pregledovanje predogleda ni prenos zasebnih podatkov na nov izvor.
