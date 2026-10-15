import { useEffect, useRef, useState } from "react";
import { backup, readDeviceValue } from "./db";
import { type State } from "./model";
import {
  pairingCode,
  defaultSyncURL,
  checkSyncService,
  syncError,
} from "./syncApi";
import { type CloudSyncControl } from "./useCloudSync";
function download(state: State, label: string) {
  const url = URL.createObjectURL(
    new Blob([backup(state)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `tezisce-${label}-${new Date().toISOString().replaceAll(":", "-")}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
export function CloudSyncPanel({
  sync,
  state,
}: {
  sync: CloudSyncControl;
  state: State;
}) {
  const [mode, setMode] = useState<"create" | "join">("create"),
    [url, setURL] = useState(defaultSyncURL),
    [setup, setSetup] = useState(""),
    [code, setCode] = useState("");
  const [replaceConsent, setReplaceConsent] = useState(false);
  const [consent, setConsent] = useState(false),
    [message, setMessage] = useState(""),
    [showCode, setShowCode] = useState(false);
  const [checking, setChecking] = useState(false);
  const messageRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (message) messageRef.current?.scrollIntoView({ block: "nearest" });
  }, [message]);
  return (
    <section className="panel" aria-label="Sinhronizacija naprav">
      <h2>Telefon in računalnik</h2>
      <p role="status">{sync.status}</p>
      {message && (
        <p ref={messageRef} className="notice" role="alert">
          {message}
        </p>
      )}
      <p>
        Podatki se pred pošiljanjem šifrirajo v brskalniku (AES-GCM). Cloudflare
        hrani šifrirano kopijo; povezovalni ključ je samo na tvojih napravah.
        Gesla računa Cloudflare ali API žetona ne vnašaj tukaj.
      </p>
      {!sync.device ? (
        <>
          <p>
            Na telefonu z obstoječimi podatki izberi prvo napravo. Na
            računalniku izberi dodatno napravo in uporabi kodo s telefona. Dve
            ločeno ustvarjeni shrambi se ne povežeta med seboj.
          </p>
          <details>
            <summary>Najprej enkrat omogoči strežnik Cloudflare</summary>
            <p>
              V repozitoriju je pripravljen postopek »Objavi šifrirano
              sinhronizacijo Cloudflare«. Potrebuje omejen Cloudflare API žeton
              in Account ID v skrivnostih GitHub ter izbrano namestitveno kodo,
              dolgo vsaj 32 znakov. Ta koda dovoli ustvaritev shrambe in ni
              Cloudflare API žeton. Po uspešnem zagonu uporabi dejanski HTTPS
              naslov Workerja iz povzetka opravila. Dokler strežnik ni
              objavljen, povezava ni aktivna. Navodila so v docs/cloud-sync.md.
            </p>
          </details>
          <label>
            Ta naprava
            <select
              value={mode}
              onChange={(e) => {
                setMode(e.target.value as "create" | "join");
                setMessage("");
              }}
            >
              <option value="create">
                Prva naprava – objavi moje obstoječe podatke
              </option>
              <option value="join">
                Dodatna naprava – prevzemi skupne podatke
              </option>
            </select>
          </label>
          {mode === "create" ? (
            <>
              <label>
                Naslov strežnika Cloudflare
                <input
                  type="url"
                  autoComplete="off"
                  value={url}
                  onChange={(e) => setURL(e.target.value)}
                  placeholder="https://tezisce-sync.….workers.dev"
                />
              </label>
              <button
                className="button secondary"
                disabled={checking}
                onClick={async () => {
                  setChecking(true);
                  setMessage("Preverjam strežnik …");
                  try {
                    await checkSyncService(url);
                    setMessage(
                      "Strežnik je dosegljiv iz tega Safarija. Zdaj vnesi namestitveno kodo in ustvari shrambo.",
                    );
                  } catch (error) {
                    setMessage(syncError(error));
                  } finally {
                    setChecking(false);
                  }
                }}
              >
                {checking ? "Preverjam …" : "Preveri povezavo s strežnikom"}
              </button>
              <label>
                Namestitvena koda shrambe
                <input
                  type="password"
                  autoComplete="off"
                  value={setup}
                  onChange={(e) => setSetup(e.target.value)}
                />
              </label>
            </>
          ) : (
            <label>
              Koda za povezavo iz prve naprave
              <textarea
                autoComplete="off"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </label>
          )}
          <label className="check-label">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            Dovolim šifrirano spletno shranjevanje vseh svojih podatkov TEŽIŠČA.
            Ob dodajanju naprave bom prevzel skupno zbirko; prej bom izvozil
            lokalno kopijo.
          </label>
          <button
            className="button secondary"
            onClick={() => download(state, "pred-povezavo")}
          >
            Izvozi lokalno kopijo pred povezavo
          </button>
          <button
            className="button"
            disabled={sync.busy}
            onClick={async () => {
              setMessage("");
              if (!consent) {
                setMessage(
                  "Najprej označi Dovolim šifrirano spletno shranjevanje, nato ponovno pritisni gumb za povezavo.",
                );
                return;
              }
              try {
                await sync.connect(mode, mode === "create" ? url : code, setup);
                setSetup("");
                setCode("");
                setConsent(false);
              } catch (e) {
                setMessage(syncError(e));
              }
            }}
          >
            {sync.busy
              ? "Povezujem …"
              : mode === "create"
                ? "Ustvari šifrirano shrambo"
                : "Poveži napravo in prevzemi podatke"}
          </button>
        </>
      ) : (
        <>
          <p>
            <strong>Skupna shramba: {sync.device.id.slice(0, 8)}</strong>. Ta
            oznaka mora biti enaka na obeh napravah. Če se razlikuje, na
            računalniku izvozi lokalno kopijo, odklopi povezavo in uporabi kodo
            s telefona.
          </p>
          <p>
            Ob odprti aplikaciji se spremembe prenesejo po shranjevanju, druge
            naprave pa preverijo posodobitve približno vsakih 30 sekund in ob
            vrnitvi v aplikacijo. Zaprta aplikacija ne sinhronizira. Brez
            povezave lahko delaš lokalno.
          </p>
          <button
            className="button secondary"
            disabled={sync.busy}
            onClick={() => void sync.syncNow()}
          >
            {sync.busy ? "Sinhroniziram …" : "Sinhroniziraj zdaj"}
          </button>
          <button
            className="text-button"
            onClick={() => setShowCode(!showCode)}
          >
            {showCode ? "Skrij kodo" : "Pokaži kodo za drugo napravo"}
          </button>
          {showCode && (
            <>
              <label>
                Zasebna koda za povezavo
                <textarea readOnly value={pairingCode(sync.device)} />
              </label>
              <p>
                Kodo shrani tudi zase. Kdor jo ima, lahko bere in spreminja
                skupne podatke. Pozabljenega šifrirnega ključa ne morem
                obnoviti. Kode ne dodajaj v GitHub ali klepet.
              </p>
              <button
                className="button secondary"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(
                      pairingCode(sync.device!),
                    );
                    setMessage(
                      "Koda kopirana. Prilepi jo v Nastavitve → Telefon in računalnik na drugi napravi.",
                    );
                  } catch {
                    setMessage("Označi in kopiraj kodo ročno.");
                  }
                }}
              >
                Kopiraj kodo za povezavo
              </button>
            </>
          )}
          {sync.paused && (
            <>
              <p>
                Sinhronizacija je ustavljena zaradi različnih sprememb istega
                podatka. Izvozi obe različici, primerjaj ju in razreši razlike.
                Nobena različica ne bo samodejno prepisana. Pri aktivnem
                treningu urejaj samo na eni napravi.
              </p>
              <button
                className="button secondary"
                onClick={() => download(state, "lokalni-konflikt")}
              >
                Izvozi lokalno različico
              </button>
              {sync.conflictRemote && (
                <button
                  className="button secondary"
                  onClick={() =>
                    download(sync.conflictRemote!, "oblacni-konflikt")
                  }
                >
                  Izvozi oblačno različico
                </button>
              )}
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={replaceConsent}
                  onChange={(e) => setReplaceConsent(e.target.checked)}
                />
                Razumem: izbrana celotna zbirka bo imela prednost. Pred
                zamenjavo se lokalno shranita obe različici.
              </label>
              <button
                className="button secondary"
                disabled={!replaceConsent || sync.busy}
                onClick={async () => {
                  await sync.resolveConflict("remote");
                  setReplaceConsent(false);
                }}
              >
                Uporabi oblačno različico
              </button>
              <button
                className="button secondary"
                disabled={!replaceConsent || sync.busy}
                onClick={async () => {
                  await sync.resolveConflict("local");
                  setReplaceConsent(false);
                }}
              >
                Uporabi lokalno različico v oblaku
              </button>
              <button className="text-button" onClick={sync.resume}>
                Ponovno preveri po razrešitvi
              </button>
            </>
          )}
          <button
            className="text-button"
            disabled={sync.busy}
            onClick={async () => {
              try {
                await sync.disconnect();
                setShowCode(false);
              } catch {
                setMessage("Odklop ni uspel. Poskusi znova.");
              }
            }}
          >
            Odklopi to napravo
          </button>
          <p>
            Odklop ne briše lokalne ali oblačne zbirke in ne prekliče kode na
            drugih napravah. Nastavitev in ključ sta vezana na ta brskalnik;
            nameščeno PWA po potrebi poveži posebej z isto kodo. Samodejnega
            prenosa kode iz varnostne kopije ni.
          </p>
        </>
      )}
      <button
        className="text-button"
        onClick={async () => {
          const saved = await readDeviceValue<{ local: State; remote: State }>(
            "sync-conflict-safety",
          );
          if (saved) {
            download(saved.local, "pred-razresitvijo-lokalno");
            download(saved.remote, "pred-razresitvijo-oblak");
          } else setMessage("V tej napravi še ni shranjenih različic spora.");
        }}
      >
        Izvozi obe kopiji pred zadnjo razrešitvijo
      </button>
      <button
        className="text-button"
        onClick={async () => {
          const copies =
            await readDeviceValue<{ at: string; state: State }[]>(
              "sync-safety",
            );
          if (copies?.length) {
            download(copies[0].state, "pred-zamenjavo");
            setMessage(
              "Izvožena je zadnja lokalna varnostna kopija pred prevzemom podatkov.",
            );
          } else
            setMessage("V tej napravi še ni varnostne kopije sinhronizacije.");
        }}
      >
        Izvozi zadnjo kopijo pred prevzemom podatkov
      </button>
    </section>
  );
}
