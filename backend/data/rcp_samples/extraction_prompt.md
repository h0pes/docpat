# Drug Interaction Extraction Prompt

## System Prompt

```
You are a pharmaceutical data extraction specialist. Your task is to extract structured drug interaction data from Italian RCP (Riassunto delle Caratteristiche del Prodotto) Section 4.5 text.

For each interaction mentioned, extract:
1. interacting_drug: The name of the interacting drug or drug class
2. severity: One of: "contraindicated", "not_recommended", "caution", "monitor"
3. effect: What happens when the drugs are combined
4. mechanism: Why the interaction occurs (if mentioned)
5. management: Clinical recommendations (if mentioned)

Map Italian severity terms:
- "controindicato" / "associazione controindicata" → "contraindicated"
- "sconsigliato" / "associazione sconsigliata" / "evitare" → "not_recommended"
- "precauzione" / "cautela" / "attenzione" → "caution"
- "monitorare" / "controllare" / "sorveglianza" → "monitor"

Output valid JSON array. Be thorough - extract ALL interactions mentioned.
```

## User Prompt

```
Extract drug interactions from this Italian RCP Section 4.5 for ACIDO ACETILSALICILICO (Aspirin):

---
4.5 Interazioni con altri medicinali ed altre forme d'interazione

L'effetto dell'acido acetilsalicilico può essere modificato in seguito all'assunzione contemporanea di altri medicinali.

ASSOCIAZIONI CONTROINDICATE

Metotrexato (a dosi >= 15 mg/settimana):
Aumento della tossicità ematologica del metotrexato (diminuzione della clearance renale del metotrexato da parte degli agenti antinfiammatori in generale e spiazzamento del metotrexato dal suo legame con le proteine plasmatiche da parte dei salicilati). Pertanto l'uso concomitante di acido acetilsalicilico con metotrexato a dosi >= 15 mg/settimana è controindicato (vedere sezione 4.3).

Anticoagulanti orali (es. warfarin, acenocumarolo):
Aumento del rischio di emorragia per inibizione della funzionalità piastrinica, danno alla mucosa gastroduodenale e spiazzamento degli anticoagulanti orali dai loro siti di legame con le proteine plasmatiche. L'uso concomitante è controindicato.

ASSOCIAZIONI SCONSIGLIATE

Altri FANS (inclusi inibitori selettivi della COX-2):
Aumento del rischio di ulcera e sanguinamento gastrointestinale a causa di effetto sinergico.

Ticlopidina, clopidogrel:
Aumento del rischio di sanguinamento a causa dell'effetto sinergico sull'inibizione piastrinica.

ASSOCIAZIONI CHE RICHIEDONO PRECAUZIONI D'IMPIEGO

Antidiabetici (es. insulina, sulfaniluree):
Aumento dell'effetto ipoglicemizzante per dosi elevate di acido acetilsalicilico. Monitorare la glicemia.

Diuretici:
Possibile riduzione dell'effetto diuretico. Idratare il paziente e controllare la funzionalità renale.
---

Output the extracted interactions as a JSON array:
```

## Expected LLM Output

```json
[
  {
    "interacting_drug": "Metotrexato",
    "interacting_drug_class": "antimetaboliti",
    "severity": "contraindicated",
    "effect": "Aumento della tossicità ematologica del metotrexato",
    "mechanism": "Diminuzione della clearance renale del metotrexato e spiazzamento dal legame con le proteine plasmatiche",
    "management": "Controindicato a dosi >= 15 mg/settimana",
    "examples": ["metotrexato"]
  },
  {
    "interacting_drug": "Anticoagulanti orali",
    "interacting_drug_class": "anticoagulanti",
    "severity": "contraindicated",
    "effect": "Aumento del rischio di emorragia",
    "mechanism": "Inibizione della funzionalità piastrinica, danno alla mucosa gastroduodenale, spiazzamento dai siti di legame proteico",
    "management": "Uso concomitante controindicato",
    "examples": ["warfarin", "acenocumarolo"]
  },
  {
    "interacting_drug": "FANS",
    "interacting_drug_class": "antinfiammatori",
    "severity": "not_recommended",
    "effect": "Aumento del rischio di ulcera e sanguinamento gastrointestinale",
    "mechanism": "Effetto sinergico",
    "management": null,
    "examples": ["COX-2 inibitori"]
  },
  {
    "interacting_drug": "Ticlopidina",
    "interacting_drug_class": "antiaggreganti",
    "severity": "not_recommended",
    "effect": "Aumento del rischio di sanguinamento",
    "mechanism": "Effetto sinergico sull'inibizione piastrinica",
    "management": null,
    "examples": ["ticlopidina", "clopidogrel"]
  },
  {
    "interacting_drug": "Antidiabetici",
    "interacting_drug_class": "ipoglicemizzanti",
    "severity": "caution",
    "effect": "Aumento dell'effetto ipoglicemizzante",
    "mechanism": "Azione ipoglicemizzante dell'acido acetilsalicilico",
    "management": "Monitorare la glicemia",
    "examples": ["insulina", "sulfaniluree"]
  },
  {
    "interacting_drug": "Diuretici",
    "interacting_drug_class": "diuretici",
    "severity": "caution",
    "effect": "Possibile riduzione dell'effetto diuretico",
    "mechanism": null,
    "management": "Idratare il paziente e controllare la funzionalità renale",
    "examples": []
  }
]
```
