"""Build a read-only Apple Health shortcut for signing on the owner's Mac.

No personal token, health data, or account credential is present in this source.
The import question supplies the browser-local receiving token on the iPhone.
Health filter shapes follow an exported iOS shortcut and the current locked Type
predicate documented by viticci/shortcuts-playground-plugin (HEALTHKIT.md).
Conditional inputs use the native export's Type=Variable envelope; a bare
WFTextTokenAttachment imports as an empty condition on the iPhone.
"""
import pathlib
import plistlib
import sys
import uuid
import zipfile

actions = []
NAMESPACE = uuid.UUID("3b5ced46-f5c9-4fbb-983a-11382d213ca4")


def add(kind, **params):
    identifier = str(uuid.uuid5(NAMESPACE, str(len(actions)) + kind)).upper()
    params["UUID"] = identifier
    actions.append({"WFWorkflowActionIdentifier": "is.workflow.actions." + kind,
                    "WFWorkflowActionParameters": params})
    return identifier


def output(identifier, name):
    return {"Type": "ActionOutput", "OutputUUID": identifier, "OutputName": name}


def variable(name):
    return {"Type": "Variable", "VariableName": name}


def token(value):
    return {"Value": value, "WFSerializationType": "WFTextTokenAttachment"}


def text(*parts):
    value, attachments = "", {}
    for part in parts:
        if isinstance(part, str):
            value += part
        else:
            position = len(value.encode("utf-16-le")) // 2
            attachments[f"{{{position}, 1}}"] = part
            value += "\ufffc"
    return {"Value": {"string": value, "attachmentsByRange": attachments},
            "WFSerializationType": "WFTextTokenString"}


def setvar(name, value):
    return add("setvariable", WFVariableName=name, WFInput=token(value))


def predicate(prop, operator, values, removable=False):
    return {"Property": prop, "Operator": operator, "Values": values,
            "Removable": removable, "Bounded": True}


def samples(kind, unit, source):
    state = lambda value: {"Value": value, "WFSerializationType": "WFStringSubstitutableState"}
    filters = [predicate("Type", 4, {"Enumeration": state(kind)}),
               predicate("Start Date", 1002, {"Number": "7", "Unit": 16}),
               predicate("Source", 4, {"Enumeration": state(token(source)), "Unit": 4}, True)]
    return add("filter.health.quantity", WFContentItemFilter={
        "Value": {"WFActionParameterFilterPrefix": 1, "WFContentPredicateBoundedDate": False,
                  "WFActionParameterFilterTemplates": filters},
        "WFSerializationType": "WFContentPredicateTableTemplate"},
        WFContentItemLimitEnabled=False, WFHKSampleFilteringUnit=unit)


def sum_samples(identifier):
    values = add("properties.health.quantity", WFContentItemPropertyName="Value",
                 WFInput=token(output(identifier, "Health Samples")))
    return add("statistics", WFStatisticsOperation="Sum", Input=token(output(values, "Value")))


def if_positive(identifier):
    count = add("count", Input=token(output(identifier, "Health Samples")), WFCountType="Items")
    group = str(uuid.uuid5(NAMESPACE, "if-" + identifier)).upper()
    add("conditional", GroupingIdentifier=group, WFControlFlowMode=0, WFCondition=2,
        WFInput={"Type": "Variable", "Variable": token(output(count, "Count"))},
        WFConditionalLegacyComparisonBehavior=True, WFNumberValue=0)
    return group


add("comment", WFCommentActionText="TEŽIŠČE · paket 2, popravljeni pogoji. Samo branje Apple Health NA IPHONU; Mac samo podpiše datoteko. Po dodajanju v prvem dejanju Poišči zdravstvene vzorce pri Vir izberi svojo Apple Watch namesto Vprašaj vsakič. Ostali poizvedbi uporabita isti vir. Če ni korakov, se prenos ustavi. Podatki odprejo TEŽIŠČE v Safariju; samodejni zagon nastavi po prvem preizkusu.")
receiving_token_index = len(actions)
receiving_token = add("gettext", WFTextActionText="VNESI_KODO_IZ_TEZISCA")
now = add("date", WFDateActionMode="Current Date")
day = add("format.date", WFDate=token(output(now, "Date")), WFDateFormatStyle="Custom", WFDateFormat="yyyy-MM-dd")
updated = add("format.date", WFDate=token(output(now, "Date")), WFDateFormatStyle="Custom", WFDateFormat="yyyy-MM-dd'T'HH:mm:ssZZZZZ")
steps = samples("Steps", "count", {"Type": "Ask"})
group = if_positive(steps)
steps_total = sum_samples(steps)
setvar("Koraki", output(steps_total, "Sum"))
first = add("getitemfromlist", WFInput=token(output(steps, "Health Samples")), WFItemSpecifier="First Item")
source = add("properties.health.quantity", WFContentItemPropertyName="Source", WFInput=token(output(first, "Item from List")))
setvar("Izvor", output(source, "Source"))
add("conditional", GroupingIdentifier=group, WFControlFlowMode=1)
add("alert", WFAlertActionTitle="Ni podatkov za prenos", WFAlertActionMessage="Dovoli branje korakov v Zdravje → Dovoljenja za Bližnjice ter v prvem iskanju izberi izvor svoje ure. Če danes še ni vzorcev, poskusi pozneje. Ničle ne bomo poslali kot dejanske meritve.", WFAlertActionCancelButtonShown=False)
add("exit")
add("conditional", GroupingIdentifier=group, WFControlFlowMode=2)

for label, unit, field, name in [("Active Calories", "kcal", "moveKcal", "Energija"),
                                ("Exercise Minutes", "min", "exerciseMin", "Vadba")]:
    empty = add("gettext", WFTextActionText="")
    setvar(name, output(empty, "Text"))
    found = samples(label, unit, variable("Izvor"))
    conditional = if_positive(found)
    total = sum_samples(found)
    fragment = add("gettext", WFTextActionText=text(',"' + field + '":"', output(total, "Sum"), '"'))
    setvar(name, output(fragment, "Text"))
    add("conditional", GroupingIdentifier=conditional, WFControlFlowMode=2)

packet = add("gettext", WFTextActionText=text(
    '{"format":"tezisce-health-shortcuts","version":1,"token":"', output(receiving_token, "Text"),
    '","source":"Apple Watch","date":"', output(day, "Formatted Date"),
    '","updatedAt":"', output(updated, "Formatted Date"), '","steps":"', variable("Koraki"),
    '"', variable("Energija"), variable("Vadba"), '}'))
encoded = add("urlencode", WFEncodeMode="Encode", WFInput=token(output(packet, "Text")))
link = add("gettext", WFTextActionText=text("https://timbajc1992.github.io/turbo-octo-pancake/#health=", output(encoded, "URL Encoded Text")))
add("openurl", WFInput=token(output(link, "Text")))

workflow = {
    "WFWorkflowActions": actions,
    "WFWorkflowClientVersion": "2600",
    "WFWorkflowMinimumClientVersion": 900,
    "WFWorkflowMinimumClientVersionString": "900",
    "WFWorkflowIcon": {"WFWorkflowIconStartColor": 4282601983, "WFWorkflowIconGlyphNumber": 59755},
    "WFWorkflowImportQuestions": [{"ActionIndex": receiving_token_index, "Category": "Parameter",
        "ParameterKey": "WFTextActionText", "DefaultValue": "",
        "Text": "Prilepi sprejemno kodo iz TEŽIŠČE → Nastavitve → Apple Health → Kopiraj kodo za Bližnjico. To ni namestitvena koda Cloudflare."}],
    "WFWorkflowInputContentItemClasses": [],
    "WFWorkflowTypes": [],
    "WFWorkflowHasShortcutInputVariables": False,
}
destination = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "work/TEZISCE Apple Health.shortcut")
destination.parent.mkdir(parents=True, exist_ok=True)
destination.write_bytes(plistlib.dumps(workflow, fmt=plistlib.FMT_BINARY, sort_keys=False))
assert all("health.quantity.log" not in item["WFWorkflowActionIdentifier"] for item in actions)
assert all("downloadurl" not in item["WFWorkflowActionIdentifier"] for item in actions)
print(f"Built read-only shortcut: {len(actions)} actions; no credentials embedded.")
if "--bundle" in sys.argv:
    helper = '''#!/bin/bash
set -euo pipefail
cd -- "$(dirname -- "$0")"
/usr/bin/shortcuts sign --mode anyone --input "TEZISCE-Apple-Health.unsigned.shortcut" --output "TEZISCE Apple Health.shortcut"
printf '\\nBliznjica je pripravljena. Poslji oznaceno datoteko na iPhone prek AirDrop in jo odpri v Bliznjicah.\\n'
open -R "TEZISCE Apple Health.shortcut"
'''
    instructions = '''TEŽIŠČE – Apple Health · paket 2 (popravljeni trije pogoji Če)

To je že sestavljena Bližnjica za korake, aktivno energijo in minute vadbe iz enega vira Apple Health. Ne namešča nove aplikacije in ne potrebuje Apple Developer računa.

Bližnjica se izvaja SAMO NA IPHONU. Mac samo podpiše datoteko; na Macu dejanje Najdi zdravstvene vzorce ne deluje. Če zamenjuješ prvi paket, v Prenosih najprej zamenjaj staro mapo TEZISCE-Apple-Health z mapo iz tega ZIP-a. Na iPhonu ob dodajanju zamenjaj staro istoimensko Bližnjico. Podatki TEŽIŠČA ostanejo shranjeni.

Apple zahteva potrditev datoteke na Macu, prijavljenem v iCloud. GitHubov Mac brez iClouda jo zavrne, zato ta paket vsebuje nepodpisano izvorno datoteko in kratek, pregleden ukaz za Applovo vgrajeno orodje. Paket še ni preverjen na tvojem iPhonu.

1. Razširi ZIP v Prenosih. V Terminal prilepi:
   /bin/bash ~/Downloads/TEZISCE-Apple-Health/pripravi-bliznjico.command
2. V Finderju se označi podpisana datoteka »TEZISCE Apple Health.shortcut« (brez .unsigned). Pošlji jo na iPhone prek AirDrop in odpri v Bližnjicah na iPhonu. Ne zaženi je na Macu.
3. Ko uvoz vpraša za kodo, prilepi kodo iz TEŽIŠČE → Nastavitve → Apple Health → Kopiraj kodo za Bližnjico. To ni koda Cloudflare.
4. V prvem dejanju Najdi zdravstvene vzorce pri filtru Vir izberi svojo Apple Watch namesto »Vprašaj vsakič«. Ostali poizvedbi uporabita isti vir. Ne izberi vseh naprav skupaj. Vsi trije pogoji Če morajo že vsebovati Število je večje od 0, ne praznega polja Pogoj.
5. Prvič zaženi ročno na odklenjenem iPhonu in dovoli branje Health. Preveri datum, korake, aktivno energijo in minute glede na isti izvor v Zdravju. Če dovoljenje ali filtri ne delujejo, ničesar ne označuj kot uspešno povezano.
6. V Bližnjice → Avtomatizacija nastavi čas dneva ali konec vadbe Apple Watch, zaženi to Bližnjico in izberi Zaženi takoj, kadar je na voljo. Prenos odpre Safari; zaklenjen telefon lahko zahteva odklep.

Če nimaš Maca, prijavljenega v iCloud, ostanejo v aplikaciji navodila za ročno sestavljanje. Ne pošiljaj gesla Apple računa, sprejemne kode ali zdravstvenih podatkov pomočniku.

Prenos uporablja fragment #health=, ki se ne pošlje GitHub Pages. Ta fragment lahko kratkotrajno ostane v zgodovini brskalnika. Podatki se sprejmejo samo v istem Safariju, kjer si omogočil sprejem. Za uporabo v nameščeni PWA poveži obe zbirki z isto zasebno kodo sinhronizacije.
'''
    bundle = destination.parent / "TEZISCE-Apple-Health.zip"
    with zipfile.ZipFile(bundle, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for name, data, mode in [("TEZISCE-Apple-Health.unsigned.shortcut", destination.read_bytes(), 0o644),
                                 ("pripravi-bliznjico.command", helper.encode(), 0o755),
                                 ("PREBERI.txt", instructions.encode(), 0o644)]:
            info = zipfile.ZipInfo("TEZISCE-Apple-Health/" + name, date_time=(2026, 10, 15, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = (0o100000 | mode) << 16
            archive.writestr(info, data)
    print("Built generic Mac preparation bundle; iCloud validation is still required on the user's Mac.")
