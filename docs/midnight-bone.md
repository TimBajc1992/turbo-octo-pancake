# Polnočna modra in kost

To je opis izdaje 0.5.0. Različica 0.6.0 ohranja to temo ter obris nadomesti z anatomskim modelom; spremembe in povezava z meritvami so opisane v [glass-anatomy.md](glass-anatomy.md).

Različica 0.5.0 uporablja kostno belo ozadje `#F2EEE6`, črnilno modro `#1F2A44` in matirane površine z nežno papirnato teksturo. Brez senc in kovinskih prelivov. Naslovi uporabljajo serif Georgia, številke meritev in obremenitev lokalno vključeno pisavo IBM Plex Mono. Tudi prikaz vaj, obrazci, starejši vmesnik, ikona in zaslon posodobitve sledijo svetli podobi.

Zlata `#B08D57` je omejena na znak doseženega tedenskega cilja: pokaže se, ko je v tekočem tednu opravljenih vsaj toliko vadb z zabeleženo serijo, kot določa že shranjeni tedenski cilj. Navigacija, gumbi, splošna motivacija in mišice je ne uporabljajo. Grafi in anatomija uporabljajo prašno modro `#7D8FA8` ter toplo sivo `#A39E93`, besedilo pa temnejši ton za berljivost.

## Meritve in obris

V zavihku **Napredek** je glavni prikaz shematski obris telesa z zadnjo težo in obsegom pasu, dejanskimi datumi ter spremembo od prve meritve. Naravni zunanji obris je izpeljan iz obstoječega anatomskega modela CC0; glava, ramena, roke in noge ohranijo človeška razmerja. Isti obris je tudi na domači strani.

Sprememba teže spreminja celoten volumen trupa in okončin pri isti višini. Izmerjena sprememba pasu posebej prilagodi predel pasu in tam nadomesti splošno prilagoditev teži, da iste spremembe ne štejemo dvakrat. Glava in stopala se ne večajo ali manjšajo. Črtkani obris ohranja izhodišče. Prikaz je simbolni, ne rekonstrukcija telesa ali ocena mišic in maščobe: uporabljamo kvadratni koren razmerja zadnje in prve teže, omejen na 75–130 % širine, pas pa na 70–135 %. Številke vedno ostanejo dejanske. Brez dveh meritev posamezne vrste zanjo ne izmišljamo preteklega stanja.

Podrobni graf, tedenska povprečja, vse posamične meritve in urejanje ostanejo dostopni. Gumba **Dodaj** odpreta obstoječi obrazec za težo oziroma pas. Novi pogled ne spreminja shranjenih meritev.

## Ohranjanje podatkov in objava

Izvor, pot aplikacije, identiteta namestitve in zbirka `tezisce/state/current` ostajajo isti. Ta nadgradnja ne spremeni modela podatkov, vaj in njihovih ID-jev, zgodovine, treninga v teku, osnutkov, naknadnega vnosa, podatkov Apple Health ali šifrirane povezave s Cloudflarom. Posodobitveni pomočnik ohranja preverjeno logiko za Safari; spremenjene so samo njegove barve. Glavna aplikacija ponovno uporabi aktivno registracijo service workerja in preverja posodobitev samo, ko je na voljo internet, da odpiranje že shranjene aplikacije brez povezave ne sproži odvečne omrežne registracije.

Samostojni predogled je v `previews/midnight-bone/` in na `/predogled-videz/v2/`. Uporablja sintetične podatke samo v pomnilniku, ne vključuje glavne aplikacije ali njene povezave s shrambo in ne registrira service workerja. Preverjanje vseh treh zaslonov na telefonu in računalniku beleži nič klicev IndexedDB ali shrambe brskalnika. Produkcijska objava ohranja stare datoteke za nemoteno posodobitev že odprtih namestitev.

Preizkusi preverjajo dejanski razmerji teže in pasu, nespremenjeno zgodovino in ključe naprave, podrobni graf, spreminjanje obrisa tudi samo zaradi teže in skupni vpliv obeh meritev, doseženi tedenski cilj, dejanske prikazane barve in širine 320/390/1440 px. Končna tema se naloži po slogu izbranega vmesnika, da jo deljenje CSS med paketi ne prepiše. Obstoječi celotni preizkusi dodatno preverjajo vadbo, stare posodobitve, delovanje brez povezave, Apple Health ter šifrirano sinhronizacijo. Podatki o potrjeni objavi so v `moc-forma-release.json`.
