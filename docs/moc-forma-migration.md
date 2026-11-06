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

## Naknadni ročni vnos

Dostop je **Vadba ali Zgodovina → Naknadni vnos**. Uporabnik izbere dejanski datum (danes ali prej), ime, neobvezen sklop in trajanje, doda vaje iz knjižnice ali lastne vaje ter vpiše dejanske teže, ponovitve, neobvezen RIR in opombe. Kardio ima minute aktivnosti. Serije lahko dodaja, kopira in odstranjuje; vrsta serije (delovna, ogrevanje, ne vem), oprema, način beleženja in bolečina so uredljivi.

Osnutek `manualWorkoutDraft` se samostojno shranjuje in deluje brez povezave, ne da bi spreminjal `active` ali osnutke prihodnjih treningov. Nove vrstice imajo prazne dejanske vrednosti; knjižnica ne kopira starih rezultatov v opravljene serije. Šele izrecni gumb **Shrani opravljeni trening** doda zapis v zgodovino in potrdi vnesene serije. Uspeh se prikaže po končanem zapisu v IndexedDB. Če trajanje ni znano, ostane neznano; časov začetka in konca ne izmišljamo. Ponovna oddaja istega zapisa je zavrnjena.

Omejitev dveh vaj na skupino velja za pripravo prihodnjih treningov. Naknadni zapis mora ohraniti resnično opravljeno vadbo, zato lahko zabeleži tudi več vaj za isto skupino. Izbrani sklop še vedno filtrira knjižnico; brez sklopa je dosegljiva celotna knjižnica. Obstoječi treningi, aktivna vadba, povezovalni ključi in surovi uvozi se ne prepisujejo. Novi osnutek je vključen v celotne varnostne kopije in obstoječo šifrirano sinhronizacijo, kjer se pri konfliktu obravnava kot celota.

## PWA in posodobitev

Ime in ikone so Moč & Forma, pot in identiteta PWA ostaneta isti. Posodobitev ne briše IndexedDB ali `device:*`. Predpomnjene statične datoteke pri iskanju ne upoštevajo `Vary: Origin`, ker imajo enako javno vsebino za vsak izvor; s tem prvi ponovni zagon brez povezave deluje tudi pri gostiteljih, ki dodajo ta CORS header. Zunanje šifrirane zahteve se ne predpomnijo.

Pri objavi se ohranijo stare datoteke `assets/`, da se že odprta predhodna aplikacija lahko dokonča. Git objava ostane običajna zaporedna sprememba na `gh-pages`, brez prisilnega potiska ali brisanja zgodovine veje. Za vrnitev videza se lahko povrne koda; podatkovna shema in izvirna kopija ostaneta berljivi.

## Preverjeno pred objavo

6. november 2026: 109 uspešnih testov podatkovne logike, šifriranja, zaledja in varnostnih kopij. Celoten nabor 32 brskalniških preizkusov je uspešen na poti `/turbo-octo-pancake/`, vključno z dejanskima prejšnjima statičnima objavama in posodobitvijo service workerja. Po popravkih čitljivosti so dodatno preverjeni aktivna vadba, nastavitve, knjižnica in vseh pet zaslonov na računalniku ter telefonu; preverjanje axe ne pokaže kršitev za WCAG 2 A/AA in 2.1 AA.

Brskalniški preizkusi med drugim primerjajo celotno izvirno stanje pred in po posodobitvi, ne le števila treningov. Izvirni ID-ji in neznani metapodatki ostanejo enaki. Novo sestavljen Push Day se lahko shrani, ponovno odpre brez povezave in zaključi, ne da bi se spremenile prejšnje vadbe.

Naknadni vnos je dodatno preverjen s tipkanjem decimalne vejice, prazno težo in pravilno ničlo, preteklim/napačnim/prihodnjim datumom, kopiranjem serij, lastnimi vajami in kardiem. Preizkus shrani osnutek, znova odpre aplikacijo brez povezave in zaključi zapis; celotna stara zgodovina, aktivna vadba, metapodatki in ključi morajo ostati enaki. Modalni obrazec je preverjen tudi z axe.
