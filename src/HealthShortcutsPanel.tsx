import { useState } from "react";
import { type State, num, dateLabel } from "./model";

export function HealthShortcutsPanel({
  state,
  update,
}: {
  state: State;
  update: (fn: (s: State) => State) => void;
}) {
  const [consent, setConsent] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");
  const config = state.healthBridge;
  const template = JSON.stringify(
    {
      format: "tezisce-health-shortcuts",
      version: 1,
      token: config?.token,
      source: "Apple Watch",
      date: "SPREMENLJIVKA DATUM yyyy-MM-dd",
      updatedAt: "SPREMENLJIVKA TRENUTNI ČAS ISO 8601",
      steps: "SPREMENLJIVKA VSOTA KORAKOV",
    },
    null,
    2,
  );
  const rows = state.daily
    .filter((d) => d.source === "apple-shortcuts")
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 7);
  const observations = (state.coach?.observations ?? [])
    .filter((o) => o.source === "apple-shortcuts")
    .sort((a, b) => b.measuredAt.localeCompare(a.measuredAt))
    .slice(0, 6);
  return (
    <>
      <span className="badge neutral">
        {config?.lastImportAt
          ? "Podatki prejeti prek Bližnjic"
          : config?.enabled
            ? "Bližnjice · čaka na prvi prenos"
            : "Ni povezano"}
      </span>
      <p>
        iPhonova bližnjica prebere izbrane podatke Apple Health in za prenos
        odpre to stran v Safariju. Nova iOS aplikacija in Apple Developer račun
        nista potrebna. Neposredne povezave HealthKit ali prenosa v zaprto PWA
        ni.
      </p>
      <p>
        Bližnjica mora odpreti isti Safari in ta naslov. Če v Safariju ne vidiš
        svoje zgodovine iz nameščene PWA, najprej izvozi varnostno kopijo v PWA
        in jo obnovi tukaj. Za skupne podatke ju poveži z isto kodo v razdelku
        Telefon in računalnik.
      </p>
      <p>
        Pri prenosu uporabljaj en odprt zavihek TEŽIŠČA. Če se podatki medtem
        spremenijo v drugem zavihku, aplikacija prepreči prepis in zahteva
        ponovno odprtje; svoje neshranjene spremembe prej izvozi.
      </p>
      {!config?.enabled ? (
        <>
          <label className="check-label">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            Dovolim prenos izbranih dnevnih povzetkov prek povezave v Safari.
            Povezava lahko kratkotrajno ostane v zgodovini oziroma njeni
            sinhronizaciji.
          </label>
          <button
            className="button secondary"
            disabled={!consent}
            onClick={() =>
              update((s) => ({
                ...s,
                healthBridge: { enabled: true, token: crypto.randomUUID() },
              }))
            }
          >
            Omogoči sprejem iz Bližnjic
          </button>
        </>
      ) : (
        <>
          <p>
            Povezava prenaša povzetek v delu za znakom #, ki se ne pošlje
            GitHubu. TEŽIŠČE ta del ob odprtju odstrani. To ne zagotavlja
            izbrisa iz vseh sistemskih dnevnikov ali zgodovine. Kode in povezav
            ne deli z drugimi.
          </p>
          <h3>Dodaj pripravljeno Bližnjico</h3>
          <p>
            Dejanja v Bližnjici so že sestavljena: koraki, aktivna energija in
            minute vadbe iz iste ure. Enkrat jih mora potrditi tvoj Mac,
            prijavljen v iCloud; Apple Developer račun ni potreben. Nato
            Bližnjico dodaš na iPhone, dovoliš Health in izbereš svojo uro.
          </p>
          <div className="actions">
            <a
              className="button secondary"
              download
              href={`${import.meta.env.BASE_URL}shortcuts/TEZISCE-Apple-Health.zip?v=2`}
            >
              Prenesi paket Bližnjice · različica 2
            </a>
            <button
              className="button secondary"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(config.token);
                  setCopyStatus(
                    "Sprejemna koda kopirana. Prilepi jo v vprašanje ob dodajanju Bližnjice na iPhone.",
                  );
                } catch {
                  setCopyStatus(
                    "Kodo označi in kopiraj ročno iz spodnjega polja.",
                  );
                }
              }}
            >
              Kopiraj kodo za Bližnjico
            </button>
          </div>
          <label>
            Sprejemna koda za Bližnjico
            <input readOnly value={config.token} autoComplete="off" />
          </label>
          <ol>
            <li>
              Na Macu razširi preneseni ZIP. V Terminal prilepi spodnji ukaz. Ta
              uporabi vgrajeno Applovo orodje; svojih gesel ne vnašaj v TEŽIŠČE.
            </li>
            <li>
              Podpisano datoteko TEZISCE Apple Health.shortcut pošlji na iPhone
              prek AirDrop in jo tam odpri. Ob dodajanju prilepi zgornjo
              sprejemno kodo. Mac samo pripravi datoteko; Bližnjico zaženi na
              iPhonu.
            </li>
            <li>
              V prvem iskanju zdravstvenih vzorcev pri Vir izberi svojo uro
              namesto Vprašaj vsakič. Prvič zaženi ročno, dovoli Health ter
              preveri številke. Nato dodaj avtomatizacijo ob želenem času ali
              koncu vadbe.
            </li>
          </ol>
          <p>
            Različica 2 popravi tri prazne pogoje Če iz prvega paketa. Če imaš
            staro Bližnjico, zamenjaj mapo iz ZIP-a na Macu in ob dodajanju na
            iPhonu izberi zamenjavo obstoječe Bližnjice.
          </p>
          <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
            /bin/bash
            ~/Downloads/TEZISCE-Apple-Health/pripravi-bliznjico.command
          </pre>
          <p>
            Dokler ne prispe prvi dejanski povzetek, povezava ostane označena
            kot čakanje. Paket je pripravljen za prvi preizkus na iPhonu;
            dovoljenj in filtrov na tvoji uri ne more preveriti spletna stran.
          </p>
          <p role="status">{copyStatus}</p>
          <details>
            <summary>
              Ročna nastavitev na iPhonu, če nimaš Maca z iCloudom
            </summary>
            <p>
              Bližnjico sestavi v Applovi aplikaciji Bližnjice. Samodejna
              namestitev ni pripravljena; prvi zagon in dovoljenja preveri na
              svojem telefonu. Imena dejanj so odvisna od jezika iPhona.
            </p>
            <ol>
              <li>
                Ustvari bližnjico »TEŽIŠČE – Apple Health«. Dodaj Trenutni datum
                / Current Date. Datum oblikuj z vzorcem <code>yyyy-MM-dd</code>,
                čas prenosa pa kot ISO 8601 z odmikom časovnega pasu.
              </li>
              <li>
                Dodaj Poišči zdravstvene vzorce / Find Health Samples: Koraki /
                Steps, datum začetka je danes. Izberi samo en izvor, npr. svojo
                Apple Watch; ne seštevaj ure in telefona. Če imaš več ur,
                uporabi samo eno napravo. Če filtrov ne moreš nastaviti tako, da
                se vzorci ne prekrivajo, korakov ne prenašaj kot preverjene
                skupne vsote.
              </li>
              <li>
                Če ni vzorcev, ustavi bližnjico. Ne vstavljaj ničle. Pridobi
                vrednosti vzorcev v korakih in dodaj Izračunaj statistiko /
                Calculate Statistics → Vsota / Sum.
              </li>
              <li>
                Dodaj Slovar / Dictionary s spodnjimi ključi.{" "}
                <code>version</code> naj bo število 1, <code>steps</code> pa
                številčna spremenljivka vsote. V <code>date</code> in{" "}
                <code>updatedAt</code> vstavi datumski spremenljivki iz prvega
                koraka. Besedilo SPREMENLJIVKA ni dejanski podatek.
              </li>
              <li>
                Pridobi besedilo iz slovarja / Get Text from Input, nato Kodiraj
                URL / URL Encode. Kodiraj celotno besedilo JSON enkrat.
              </li>
              <li>
                Dodaj Besedilo / Text:{" "}
                <code>{`${location.origin}${import.meta.env.BASE_URL}#health=`}</code>{" "}
                in neposredno za enačaj vstavi kodirano besedilo. Dodaj Odpri
                URL-je / Open URLs.
              </li>
              <li>
                Prvič zaženi ročno, dovoli branje izbranih podatkov in preveri
                prikazano vsoto ter datum v TEŽIŠČU glede na isti izvor v Apple
                Health.
              </li>
              <li>
                V Bližnjice → Avtomatizacija izberi želeni čas ali konec vadbe
                Apple Watch in to bližnjico. Če je na voljo, izberi Zaženi takoj
                / Run Immediately. iPhone mora dovoliti dostop do zdravstvenih
                podatkov in odpiranje Safarija; pri zaklenjeni napravi izvedba
                ni zagotovljena.
              </li>
            </ol>
            <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
              {template}
            </pre>
            <button
              className="button secondary"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(template);
                  setCopyStatus(
                    "Predloga kopirana. Spremenljivke nastavi v Bližnjicah.",
                  );
                } catch {
                  setCopyStatus(
                    "Kopiranje ni uspelo. Predlogo označi in kopiraj ročno.",
                  );
                }
              }}
            >
              Kopiraj predlogo slovarja
            </button>
            <p>
              Neobvezna polja za isti dan in en izvor: <code>moveKcal</code>{" "}
              (aktivna energija v kcal), <code>exerciseMin</code> (minute vadbe)
              in <code>standHours</code> (število različnih ur s stanjem).
              Uporabi pravilne enote; ur stanja ne izračunaj s seštevanjem
              trajanja vzorcev. HRV: <code>hrvSDNN</code> v ms +{" "}
              <code>hrvMeasuredAt</code>; utrip v mirovanju:{" "}
              <code>restingHeartRate</code> v utripih/min +{" "}
              <code>restMeasuredAt</code>. Pri teh dveh uporabi zadnjo dejansko
              meritev in njen ISO čas, ne vsote ali časa prenosa. Manjkajoča
              polja izpusti.
            </p>
            <p>
              To so povzetki iz izbranega vira, zato se lahko razlikujejo od
              združenih obročev Gibanja. Spanje in podrobni treningi/serije se s
              tem prenosom ne uvažajo. HRV in utrip ne spreminjata priporočila
              trenerja ali predstavljata odstotka regeneracije.
            </p>
          </details>
          <button
            className="text-button"
            onClick={() =>
              update((s) => ({
                ...s,
                healthBridge: { ...s.healthBridge!, enabled: false },
              }))
            }
          >
            Izklopi sprejem iz Bližnjic
          </button>
          <p>
            Izklop ohrani že prejete podatke. Ponovni vklop ustvari novo kodo;
            staro bližnjico moraš nato posodobiti.
          </p>
        </>
      )}
      {config?.lastImportAt && (
        <p role="status">
          Zadnji prenos: {new Date(config.lastImportAt).toLocaleString("sl-SI")}{" "}
          · {config.lastSource} · datum podatkov {config.lastDate}. To ni dokaz
          stalne povezave z uro.
        </p>
      )}
      {rows.map((d) => (
        <p key={d.id}>
          {dateLabel(d.date, true)} · {d.sourceId}:{" "}
          {d.steps === undefined ? "" : `${num(d.steps, 0)} korakov · `}
          {d.moveKcal === undefined ? "" : `${num(d.moveKcal)} kcal · `}
          {d.exerciseMin === undefined
            ? ""
            : `${num(d.exerciseMin)} min vadbe · `}
          {d.standHours === undefined ? "" : `${d.standHours} ur stanja`}
        </p>
      ))}
      {observations.map((o) => (
        <p key={o.externalId}>
          {o.metric === "hrvSDNN" ? "HRV SDNN" : "Utrip v mirovanju"}:{" "}
          {num(o.value)} {o.metric === "hrvSDNN" ? "ms" : "/min"} ·{" "}
          {new Date(o.measuredAt).toLocaleString("sl-SI")} · okoliščine in
          kakovost niso preverjene
        </p>
      ))}
    </>
  );
}
