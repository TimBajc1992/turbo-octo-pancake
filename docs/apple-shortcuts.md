# Apple Health prek Bližnjic

Ta sprejemnik omogoča prenos izbranih dnevnih povzetkov iz Apple Health v TEŽIŠČE brez nove iOS aplikacije, App Store in Apple Developer podpisovanja. Bližnjica bere podatke z dovoljenjem uporabnika in odpre Safari. To ni neposredna povezava HealthKit ali tih prenos v zaprto PWA. Izvajanje na zaklenjenem telefonu ni zagotovljeno.

## Enkratna nastavitev

1. Posodobi TEŽIŠČE. V Safariju odpri obstoječi naslov in preveri svojo zgodovino. Nameščena PWA in Safari lahko hranita ločeni zbirki; če se razlikujeta, najprej izvozi celotno kopijo iz obstoječe PWA ter jo obnovi v Safariju. Uporabi en zavihek.
2. V **Nastavitve → Apple Health** preberi način prenosa in potrdi dovoljenje. Izberi **Omogoči sprejem iz Bližnjic**. S tem se v tem brskalniku ustvari koda za sprejem; to samo po sebi še ne prebere podatkov Health.
3. Odpri **Enkratna nastavitev Bližnjice na iPhonu**. Vključena so navodila po dejanjih in predloga slovarja s tvojo kodo. Predlogo kopiraj samo v svojo bližnjico. Besedilna mesta SPREMENLJIVKA moraš zamenjati z dejanskimi spremenljivkami datumov, časa in meritev; predloga ni testna meritev.
4. V Applovi aplikaciji Bližnjice sestavi dejanja za trenutni datum, iskanje zdravstvenih vzorcev, njihove številčne vrednosti, vsoto in slovar. Za korake in aktivno energijo izberi **en vir / eno napravo**, ne vsote vseh prekrivajočih se virov. Če vzorcev ni, polje izpusti ali ustavi bližnjico; ničla ne pomeni zavrnjenega dovoljenja.
5. Besedilo JSON slovarja enkrat URL-kodiraj, pripni za `https://timbajc1992.github.io/turbo-octo-pancake/#health=` in uporabi **Open URLs / Odpri URL-je**.
6. Prvič zaženi ročno in dovoli izbrane podatke Apple Health. Preveri datum in številke v TEŽIŠČU glede na isti vir v Apple Health. Šele nato dodaj osebno avtomatizacijo ob želenem času ali koncu vadbe Apple Watch; kadar je podprto, uporabi **Run Immediately / Zaženi takoj**.

Bližnjico je treba enkrat sestaviti na iPhonu. V repozitoriju ni podpisane datoteke `.shortcut` ali nameščene iCloud bližnjice. Sprejemnik in brskalniški tok sta avtomatsko preverjena, dejanska dovoljenja Health, natančna imena in razpoložljivost filtrov dejanj ter izvedba avtomatizacije pa zahtevajo prvi preizkus na resničnem iPhonu.

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
