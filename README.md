# TEŽIŠČE

**Manj kilogramov. Več moči.** Osebna aplikacija za beleženje treningov, meritev in napredka. React 19 + TypeScript + Vite, IndexedDB, brez strežniške zbirke in zunanjega AI.

## Zagon

Node.js 22 ali novejši (preverjeno z Node 24):

```sh
npm ci
npm run dev
```

Za produkcijsko različico z delovanjem brez povezave:

```sh
npm run build
npm run preview
```

Na svojem računalniku odpri naslov, ki ga izpiše Vite. Za dostop z iPhona produkcijsko mapo `dist/` objavi na gostovanju z **HTTPS** in podporo statičnim datotekam. Privzeta gradnja uporablja koren domene `/`. Za GitHub Pages je pripravljena tudi gradnja na poti repozitorija; glej [navodila za GitHub Pages](docs/github-pages.md). V Safariju izberi **Deli → Dodaj na začetni zaslon**. Service worker se registrira samo v produkcijski gradnji; ob prvi namestitvi shrani tudi vse datoteke z zgoščenimi imeni. Počakaj na prvi uspešen spletni obisk, preden preklopiš brez povezave. Posodobitev se aktivira po zaprtju obstoječih oken aplikacije.

## Prva uporaba

1. Odpri **Nastavitve in profil → Uvozi zgodovino Pulse** ali uvozi z zaslona Danes/Zgodovina. Izberi svojo zasebno `pulse-zgodovina.json`.
2. Preveri število zapisov, opozorila in morebitne konflikte. Klikni **Potrdi uvoz**. Datoteka se bere v brskalniku in se ne pošlje na strežnik.
3. Potrdi profil, cilj, čas, opremo, izkušnje in omejitve. Uvožene profilne mere brez datuma niso dodane kot današnje meritve.
4. V zavihku **Trening** sestavi predlogo ali izberi zadnji trening skupine kot izhodišče. Štiri prazne začetne predloge niso potrjen osebni program. Nastavi naslednji trening v zaporedju, po želji izberi dneve v profilu.
5. Pri vajah potrdi način beleženja, konkretno opremo, razpon in korak. Predizpolnjena serija ni opravljena, dokler je ne potrdiš. Gumb za potrditev omogoča tudi razveljavitev. Zgodovinske neznane lastnosti pusti neznane, dokler jih ne moreš potrditi.
6. Redno izvažaj **celotno varnostno kopijo**. Obnovitev ima predogled in nadomesti trenutno lokalno zbirko; ne združuje dveh kopij.

**Podatki ostajajo v brskalniku konkretne naprave in izvora (domena + protokol + vrata). Ni samodejne sinhronizacije.** Brisanje podatkov brskalnika jih odstrani. Izvoz vključuje tudi aktivni trening, časovnik, profil, izvorne pakete in revizijske podatke. Počakaj na prikaz »Shranjeno v tej napravi« pred zaprtjem; ob napaki izvozi kopijo. Brskalnik mora podpirati IndexedDB. Zasebno brskanje ni priporočeno za trajno zbirko.

## Implementirano

- Danes: naslednji trening, dejanski datumi meritev, sprememba teže, meritveni graf, zadnji obseg pasu, treningi v tekočem tednu brez izmišljenega cilja.
- Meritve: dodajanje, popravljanje in brisanje; tedenska povprečja s številom meritev in 7-dnevno povprečje samo iz dejanskih meritev. Ločena grafa teže in pasu.
- Program: ročne predloge, ciljne serije in ponovitve, počitek, način obremenitve, oprema, korak, kardio, zaporedje in izbrani dnevi.
- Aktivni trening: vsaka serija posebej, ogrevanje/delovna/neznana, neobvezen RIR, opombe in bolečina, kopiranje primerljivih zadnjih vrednosti, zamenjava vaje brez prenosa obremenitve. Samodejno shranjevanje vsakega vnosa v IndexedDB.
- Čas treninga in počitek iz časovnih oznak. Obvestila pri zaklenjenem telefonu niso zagotovljena.
- Razložljiva pravila: zadnje primerljive opravljene delovne serije, potrjen razpon/korak/oprema, premor, RIR in bolečina/opombe. Brez RIR ni avtomatskega povečanja. Pri asistenci večja moč pomeni manj pomoči. Predlog lahko potrdiš ali vneseš lastne vrednosti. Neznanih zgodovinskih načrtov ne pretvarjamo v potrjene.
- Zgodovina: popravljanje dejanskih serij/datumov/trajanj; rekordi in grafi se izračunajo znova. Rekordi po številu ponovitev, primerjava teže pri istih ponovitvah in obratno, z datumi in omejitvijo na isto identiteto/opremo. Ocena 1RM ni vključena.
- Dnevni ročni vnos korakov, srčnega utripa, aktivne energije, vadbe, stanja in spanja. Prazna polja ostanejo neznana.
- Slovenski UI, kg/cm, ozki mobilni zasloni, tipkovnica, sistemski modalni dialogi in oznake vnosov. Barva ni edini pokazatelj potrjene serije.

## Varen uvoz

`src/importer.ts` preveri `version: 1`, `source: pulse-v3`, tipe, koledarske datume, številke in podvojene izvorne ID. Napačna datoteka se ne uvozi delno. Datumi ostajajo koledarski nizi `YYYY-MM-DD`. `exerciseId` je identiteta vaje; `slotId` se ohrani samo v surovih podatkih.

- Izvorni paketi in surovi zapisi se ohranijo brez sprememb; vsak uvožen zapis je povezan s paketom.
- Ponovitev enakega uvoza preskoči zapise, vključno z lokalno popravljenimi zapisi istega nespremenjenega izvora.
- Spremenjen izvor z istim ID pokaže konflikt. Privzeto se ohrani trenutni zapis, uporabnik lahko izbere zamenjavo za posamezen zapis.
- Razveljavitev vrne zamenjani prejšnji zapis oziroma odstrani dodani zapis samo, če od uvoza ni bil spremenjen. Poznejše lokalne popravke in nove zapise ohrani. Paketi ostanejo v revizijski zgodovini; surovi podatki so del kopije.
- Meritve brez izvornega ID uporabljajo kombinacijo vrste in koledarskega datuma. Več takšnih izvornih meritev iste vrste istega dne je dvoumnih in se zavrne.
- Trajanja ≤ 1 min se ohranijo in do ročne potrditve izločijo iz povzetkov trajanja. Serije veljajo naprej.
- `bestLoads` se preveri glede na največjo opravljeno obremenitev; pri izenačenju več ponovitev, nato najzgodnejši zapis. UI rekorde računa ločeno za posamezno število ponovitev.
- Zaporedje pomeni število zaporednih koledarskih tednov (ponedeljek–nedelja) z vsaj enim treningom z opravljeno serijo, do tekočega ali preteklega tedna.
- `watch.connected`, stari `daily.hr`, privzete ničle in `effort` ne ustvarijo novih fizioloških trditev ali povezave HealthKit.

Osebna datoteka ni v repozitoriju, javnih začetnih podatkih ali gradnji. Za razvoj so testi sintetični. Zasebni uvoz je treba izvesti v **svojem brskalniku**; validacija datoteke na razvojnem računalniku ni prenos podatkov na iPhone.

## Preverjanje

```sh
npm test
npm run build
# Če Chromium ni nameščen:
npx playwright install chromium
npm run test:e2e
# Zasebna dejanska datoteka (ne kopiraj je v repozitorij):
npm run validate:import -- /zasebna/pot/pulse-zgodovina.json
PULSE_TEST_FILE=/zasebna/pot/pulse-zgodovina.json npm run test:e2e
```

Brskalniški testi uporabljajo sistemski Chromium, če je na voljo, sicer Playwrightov brskalnik. Možen je `PLAYWRIGHT_CHROMIUM_EXECUTABLE`. Posnetki zaslona testov so izključno v `/tmp`; ob zagonu z osebno datoteko vsebujejo osebne podatke in se ne objavljajo. Testi preverijo uvoz, ponovni uvoz, lokalno shranjevanje aktivnega treninga, razveljavitev potrditve, obnovitev kopije, spremembo grafov po popravku, mobilno širino in resnično ponovno nalaganje brez povezave.

## Meje prve različice in naslednja faza

Ni prijave, strežniške sinhronizacije, samodejnega sestavljanja optimalnega programa, neposredne povezave Apple Health/Watch ali zagotovljenih opozoril v ozadju. Za osebni trening je na voljo ročno sestavljanje in previdna pravila napredovanja. Meritve dnevne aktivnosti se ohranijo; podrobne analize spanja/utripa so prihodnja faza. Na pravem iPhonu je treba še preveriti namestitev, tipkovnico in vedenje Safarija v ozadju; avtomatski mobilni testi uporabljajo Chromium.

Podatkovni tipi/preračuni so v `src/model.ts`, vhodni uvoz v `src/importer.ts`, trajna zbirka in kopije v `src/db.ts`, uporabniški sloj v `src/App.tsx`. API za shranjevanje je ločen, da lahko pozneje dodamo strežniški repozitorij. Glej [načrt iOS integracije](docs/ios-health.md).

## Moj trener

Novi modul na zaslonu **Danes** izbira uredljiv trening iz potrjenih naprav, zgodovine, časa in današnjega vprašalnika. Podpira razložljive predloge obremenitev, poskusno določanje teže na novi napravi, zasedene naprave, stalni osnovni program in samostojen kardio. Osebni podatki in stare kopije ostanejo ohranjeni. Za uporabo glej [Moj trener](docs/moj-trener.md), kjer so ločena praktična pravila, manjkajoče informacije in stanje preverjanja raziskovalnih virov.

Za izbrane povzetke Apple Health brez nove iOS aplikacije glej [prenos prek Bližnjic](docs/apple-shortcuts.md). Prvi zagon in dovoljenja je treba potrditi na telefonu.

Za šifrirano povezavo telefona in računalnika ter enkratni dostop Cloudflare glej [sinhronizacijo naprav](docs/cloud-sync.md). Brez dejansko objavljenega Workerja povezava ni aktivna.
