# Prehod iz Težišča v Moč & Formo

Uporabnik je 6. novembra 2026 potrdil kovinski videz in zahteval selitev v okolje `turbo-octo-pancake`, ohranitev zgodovine in knjižnice ter ročno sestavljanje treningov po mišičnih skupinah.

## Podatki in naslovi

- Izvorna koda Težišča pred spremembo: `342fdca72b288fa09724d7d8648b736c0e5ddcf8`.
- Objavljena predhodna različica Pages: `96b5aa922a81e3a2537ec23b7db2a2fd1ff22b68` (0.3.1).
- Spletni vmesnik: https://timbajc1992.github.io/turbo-octo-pancake/.
- Obstoječi šifrirani Worker: `https://tezisce-sync.tim-bajc.workers.dev`.

Frontend ostane na istem izvoru in poti. Cloudflare je obstoječe šifrirano zaledje; ne ustvarjamo druge shrambe, povezovalnih ključev ali novega D1. Celotna izvirna zgodovina se bere iz istega `state/current`, brez spreminjanja ID-jev, datumov, opreme, neznanih vrst serij ali izvornih paketov. Kopija pred prenovo je dodaten lokalni ključ zunaj `State`, zato ne spremeni sinhronizirane vsebine in ne podvaja podatkov v D1.

Pravi osebni podatki so v uporabnikovem brskalniku oziroma njegovi šifrirani shrambi; ne v kodi in javni gradnji. Prehod je preverjen s sintetično zgodovino, vključno z aktivno vadbo, lastnimi vajami, metapodatki, meritvami in lokalnimi povezovalnimi ključi. Ob odpiranju na isti napravi nova aplikacija prikaže dejanske podatke tega brskalnika. Na drugem izvoru je potreben uporabnikov izvoz/obnova ali obstoječa šifrirana povezava.

## Knjižnica in priprava

Izvirni `exerciseCatalog.ts`, `ExerciseSketch.tsx` in `loadAdvice.ts` so ohranjeni. Knjižnica ima 55 vaj, navodila, skice, filtre, vzdevke, zadnje rezultate in izbirne uvodne ocene. Pravila primerljivosti ter smer asistence so nespremenjeni.

Push Day pokrije prsi, ramena in triceps. Pull Day pokrije hrbet, zadnji del ramen in biceps. Legs pokrije sprednje in zadnje stegenske, zadnjico in meča. Celotno telo ponudi pregled vseh desetih glavnih skupin, tudi trupa; prazne skupine so opozorilo za zavestno izbiro, ne trditev, da mora vsak trening nujno vsebovati deset vaj.

Vsaka vaja se šteje pri prvi, glavni mišični skupini knjižnice. Zadnji del ramen se za omejitev šteje pod ramena; pri Pull Day so prikazane samo njegove ustrezne vaje. Pomožne mišice so posebej označene, da večsklepna vaja ne porabi več kvot. Izbor je omejen na dve vaji na glavno skupino, brez podvojene iste vaje. Pravila veljajo pri pripravi, dodajanju med vadbo in zamenjavi. Preteklih treningov, ki so sestavljeni drugače, ne popravljamo.

Pred začetkom se izpiše pokritost skupin. Prazen trening se ne začne. Za izpuščene skupine je treba označiti »Danes te skupine zavestno izpustim.« Ob spremembi izbire se potrditev ponastavi. Vsak sklop ohranja ločen osnutek in vrstni red vaj. Aplikacija predlaga samo vrsto treninga; nobene vaje ne izbere namesto uporabnika.

Nova aplikacija ohrani hitri in podrobni pogled treninga, dejanske pretekle serije, odštevalnik, popravke zgodovine, meritve, uvoze, kopije, Apple Health ter šifrirano sinhronizacijo. Dodane so navade v slogu Moč & Forma. V nastavitvah je dosegljiv prejšnji vmesnik.

## PWA in posodobitev

Ime in ikone so Moč & Forma, pot in identiteta PWA ostaneta isti. Posodobitev ne briše IndexedDB ali `device:*`. Predpomnjene statične datoteke pri iskanju ne upoštevajo `Vary: Origin`, ker imajo enako javno vsebino za vsak izvor; s tem prvi ponovni zagon brez povezave deluje tudi pri gostiteljih, ki dodajo ta CORS header. Zunanje šifrirane zahteve se ne predpomnijo.

Pri objavi se ohranijo stare datoteke `assets/`, da se že odprta predhodna aplikacija lahko dokonča. Git objava ostane običajna zaporedna sprememba na `gh-pages`, brez prisilnega potiska ali brisanja zgodovine veje. Za vrnitev videza se lahko povrne koda; podatkovna shema in izvirna kopija ostaneta berljivi.

## Preverjeno pred objavo

6. november 2026: 97 uspešnih testov podatkovne logike, šifriranja, zaledja in varnostnih kopij. Celoten nabor 26 brskalniških preizkusov je uspešen na poti `/turbo-octo-pancake/`, vključno z dejanskima prejšnjima statičnima objavama in posodobitvijo service workerja. Po popravkih čitljivosti so dodatno preverjeni aktivna vadba, nastavitve, knjižnica in vseh pet zaslonov na računalniku ter telefonu; preverjanje axe ne pokaže kršitev za WCAG 2 A/AA in 2.1 AA.

Brskalniški preizkusi med drugim primerjajo celotno izvirno stanje pred in po posodobitvi, ne le števila treningov. Izvirni ID-ji in neznani metapodatki ostanejo enaki. Novo sestavljen Push Day se lahko shrani, ponovno odpre brez povezave in zaključi, ne da bi se spremenile prejšnje vadbe.
