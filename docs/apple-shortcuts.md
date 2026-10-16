# Apple Health prek Bližnjic

Ta sprejemnik omogoča prenos izbranih dnevnih povzetkov iz Apple Health v TEŽIŠČE brez nove iOS aplikacije, App Store in Apple Developer podpisovanja. Bližnjica bere podatke z dovoljenjem uporabnika in odpre Safari. To ni neposredna povezava HealthKit ali tih prenos v zaprto PWA. Izvajanje na zaklenjenem telefonu ni zagotovljeno.

## Enkratna nastavitev

### Pripravljena Bližnjica: priprava na Macu, izvajanje na iPhonu

V aplikaciji je na voljo generični paket `shortcuts/TEZISCE-Apple-Health.zip`, zgrajen iz preglednega `scripts/build-health-shortcut.py`. Vsebuje že sestavljenih 42 dejanj za korake, aktivno energijo in minute vadbe. V paketu ni osebnih kod ali podatkov. ZIP vključuje izvorno nepodpisano datoteko, kratek ukaz za vgrajeno Applovo orodje ter navodila.

**Paket 2 (16. 10. 2026)** popravi tri pogoje `Če`, ki jih je iPhone prej prikazal kot prazno polje `Pogoj`. Vhod pogoja zahteva ovojnico `Type: Variable` z gnezdenim `Variable: WFTextTokenAttachment`, kot v izvirnem Applovem izvozu; navadna priponka ni veljaven vhod za to dejanje. Vsi trije pogoji preverjajo število vzorcev > 0. Regresijski preizkus bere dejansko datoteko iz objavljenega ZIP-a. Popravek strukture ne nadomesti prvega preizkusa na iPhonu.

Pri zamenjavi prvega paketa v Prenosih zamenjaj staro mapo `TEZISCE-Apple-Health` z mapo iz novega ZIP-a. Po pripravi datoteke na Macu jo ponovno pošlji na iPhone in zamenjaj staro istoimensko Bližnjico. Sprejemno kodo ponovno vzemi iz obstoječih nastavitev TEŽIŠČA; sprejema ni treba izklopiti ali ustvariti nove kode. Podatki aplikacije ostanejo shranjeni.

Apple je pri dejanskem poskusu na GitHubovem Macu podpis zavrnil z »In order to do this, you must be signed into iCloud.« Zato se paket ne predstavlja kot že podpisana namestitev. Na Macu, prijavljenem v iCloud, razširi ZIP v Prenosih in zaženi:

```sh
/bin/bash ~/Downloads/TEZISCE-Apple-Health/pripravi-bliznjico.command
```

To uporabi `shortcuts sign --mode anyone`, odpre Finder in označi podpisano datoteko `TEZISCE Apple Health.shortcut` (brez `.unsigned`). Pošlji jo na iPhone prek AirDrop. **Bližnjico zaženi samo na iPhonu.** Mac ne podpira dejanja Find Health Samples / Najdi zdravstvene vzorce. Ob dodajanju odgovori na uvozno vprašanje s sprejemno kodo iz Apple Health nastavitev TEŽIŠČA; to ni koda za namestitev Cloudflare ali povezavo naprav. V prvem iskanju zdravstvenih vzorcev izberi svojo uro pri Vir, namesto Vprašaj vsakič. Preostali poizvedbi uporabita vir prvega dejanskega vzorca korakov. Če korakov ni, bližnjica opozori in prenos ustavi. Neobstoječe energetske/vadbene vrednosti izpusti.

Prvi zagon na odklenjenem iPhonu, dovoljenja Health, dejanski filter vira in primerjava številk ostanejo potrebni. Ta tok še ni bil preverjen na uporabnikovem iPhonu in zato ni opisan kot uspešna povezava. Po prvem preverjenem prenosu nastavi osebno avtomatizacijo. Developer račun in nova aplikacija nista potrebna.

### Ročno sestavljanje, če nimaš Maca z iCloudom

1. Posodobi TEŽIŠČE. V Safariju odpri obstoječi naslov in preveri svojo zgodovino. Nameščena PWA in Safari lahko hranita ločeni zbirki; če se razlikujeta, najprej izvozi celotno kopijo iz obstoječe PWA ter jo obnovi v Safariju. Uporabi en zavihek.
2. V **Nastavitve → Apple Health** preberi način prenosa in potrdi dovoljenje. Izberi **Omogoči sprejem iz Bližnjic**. S tem se v tem brskalniku ustvari koda za sprejem; to samo po sebi še ne prebere podatkov Health.
3. Odpri **Enkratna nastavitev Bližnjice na iPhonu**. Vključena so navodila po dejanjih in predloga slovarja s tvojo kodo. Predlogo kopiraj samo v svojo bližnjico. Besedilna mesta SPREMENLJIVKA moraš zamenjati z dejanskimi spremenljivkami datumov, časa in meritev; predloga ni testna meritev.
4. V Applovi aplikaciji Bližnjice sestavi dejanja za trenutni datum, iskanje zdravstvenih vzorcev, njihove številčne vrednosti, vsoto in slovar. Za korake in aktivno energijo izberi **en vir / eno napravo**, ne vsote vseh prekrivajočih se virov. Če vzorcev ni, polje izpusti ali ustavi bližnjico; ničla ne pomeni zavrnjenega dovoljenja.
5. Besedilo JSON slovarja enkrat URL-kodiraj, pripni za `https://timbajc1992.github.io/turbo-octo-pancake/#health=` in uporabi **Open URLs / Odpri URL-je**.
6. Prvič zaženi ročno in dovoli izbrane podatke Apple Health. Preveri datum in številke v TEŽIŠČU glede na isti vir v Apple Health. Šele nato dodaj osebno avtomatizacijo ob želenem času ali koncu vadbe Apple Watch; kadar je podprto, uporabi **Run Immediately / Zaženi takoj**.

Ročno sestavljanje je rezervna možnost. V repozitoriju ni že podpisane datoteke `.shortcut` ali javne iCloud bližnjice; pripravljeni paket zahteva enkratno potrditev na lastnikovem Macu. Sprejemnik in brskalniški tok sta avtomatsko preverjena, dejanska dovoljenja Health, filtri dejanj ter izvedba avtomatizacije pa zahtevajo prvi preizkus na resničnem iPhonu.

## Podprti podatki

Obvezni ključi: `format: tezisce-health-shortcuts`, `version: 1` kot število, lokalna `token`, `source` (ime ene izbrane naprave), `date` (lokalni koledarski datum `yyyy-MM-dd`) ter `updatedAt` (čas priprave povzetka ISO 8601 z odmikom ali Z). Dodaj vsaj eno od spodnjih meritev.

| Ključ                                 | Pomen / enota                                                                         |
| ------------------------------------- | ------------------------------------------------------------------------------------- |
| `steps`                               | Celotno število korakov tega dne iz enega vira                                        |
| `moveKcal`                            | Aktivna energija, kcal (ne kJ ali celotna/bazalna energija)                           |
| `exerciseMin`                         | Minute vadbe tega dne, največ 1440                                                    |
| `standHours`                          | Število različnih ur s stanjem, 0–24; ne vsota minut ali trajanja vzorcev             |
| `hrvSDNN` + `hrvMeasuredAt`           | Zadnja dejanska SDNN meritev v ms in njen ISO čas; ne povprečje RMSSD ali čas prenosa |
| `restingHeartRate` + `restMeasuredAt` | Zadnja dejanska meritev utripa v mirovanju, utripi/min, in njen ISO čas               |

Manjkajoča polja izpusti. Vrednosti lahko predstavljajo del dneva; zlasti povzetek ene ure ni nujno enak združenim obročem aplikacije Gibanje. Spanje in podrobni treningi se v tej različici ne uvažajo. Uvoženi podatki ne potrjujejo počutja, ne označijo serij kot opravljenih in ne premaknejo programa moči. HRV ima neznane okoliščine/kakovost in ne vpliva na pravila regeneracije.

## Podatki in zasebnost

Povzetek se prenese v URL fragmentu za `#`, ki se pri HTTP zahtevi ne pošlje GitHubu. Obdelava ga odstrani iz trenutnega naslova prek `history.replaceState`; to ni jamstvo, da podatek nikoli ne pristane v zgodovini, sinhronizaciji brskalnika ali sistemskih dnevnikih. Zato je ta način pred vklopom izrecno pojasnjen. URL-jev s podatki in sprejemne kode ne deli z drugimi. V aplikaciji ni analitike ali pošiljanja meritev AI.

Dnevni zapisi se ločijo po viru in datumu, meritve HRV/utripa še po vrsti. Ponovitev posodobi samo isti zapis, starejši dnevni povzetek ne prepiše novejšega, ročni in Pulse zapisi ostanejo nedotaknjeni. Delni novejši prenos ohrani prej prejeta izpuščena polja. Manjkajoči podatki niso nadomeščeni z ničlami. Neprepoznana polja, napačna koda, neveljavne enote/vrednosti in preveliki paketi zavrnejo celoten prenos.

Izklop prepreči naslednje prenose, ne izbriše prejetih zapisov. Ponovni vklop zamenja kodo. Celotna varnostna kopija ohrani nastavitve in podatke. Shema zbirke ostane 1. Če drug zavihek spremeni zbirko pred shranjevanjem, atomsko preverjanje prepreči tihi prepis; neshranjene spremembe je treba izvoziti, nato ponovno odpreti aplikacijo.

## Uradni viri

Pregledano 15. 10. 2026: [Apple: avtomatizacije Bližnjic](https://support.apple.com/guide/shortcuts/add-automations-apdfbdbd7123/ios), [dogodkovni sprožilci](https://support.apple.com/guide/shortcuts/apd932ff833f/ios), [sheme URL](https://support.apple.com/guide/shortcuts/apd621a1ad7a/ios), [nastavitev HealthKit](https://developer.apple.com/documentation/healthkit/setting-up-healthkit), [dovoljenja za HealthKit](https://developer.apple.com/documentation/healthkit/authorizing-access-to-health-data). Dovoljenje za neposredni HealthKit ni nadomeščeno z uspešnim sprejemom JSON prek Bližnjic.
