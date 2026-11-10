# Anatomski prikaz 0.6.0

Isti človeški model je uporabljen pri napredku in vseh 131 določenih izvedbah vaj. Po uporabnikovi vizualni referenci ima podrobna mišična vlakna, svetlo fascijo, hladen steklast zunanji sloj in temne kratke hlače. Glavne mišice med prikazom vaje dobijo oranžen svetlobni poudarek, pomožne umirjeno rožnatega. To so oznake vloge pri običajni izvedbi, ne meritev aktivacije. Zunaj ilustracij ostaja tema kostne bele in polnočne modre; zlata je še vedno omejena na dosežke.

## Napredek

Gumba **Zdaj** in **Izhodišče** spreminjata samo pogled. Postavo lahko zavrtiš z vlečenjem ali s puščicama levo/desno, ko je prikaz izbran s tipkovnico. Zadnje številke, datumi in obrazci meritev ostajajo dejanski.

Telesna teža vpliva na splošni volumen pri isti višini. Obseg pasu posebej vpliva na pas in v tem predelu nadomesti splošno prilagoditev teži. Glava in stopala ohranijo velikost. Med primerjavo je izhodiščna postava vidna v prosojnem sloju. To je shematski prikaz sprememb, ne rekonstrukcija posameznikovega telesa ali izračun mišic in maščobe. Samo teža in pas ne določata resnične anatomije.

`body-shape.ts` vsebuje enako omejeno, zvezno deformacijo za 3D in rezervni 2D izris. Širina iz teže uporablja kvadratni koren razmerja zadnje in prve veljavne meritve, omejen na 75–130 %. Pas uporablja razmerje, omejeno na 70–135 %, s prostorsko lokalno in monotono prilagoditvijo. Brez dveh meritev iste vrste zanjo ne izmišljamo izhodišča. Domača stran uporablja lahek izris istega telesa; interaktivni 3D se naloži ob prikazu napredka.

## Površina in gibanje

Osnova je nespremenjen model MakeHuman CC0 iz `athlete-source.json`. Nova površina `anatomy-atlas.png` je bila generirana na lastnem izrisu sprednje in zadnje strani tega modela. Njen izvor, hash in projekcija so zapisani v `src/assets/anatomy-surface-source.json`. Referenčni posnetki niso uporabljeni kot slikovni podatki v aplikaciji. Tekstura je vezana na mirujočo geometrijo, zato mišična površina sledi obstoječemu kostnemu sistemu, namesto da bi bila nepremična slika nad animacijo.

Fizični material in studijska osvetlitev poudarita relief. Svetlobno žarenje se uporabi samo pri izvedbah vaj, če naprava podpira ustrezno grafično razširitev. Brez nje ostane osnovni osvetljeni material. Omejitve tečaja komolca, nevtralnih zapestij, dolžin segmentov in prijema ostajajo. Za običajni sedeči potisk z ročkami je začetni prijem dvignjen ob ramena z bolj navpičnima podlaktma; preverjanje še naprej vzorči celoten cikel vseh vaj.

Vseh 131 slik knjižnice in rezervni prikaz telesa so izrisani iz istega modela. Ob nedostopnem WebGL ostaneta shranjeni anatomski prikaz in zemljevid mišic. Paket vsebuje model, teksturo, slike in program tudi za uporabo brez povezave po shranitvi aplikacije.

## Podatki in predogled

Zbirka `tezisce/state/current`, njena različica, ključi naprav, varnostne kopije, trening v teku, predloge, zgodovina, Apple Health in šifrirana sinhronizacija ostajajo nespremenjeni. Ogled, zasuk, predvajanje in primerjava ne shranjujejo meritev ali treningov. Izvor, pot in identiteta nameščene aplikacije ostajajo enaki.

`previews/glass-anatomy/` uporablja dejanski komponenti prikaza telesa in vaj z vzorčnimi podatki samo v pomnilniku. Ne vključuje glavne aplikacije ali shrambe in ne registrira service workerja. Predogled je na `/predogled-anatomija/v1/`. Drsnika sta izključno predstavitev vpliva meritev.

Preverjanje zajema celotno stanje in ključe pred/po ogledu, dejansko spremembo slikovnih pik zaradi teže, ujemanje CPU/GPU deformacije, monotono obliko, gibanje, dostopnost, širine zaslonov, uporabo brez povezave in posodobitve iz starejših izdaj. Končni podatki objave so v `moc-forma-release.json`.
