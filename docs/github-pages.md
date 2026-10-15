# Objavi na GitHub Pages

Pripravljeno za obstoječi repozitorij `TimBajc1992/turbo-octo-pancake`. To je alternativa Netlifyju in ročnemu nalaganju ZIP. Pripravljena konfiguracija sama še ne objavi strani.

1. Po uporabnikovi potrditvi naloži kodo aplikacije in `.github/workflows/pages.yml` v vejo `main` tega repozitorija. Osebnih podatkov ali datoteke Pulse ne dodajaj v Git.
2. V repozitoriju odpri **Settings → Pages → Build and deployment → Source: GitHub Actions**. Za to nastavitev so potrebne ustrezne pravice na GitHubu. Dostopnost Pages je odvisna od vidnosti repozitorija in uporabniškega paketa; vidnosti ne spreminjaj brez uporabnikove potrditve.
3. V zavihku **Actions** zaženi **Objavi TEŽIŠČE na GitHub Pages → Run workflow**, če se objava ni že sprožila z nalaganjem na `main`.
4. Workflow namesti odvisnosti, izvede podatkovne teste, zgradi aplikacijo s predpono poti repozitorija in v Chromiumu preveri PWA, preden objavi samo mapo `dist/`.
5. Po uspešni objavi uporabi dejanski naslov iz rezultata opravila `deployment`. Za ta repozitorij pričakujemo obliko `https://timbajc1992.github.io/turbo-octo-pancake/`; ta naslov še ni potrjen kot delujoč.
6. Preveri stran prek HTTPS na telefonu, uvozi svoje podatke zasebno v brskalniku in v Safariju izberi **Deli → Dodaj na začetni zaslon**.

Workflow uporablja začasni GitHubov `GITHUB_TOKEN`, ki ga poda sam GitHub Actions, in OIDC za Pages. Ne potrebuje osebnega žetona v kodi ali klepetu. Preverjanje Git operacij v oblačnem okolju še ne potrjuje pravic za API, administracijo Pages ali oddaljeno objavo. V času priprave je omrežni posrednik oblačnega okolja dostop do `api.github.com` zavrnil s 403; vključitev Pages prek GitHubovega uporabniškega vmesnika je zato predviden ročni korak. To ni dokaz manjkajočega ali neveljavnega uporabniškega žetona.

## Lokalno preverjanje poti GitHub Pages

```sh
VITE_BASE_PATH=/turbo-octo-pancake/ npm run build
TEST_BASE_PATH=/turbo-octo-pancake/ npm run test:e2e
```

Privzeta gradnja z `npm run build` še naprej deluje na korenu domene. Predpona velja tudi za ikone, manifest, začetni URL PWA, območje service workerja in predpomnjene datoteke. Service worker briše samo svoje predpomnilnike v svojem območju.

Objava na novem izvoru ne prenese lokalne zbirke z druge domene. Najprej izvozi kopijo v starem brskalniku, nato jo obnovi na končnem naslovu ali znova zasebno uvozi izvorno datoteko.
