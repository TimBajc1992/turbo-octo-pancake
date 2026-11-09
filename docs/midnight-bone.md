# Polnočna modra in kost

Različica 0.5.0 uporablja kostno belo ozadje `#F2EEE6`, črnilno modro `#1F2A44` in matirane površine z nežno papirnato teksturo. Brez senc in kovinskih prelivov. Naslovi uporabljajo serif Georgia, številke meritev in obremenitev lokalno vključeno pisavo IBM Plex Mono. Tudi prikaz vaj, obrazci, starejši vmesnik, ikona in zaslon posodobitve sledijo svetli podobi.

Zlata `#B08D57` je omejena na znak doseženega tedenskega cilja: pokaže se, ko je v tekočem tednu opravljenih vsaj toliko vadb z zabeleženo serijo, kot določa že shranjeni tedenski cilj. Navigacija, gumbi, splošna motivacija in mišice je ne uporabljajo. Grafi in anatomija uporabljajo prašno modro `#7D8FA8` ter toplo sivo `#A39E93`, besedilo pa temnejši ton za berljivost.

## Meritve in obris

V zavihku **Napredek** je glavni prikaz shematski obris telesa z zadnjo težo in obsegom pasu, dejanskimi datumi ter spremembo od prve meritve. Obseg pasu spreminja samo predel pasu; črtkani obris ohranja izhodišče. Širina je omejena na simbolni razpon 80–120 %, številke pa vedno pokažejo dejanske meritve. Teža sama ne spreminja oblike telesa in iz nje ne ocenjujemo mišic ali maščobe. Brez dveh meritev pasu ni izmišljenega preteklega obrisa.

Podrobni graf, tedenska povprečja, vse posamične meritve in urejanje ostanejo dostopni. Gumba **Dodaj** odpreta obstoječi obrazec za težo oziroma pas. Novi pogled ne spreminja shranjenih meritev.

## Ohranjanje podatkov in objava

Izvor, pot aplikacije, identiteta namestitve in zbirka `tezisce/state/current` ostajajo isti. Ta nadgradnja ne spremeni modela podatkov, vaj in njihovih ID-jev, zgodovine, treninga v teku, osnutkov, naknadnega vnosa, podatkov Apple Health ali šifrirane povezave s Cloudflarom. Posodobitveni pomočnik ohranja preverjeno logiko za Safari; spremenjene so samo njegove barve.

Samostojni predogled je v `previews/midnight-bone/` in na `/predogled-videz/v1/`. Uporablja sintetične podatke samo v pomnilniku, ne vključuje glavne aplikacije ali njene povezave s shrambo in ne registrira service workerja. Preverjanje vseh treh zaslonov na telefonu in računalniku beleži nič klicev IndexedDB ali shrambe brskalnika. Produkcijska objava ohranja stare datoteke za nemoteno posodobitev že odprtih namestitev.

Preizkusi preverjajo dejansko razmerje pasu, nespremenjeno zgodovino in ključe naprave, podrobni graf, odsotnost spreminjanja obrisa samo zaradi teže, doseženi tedenski cilj, paleto in širine 320/390/1440 px. Obstoječi celotni preizkusi dodatno preverjajo vadbo, stare posodobitve, delovanje brez povezave, Apple Health ter šifrirano sinhronizacijo. Podatki o potrjeni objavi so v `moc-forma-release.json`.
