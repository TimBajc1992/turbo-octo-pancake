# Prikaz mišic in izvedbe

Nadgradnja nadaljuje objavljeno Moč & Formo iz `main` (`924809e`), vključno z naknadnim ročnim vnosom, knjižnico 55 vaj in obstoječo zgodovino Težišča. Povezana Instagram objava `DejKeMjsoE-` je 8. 11. 2026 pri odpiranju in iskanju vrnila omejitev dostopa. Prikaz zato izhaja iz uporabnikovega opisa; ujemanje z dejanskim videom ni preverjeno. Grafika je izvirna, ni kopija slik ali posnetkov druge aplikacije.

## Uporaba

- **Knjižnica vaj → dotik slike** odpre prikaz konkretne vaje. Sam ogled ne izbere ali doda vaje v trening.
- **Mišice** pokaže telo od spredaj in zadaj. Turkizna označuje glavne mišice, jantarna pomožne. Dotik imena poudari predel in prikaže njegovo vlogo.
- **Izvedba** omogoča predvajanje, premor, drsnik in izbiro začetnega/končnega položaja. To je shematski 2D prikaz, ne video ali 3D model. Predvajanje se začne samo na uporabnikovo zahtevo in se ustavi, ko prikaz ni več viden.
- Med hitro vadbo je prikaz pod **Mišice, izvedba in podlaga teže**. Vidna ostane ista ena vaja in naslednja serija; nad osnovno beleženje ni dodanih novih podatkov ali polj.

Podlaga prikaza je grafitna, neodvisna od potrjenega kovinskega vmesnika Stara šola. Prikaz deluje brez zunanjih slik, knjižnic za 3D ali omrežnih zahtev. Novo besedilo in ikone so v slovenščini oziroma v obstoječih imenih vaj.

## Kaj pomenijo oznake mišic

Podatki v `exerciseAnatomy.ts` so ločeni od kataloga in zgodovine. Opisujejo običajne gibalne vloge 19 mišičnih predelov, vključno z razlikovanjem sprednjega/stranskega/zadnjega dela ramen ter široke hrbtne mišice in zgornjega dela hrbta. Glavne in pomožne mišice so uporabniške razlage; prikaz ne meri aktivacije, ne navaja odstotkov EMG in ne razvršča učinkovitosti vaj. Tehnika, prijem, naklon ter oprema lahko spremenijo poudarek.

Prikaz se opira na splošno funkcionalno anatomijo. Za pregled izbire mišičnih skupin sta bila uporabljena [ACE Exercise Library](https://www.acefitness.org/resources/everyone/exercise-library/) in [NASM Barbell Bench Press](https://www.nasm.org/resource-center/exercise-library/barbell-bench-press). Vira ne potrjujeta prikazane geometrije ali kvantitativne stopnje aktivacije.

Pri splošno poimenovani **Napravi za trup** ni izmišljenega zemljevida: najprej je treba vedeti, za kateri gib gre. Pri sedečih mečih je pojasnjen poudarek na globlji mišici soleus. Pri dvigu kolen v visu so upogibalke kolka ločene od trebušnih mišic, ki sodelujejo pri nadzoru in privihu medenice. Površinski prikaz je poenostavljen; ne prikazuje posamezne globoke mišice.

## Ohranjeni podatki

Shema, IndexedDB `tezisce/state/current`, ID-ji vaj, predloge, osnutki prihodnjih in naknadnih treningov, aktivna vadba, uvozi in `device:*` ostanejo isti. Branje prikaza nima zapisov v shrambo. Pravila največ dveh vaj na glavno skupino še naprej uporabljajo izvirni `training.ts`; dodatne anatomske oznake ne spreminjajo sestavljanja treningov ali predlaganja tež. Worker, D1 in ključi povezave niso spremenjeni.

## Preverjanje

Prvi celotni preizkus WebKit je odkril obstanek obstoječe posodobitvene strani pri prehodu iz stare objave `23b576f`. Stran zato ponovno uporabi že obstoječo registracijo service workerja, namesto ponovnega registriranja in takojšnjega dodatnega preverjanja. Vse začetne asinkrone operacije imajo časovno omejitev in ob obstanku vrnejo možnost ponovnega poskusa. Dodatni preizkusi simulirajo neodziven Safari in primerjajo celotne shranjene podatke. Posodobitvena stran ne briše podatkov ali registracij.

Preizkusi vključujejo pokritost kataloga, negotovo napravo, glavne/pomožne mišice, aktivno vadbo z vso sintetično zgodovino, dejansko predvajanje in drsnik, dotik sličice brez dodajanja vaje, širine 320/390/1440 px, prikaz brez povezave ter nespremenjene lokalne ključe. Oba prikaza sta preverjena z axe za WCAG 2 A/AA in 2.1 AA. Obstoječi preizkusi še naprej preverjajo stare posodobitve PWA, ročni vnos, podatke in sinhronizacijo. Pravega iPhona in nedostopne Instagram objave ti preizkusi ne vključujejo.
