# Prikaz mišic in izvedbe

Prvotni shematski 2D prikaz je zamenjan z dejanskim skinned 3D modelom in izvirno opremo. Različica 0.6.0 nadaljuje objavljeno 0.5.0 (`d8b49a2`) ter po uporabnikovih referencah doda podrobno mišično površino, steklast zunanji sloj in oranžen poudarek glavnih mišic. Pomožne mišice so umirjeno rožnate. Slike, modeli in animacije MyFitCoach ali Glass Anatomy niso uporabljeni; lastna mišična tekstura je generirana na izrisu obstoječega modela. Podrobnosti so v [glass-anatomy.md](glass-anatomy.md).

## Uporaba

- Knjižnica vsebuje **132 vaj in različic**: palice, ročke, drogove/bradljo, naprave, kable in lastno težo. To je obsežen izbran katalog, ne trditev o vseh mogočih različicah.
- Dotik slike odpre ločen prikaz iste vaje brez dodajanja v trening. Kartice uporabljajo vnaprej izrisane slike; vsaka kartica ne ustvarja svojega grafičnega konteksta.
- **Izvedba** je privzeti 3D prikaz. Predvajanje, premor, položaj giba in zasuk delujejo na uporabnikovo zahtevo. Izbrano mišico je mogoče poudariti.
- **Mišice** ohranja zemljevid od spredaj/zadaj in razlago 19 anatomskih predelov. Barvi opisujeta vlogo, ne odstotkov aktivacije ali lestvice učinkovitosti.
- Med vadbo je prikaz pod **Mišice, izvedba in podlaga teže**. Osnovno potrjevanje naslednje serije ne zahteva novega tipkanja ali dodatnega obrazca.
- Če 3D ni na voljo, ostaneta shranjena slika konkretne vaje in zemljevid mišic. Slike, model in program so vključeni v lokalni paket za uporabo brez povezave po namestitvi.

## Model in gibanje

Človeško telo izvira iz MakeHuman core **grafičnih podatkov CC0**, pripetih na revizijo `a8bc2d54ff0ac92e78ff71431b1023eda42bf482`. Vse izvorne datoteke in SHA-256 so v `src/assets/athlete-source.json`; licenca je ob modelu in v `public/licenses`. Programskega dela MakeHuman ne vključujemo. Three.js in Meshoptimizer sta pod MIT.

`scripts/build-athlete.py` iz podatkov ustvari odraslega atleta s 163 kostmi, bolj pusto in mišičasto postavo, izvirnim reliefom prsnih/trebušnih mišic, poudarjenimi nadlahtmi/rameni ter kratkimi hlačami. `scripts/optimize-athlete.mjs` izdela stisnjeni model in osveži njegov hash. `scripts/render-exercise-posters.mjs` iz dejanskih prizorov izdela slike knjižnice. Naprave so izvirna proceduralna geometrija.

Komolec rešuje dvosegmentni tečaj v skupni ravnini. Razdeljene kožne kosti ohranjajo isti togi premik segmenta. Vizualna animacija omeji upogib komolca na 6–145° in pronacijo/supinacijo podlakti na ±85°; zapestje pri prijemu ohrani nevtralni lokalni položaj. Pri opori na odprto dlan je izteg zapestja izrecno omejen na največ 75°. To so omejitve tega prikaza, ne individualno predpisan obseg vadbe. Pri zgibih se prijem dodatno poravna s fiksnim drogom. Prikazi ostajajo orientacijski za običajno izvedbo in ne reproducirajo vsakega modela naprave.

Splošno poimenovana **Naprava za trup** nima izmišljenega giba: izvedbo je treba najprej določiti. Zato ima katalog 132 vnosov in 131 konkretnih 3D prikazov. Pri deski je položaj pravilno statičen.

## Ohranjanje podatkov

Izvirnih **55 ID-jev, imen, vzdevkov, opreme in načinov zapisovanja** ni spremenjenih. To preverja shranjeni seznam iz predhodne revizije. Nove različice dobijo nove ID-je in svojo zgodovino. Smithova naprava, prosta palica, enoročna izvedba in asistenca niso ista obremenitev. Stare lastne vaje se ne preimenujejo.

Shema IndexedDB `tezisce/state/current`, zgodovina, predloge, osnutki, aktivna vadba, uvozi in `device:*` ostajajo isti. Ogled ne zapisuje podatkov. Dodana je mišična skupina notranjih stegenskih za novo adukcijsko napravo; obstoječa omejitev dveh vaj na glavno skupino ostaja. Worker, D1, ključ povezave in priporočanje tež niso spremenjeni.

## Preverjanje

Preizkus z dejanskim modelom vzorči celoten cikel vsake konkretne vaje: enake dolžine nadlakti/podlakti, dovoljene kote komolcev, nevtralna zapestja in zveznost rotacij. Preizkusi kataloga preverjajo stare identitete, enolične vzdevke in pokritost prikazov. Brskalniški tokovi preverjajo predvajanje, drsnik, zemljevid, mobilne širine, uporabo brez povezave, varni rezervni prikaz in enakost celotne sintetične zbirke ter ključev.

Ohranjena je tudi predhodna izboljšava `posodobi.html`: stran ponovno uporabi registracijo service workerja in opazuje namestitev tudi, če Safari ne zaključi obljube `update()`. Nobena posodobitev ne briše zbirke ali registracij. Preizkusi uporabljajo Chromium in WebKit; to ni preizkus na fizičnem iPhonu.
