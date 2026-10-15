# Objavi na GitHub Pages

Aplikacija uporablja obstoječi repozitorij `TimBajc1992/turbo-octo-pancake` in naslov https://timbajc1992.github.io/turbo-octo-pancake/.

Objava nadgradnje Moj trener uporablja obstoječi **Settings → Pages → Source: veja `gh-pages`, mapa `/`**. Naslov, izvor in pot ostanejo isti, zato lokalna zbirka v obstoječem brskalniku ostane dosegljiva. Objavljena je preverjena produkcijska gradnja iz PR #1 (`6bf77e2`), brez spremembe podatkovne sheme. Stare zgoščene datoteke v `assets/` so ohranjene tudi za že odprte odjemalce.

Pripravljeni `.github/workflows/pages.yml` predvideva GitHub Actions kot vir Pages, vendar ta preklop ni omogočen: API je vrnil 403 »Resource not accessible by integration«, zagon ob združitvi PR #1 pa je odpovedal pred prvim korakom. Zato je bila 15. 10. 2026 po uspešnih 38 podatkovnih testih, produkcijski gradnji in 5 brskalniških testih vsebina `dist/` objavljena v obstoječo vejo `gh-pages`. V javni gradnji ni osebnih podatkov, raziskovalnih delovnih datotek ali izvorne datoteke Pulse. Za prihodnje objave uporabi isti preverjeni postopek ali z ustreznimi pravicami omogoči Actions kot vir Pages. Osebni žeton ni del kode.

Po objavi preveri uspešno opravilo »pages build and deployment« in dejanski HTTPS naslov. Nameščena PWA lahko ponudi **Nova različica · Posodobi**, ko so trenutne spremembe shranjene. Posodobitev service workerja zamenja predpomnilnik aplikacije, ne briše IndexedDB. Na pravem iPhonu ostaja potrebno preverjanje Safarija, namestitve in vedenja v ozadju.

## Lokalno preverjanje poti GitHub Pages

```sh
VITE_BASE_PATH=/turbo-octo-pancake/ npm run build
TEST_BASE_PATH=/turbo-octo-pancake/ npm run test:e2e
```

Privzeta gradnja z `npm run build` še naprej deluje na korenu domene. Predpona velja tudi za ikone, manifest, začetni URL PWA, območje service workerja in predpomnjene datoteke. Service worker briše samo svoje predpomnilnike v svojem območju.

Objava na novem izvoru ne prenese lokalne zbirke z druge domene. Najprej izvozi kopijo v starem brskalniku, nato jo obnovi na končnem naslovu ali znova zasebno uvozi izvorno datoteko.
