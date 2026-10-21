# Trening 0.3

## Uporaba

Aktivni trening se privzeto odpre v **Hitrem pogledu**. Prikazana je ena vaja in naslednja neopravljena serija. Težo in ponovitve spremeniš z gumboma +/− ali z neposrednim vnosom; decimalna vejica je podprta. **Serija opravljena** potrdi samo to serijo. Kratka zaščita pred dvojnim dotikom prepreči, da bi isti hiter pritisk potrdil še naslednjo serijo.

**Enaka teža in ponovitve za preostale serije** je izrecna izbira in spremeni samo neopravljene serije iste vrste. Ko prvič zabeležiš delovno serijo pri novi vaji, se njene vrednosti prenesejo samo v še prazne delovne vnose. Načrtovane drugačne teže ostanejo ohranjene. RIR je neobvezen in se izbere z dotikom. Nobena predlagana vrednost ali nova serija ni samodejno označena kot opravljena.

Opravljene serije so spodaj z možnostjo posamične razveljavitve. **Pregled vaj** omogoča preskok na katerokoli vajo; **Naslednja vaja** vodi naprej po načrtu. **Vse serije** odpre obstoječi podrobni urejevalnik z vsemi nastavitvami, opombami, kalibracijo in zamenjavami naprav. Zasedena naprava, dodajanje vaj in serij ostanejo dosegljivi tudi v hitrem pogledu.

## Knjižnica vaj in skice

Knjižnica vsebuje **55 vaj** za glavne mišične skupine: naprave, kable, palico, ročke, lastno težo in asistenco. Na voljo je v programu ter pri dodajanju v predlogo ali aktivni trening. Iskanje podpira slovenska in izbrana angleška imena; filtriraš lahko mišice in opremo. Vsaka vaja ima izvirno shematsko skico začetnega in končnega položaja ter kratka navodila. Skice so vgrajene v aplikacijo in delujejo brez omrežja. Ne prikazujejo vsake podrobnosti tehnike ali konkretne znamke naprave.

Izbor zajema uveljavljene večsklepne in dopolnilne gibalne vzorce. Ne gre za izmišljeno svetovno lestvico najboljših vaj. [ACSM 2026](https://acsm.org/resistance-training-guidelines-update-2026/) podpira prilagodljivo izbiro opreme in poudarja rednost ter progresivno vadbo; ne določa ene najboljše vaje za vse. [Haugen 2023](https://pubmed.ncbi.nlm.nih.gov/37582807/) ugotavlja specifičnost pridobivanja moči glede na uporabljeno opremo. Vira sta ponovno pregledana 21. 10. 2026.

## Zadnji rezultat in uvodne ocene

Pri isti vaji se pokaže **zadnji dejanski zapis**, tudi če je nižji od starega rekorda. Ohranijo se različne teže in ponovitve po serijah. Pri izrecnem začetku nove ročne predloge se primerljive, potrjene in nedavne delovne vrednosti pripravijo samodejno. Obstoječa predloga in zgodovina se pri tem ne spremenita. Odprtje ali posodobitev že aktivnega treninga ne poseže v njegov načrt.

Če primerljivost opreme ni potrjena, je zadnji zapis še vedno viden kot shranjen; številk iz drugačne naprave ali načina beleženja aplikacija ne kopira samodejno. Uvoženim podatkom ne pripisuje novega načina obremenitve ali vrste serij. Natančni prepoznani vzdevki služijo prikazu mišic/skice in iskanju, ne preimenovanju izvornih ID-jev.

Za še neizvedene **sorodne različice s prostimi utežmi** obstaja izbirna **Uvodna ocena · nizka zanesljivost**. Omejena je na družine ravnega/poševnega potiska, ramenskega potiska, veslanja, upogiba komolca, romunskega mrtvega dviga in izpadnega/bolgarskega počepa. Uporablja do tri najnovejše različne sorodne vaje v zadnjih 60 dneh, potrjene številčne enote in opravljene delovne serije s 3–20 ponovitvami. Ogrevanja, boleči zapisi in neznane enote niso izhodišče. Lastna zgodovina ciljne vaje ima vedno prednost.

Ocena normalizira dve ročki proti skupni teži palice, uporabi mediano zadnjih delovnih serij, omeji prilagoditev ponovitev navzdol in predlaga lahek začetni poskus pri približno 60 % tega izhodišča (razpon 50–70 %). Po več kot 14 dneh izhodišče dodatno zmanjša za 10 %, nato zaokroži navzdol na uporabnikov korak. To so pregledne **produktne hevristike**, ne klinično ali športno validirana pretvorba, ocena pripravljenosti v odstotkih ali izmerjen 1RM. Oceno uporabnik izrecno uporabi in preveri z lahko uvodno serijo. Ne prenaša se med napravami z neznanim vzvodom/kabelskim razmerjem ali med različnima gibalnima vzorcema samo zato, ker imata eno skupno mišico.

Lastna teža pomeni dodatne kg, ročke težo ene ročke (pri goblet počepu in iztegu tricepsa ene uteži), palica skupno težo s palico, asistenca pa kg pomoči. Pri asistenci več pomoči pomeni lažjo izvedbo.

## Ohranitev podatkov in preverjanje

Ohranijo se isti naslov aplikacije, IndexedDB **tezisce**, različica zbirke **1**, shramba **state** in ključ **current**. Shema varnostne kopije ostane 1. Nobena začetna migracija ne prepisuje obstoječih treningov, meritev, predlog, uvozov, nastavitev trenerja, Apple Health kode ali aktivnega treninga. Ključi povezave med napravami ostanejo v obstoječih lokalnih vnosih `device:*`.

Preizkusi vključujejo zadnje nižje teže, različne teže posameznih serij, neznane enote in drugačne naprave, izločitev bolečih/starih/ogrevalnih zapisov, uporabo ocen brez potrjevanja opravljenih serij ter obnovitev varnostnih kopij. Brskalniški preizkus najprej zažene dejansko prejšnjo objavo Pages `23b576f`, vstavi sintetično zgodovino in aktivni trening, nato namesti nov service worker in primerja celotno zbirko pred in po posodobitvi. Dodatni tokovi preverijo hitro beleženje, zaščito pred dvojnim dotikom, razveljavitev, knjižnico in širine telefona 320/390 px ter računalnika.
