# Objavi na GitHub Pages

Aplikacija uporablja obstoječi repozitorij `TimBajc1992/turbo-octo-pancake` in naslov https://timbajc1992.github.io/turbo-octo-pancake/.

Objava nadgradnje Moj trener uporablja `.github/workflows/pages.yml` in **Settings → Pages → Source: GitHub Actions** namesto prejšnje veje `gh-pages`. Naslov, izvor in pot ostanejo isti, zato lokalna zbirka v obstoječem brskalniku ostane dosegljiva. Stara veja ostane ohranjena.

Ob potisku na `main` (ali ročnem zagonu workflowa) se izvedejo `npm ci`, podatkovni testi, produkcijska gradnja s predpono repozitorija in brskalniški testi. Objavi se samo `dist/`, brez osebnih podatkov, raziskovalnih delovnih datotek ali izvorne datoteke Pulse. Workflow uporablja začasni GitHubov `GITHUB_TOKEN` in OIDC; osebni žeton ni del kode.

Po objavi preveri uspešno opravilo Actions in dejanski HTTPS naslov. Nameščena PWA lahko ponudi **Nova različica · Posodobi**, ko so trenutne spremembe shranjene. Posodobitev service workerja zamenja predpomnilnik aplikacije, ne briše IndexedDB. Na pravem iPhonu ostaja potrebno preverjanje Safarija, namestitve in vedenja v ozadju.

## Lokalno preverjanje poti GitHub Pages

```sh
VITE_BASE_PATH=/turbo-octo-pancake/ npm run build
TEST_BASE_PATH=/turbo-octo-pancake/ npm run test:e2e
```

Privzeta gradnja z `npm run build` še naprej deluje na korenu domene. Predpona velja tudi za ikone, manifest, začetni URL PWA, območje service workerja in predpomnjene datoteke. Service worker briše samo svoje predpomnilnike v svojem območju.

Objava na novem izvoru ne prenese lokalne zbirke z druge domene. Najprej izvozi kopijo v starem brskalniku, nato jo obnovi na končnem naslovu ali znova zasebno uvozi izvorno datoteko.
