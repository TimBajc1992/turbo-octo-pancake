# Skupni podatki na telefonu in računalniku

Frontend ostaja na obstoječem GitHub Pages naslovu. Dodatni Cloudflare Worker in D1 shranjujeta **šifrirane** kopije. Ne uporablja se Supabase. Strežnik mora biti dejansko objavljen; zgolj pripravljena koda ne pomeni aktivne povezave.

## Enkratni dostop, nato vzdrževanje prek GitHuba

Začetno odobritev računa mora opraviti njegov lastnik. V tej seji ni povezave Cloudflare, izvajalno okolje nima skrivnosti Cloudflare, GitHubova integracija pa vrača 403 pri dostopu do repository secrets/variables. Tega ne nadomestimo z žetonom v kodi ali klepetu.

1. V [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens) ustvari namenski žeton samo za izbrani račun TEŽIŠČA: **Account → Workers Scripts → Edit**, **Account → D1 → Edit**, **Account → Account Settings → Read**. Ne uporabi Global API Key. Dovoljenja za DNS ali druge domene niso potrebna. Žeton lahko lastnik kasneje prekliče.
2. V [GitHub → Settings → Secrets and variables → Actions](https://github.com/TimBajc1992/turbo-octo-pancake/settings/secrets/actions) enkrat dodaj:

   | Repository secret        | Vsebina                                                                                 |
   | ------------------------ | --------------------------------------------------------------------------------------- |
   | `CLOUDFLARE_API_TOKEN`   | Namenski omejeni žeton iz prejšnjega koraka                                             |
   | `CLOUDFLARE_ACCOUNT_ID`  | Account ID iz računa Cloudflare                                                         |
   | `TEZISCE_SYNC_SETUP_KEY` | Nova naključna namestitvena koda dolžine vsaj 32 znakov; shrani jo v upravljalnik gesel |

3. Po združitvi sprememb v `main` zaženi **Actions → Objavi šifrirano sinhronizacijo Cloudflare**. Naslednje spremembe strežnika ta workflow sprožijo samodejno. Zahtevana dovoljenja niso vključena v izvorno kodo. Workflow ne spreminja nastavitev plačljivega paketa; poraba in omejitve računa so odvisne od obstoječega paketa Cloudflare.
4. Workflow namesti zaklenjene odvisnosti, preveri teste, ustvari ali ponovno uporabi D1 `tezisce-sync`, izvede samo dodajalno shemo, nastavi Worker secret in objavi Worker `tezisce-sync`. Novo D1 ustvari z jurisdikcijo EU. Že obstoječe zbirke nikoli ne zamenja z novo. Če obstoječa zbirka ni ustrezne jurisdikcije, selitev zahteva ločen pregled; identifikatorja ne izmišljamo.
5. Uspešna objava preveri `/health`, dejanski HTTPS naslov izpiše v povzetek Actions ter ga zapiše kot status `tezisce-cloudflare` pri commitu. Tako ga lahko pomočnik prebere prek GitHuba brez branja skrivnosti. Ustvarjanje osebne šifrirane shrambe ni del workflowa: šifrirni ključ mora nastati v tvojem brskalniku.

Lokalna alternativa je `node scripts/deploy-cloudflare.mjs` z istimi spremenljivkami v varno konfiguriranem okolju. Žeton se ne izpisuje; konfiguracija z dejanskim D1 ID je prezrta datoteka `cloudflare/wrangler.generated.json`. Za okolje z omejenim omrežjem mora biti dostop Cloudflare posebej dovoljen; GitHub Actions ne uporablja omrežne politike te seje.

Nastavitve GitHub Pages ostanejo na `gh-pages`. Prejšnji workflow Pages na `main` trenutno ustavijo pravila zaščite okolja »github-pages« (izrecno zavrnjena veja `main`); ločeni workflow Cloudflare tega okolja ne uporablja in ne spreminja njegovih pravil.

## Povezava naprav

1. Na telefonu, kjer so pravilni obstoječi podatki, izvozi varnostno kopijo. Odpri **Nastavitve → Telefon in računalnik**.
2. Izberi **Prva naprava**, vnesi dejanski naslov Workerja in namestitveno kodo (ne Cloudflare API žetona). Potrdi šifrirano spletno shranjevanje. **Ustvari šifrirano shrambo** ustvari naključni ID, ločen dostopni ključ in šifrirni ključ v tvojem brskalniku.
3. Prikaži in zasebno shrani **kodo za drugo napravo**. Ta koda vsebuje dostop in dešifrirni ključ. Ne pošiljaj je v klepet, GitHub, javne povezave ali posnetke zaslona. Ni je mogoče obnoviti samo iz podatkov na strežniku.
4. Na računalniku odpri isto aplikacijo, izberi **Dodatna naprava** in prilepi kodo. Pred prevzemom izvozi lokalno kopijo. Prevzem zamenja lokalni skupni nabor; aplikacija shrani tudi zadnjih pet lokalnih varnostnih kopij pred prevzemom. Dodatna naprava s svojim privzetim praznim programom ne prepiše telefona.
5. V odprti aplikaciji se lokalne spremembe po shranjevanju pošljejo z zamikom približno 2,5 sekunde. Posodobitve drugih naprav se preverijo približno vsakih 30 sekund, ob vrnitvi v aplikacijo ali prek **Sinhroniziraj zdaj**. Zaprta PWA ne prenaša podatkov v ozadju. Brez omrežja lokalno delo ostane mogoče.

Prenesejo se profil, zgodovina, meritve, dnevni zapisi, programi, aktivni trening, podatki trenerja in uvozni paketi. Lokalna koda/privolitev za Apple Bližnjice se ne kopira na drugo napravo. Prejeti dnevni zapisi in HRV/utrip se prenesejo, saj so del podatkovne zbirke. Safari in nameščena PWA lahko hranita ločeni zbirki; če uporabljaš oba, ju poveži ločeno z isto zasebno kodo.

## Sočasne spremembe in ohranitev podatkov

Za združevanje se uporabijo zadnja skupna različica, lokalna različica in najnovejša oblačna različica. Neodvisni zapisi in različna polja profila se združijo. Sprememba istega zapisa na dveh napravah, brisanje proti urejanju ali sočasno spreminjanje aktivnega treninga ustavi samodejni prenos. Serij dveh sočasno urejanih treningov ne združujemo v izmišljeno opravljen trening.

Ob sporu je mogoč izvoz obeh različic. Izrecna izbira celotne lokalne ali oblačne zbirke zahteva potrditev in pred zamenjavo shrani obe kopiji tudi v lokalno zbirko te naprave; na voljo je izvoz kopij pred razrešitvijo. Brez izrecne izbire ni tihega prepisovanja. Aktivni trening urejaj na eni napravi, na drugih ga glej.

Strežnik vsak zapis sprejme samo ob ujemanju pričakovane revizije (`If-Match`). Cloudflare D1 transakcijsko preveri različico; tekmujoča zahteva dobi 409 in mora najprej ponovno prebrati stanje. Zadnjih deset predhodnih šifriranih različic ostane v D1 zgodovini. Preverjanje lokalne revizije prepreči tudi prepis zaradi zastarelega zavihka.

Meja ene kopije je 1 MiB nešifriranega JSON; šifrirani paket mora biti manjši od 1.500.000 bajtov, kar upošteva omejitev velikosti vrstice D1. Večje zbirke se zavrnejo brez krajšanja ali brisanja; lokalna zbirka in izvoz ostaneta uporabna. Za večje zbirke je potrebna kasnejša razdelitev v več objektov ali druga shramba.

## Zasebnost in operativne meje

- AES-256-GCM uporablja svežo 96-bitno inicializacijsko vrednost za vsako kopijo in preverjanje integritete. Ključi so naključni, ne uporabnikova šibka gesla.
- Strežnik hrani šifrirano vsebino, različico, čas in SHA-256 odtis ločenega naključnega dostopnega ključa. Dešifrirni ključ se strežniku nikoli ne pošlje.
- Dovoljen izvor brskalnika je samo `https://timbajc1992.github.io`, vsak podatek pa dodatno zahteva dostopni ključ. CORS ni nadomestilo za preverjanje ključa. Noben endpoint ne vrača seznamov drugih shramb.
- Worker ne beleži teles zahtev, ključev ali vsebine podatkov. Samodejna opazljivost Workerja je izklopljena; Cloudflare še vedno obdeluje običajne omrežne metapodatke in promet. Koda za povezavo se prenaša ročno, ne v URL.
- Ključ in lokalna osnova združevanja sta pod ločenim ključem IndexedDB, zunaj `State`; nista vključena v običajno varnostno kopijo ali šifrirano vsebino. Kodo za povezavo zato shrani zase posebej.
- **Odklopi to napravo** odstrani samo lokalno povezavo. Ne briše podatkov in ne prekliče že razdeljenih kod. Za preklic izgubljene kode je treba ustvariti novo shrambo ter prek pooblaščenega skrbnika odstraniti staro; stari dostop ne sme veljati za nove podatke.
- Pomočnik z omejenim žetonom lahko vzdržuje kodo, Worker in D1, ne more pa brati šifriranih podatkov brez tvoje zasebne kode. Skrbniška infrastruktura lahko še vedno izbriše ali poškoduje šifrirano vsebino, zato ostanejo zasebne kopije pomembne.

Lokalno so preverjeni šifriranje/dešifriranje, napačen ključ in spremenjeno šifrirano besedilo, združevanje/konflikti, dejanski lokalni runtime Worker+D1, avtorizacija, prevelike zahteve, revizije in brskalniški tok dveh naprav s testnim strežnikom. Živa objava Cloudflare in preizkus dejanskega računa zahtevata začetne poverilnice; dokler nista opravljena, se ne prikazuje izmišljena uspešna povezava.

Uradna dokumentacija, pregledana 15. 10. 2026: [Cloudflare D1 omejitve](https://developers.cloudflare.com/d1/platform/limits/), [Workers zunanji CI/CD](https://developers.cloudflare.com/workers/ci-cd/external-cicd/), [Wrangler API](https://developers.cloudflare.com/workers/wrangler/api/).
