# Manuale Utente DocPat

**Versione 1.0 | Gennaio 2026**

---

## Indice

1. [Introduzione](#1-introduzione)
2. [Per Iniziare](#2-per-iniziare)
3. [Dashboard](#3-dashboard)
4. [Gestione Pazienti](#4-gestione-pazienti)
5. [Appuntamenti](#5-appuntamenti)
6. [Visite Cliniche](#6-visite-cliniche)
7. [Prescrizioni](#7-prescrizioni)
8. [Documenti](#8-documenti)
9. [Report](#9-report)
10. [Notifiche](#10-notifiche)
11. [Amministrazione](#11-amministrazione)
12. [Risoluzione Problemi](#12-risoluzione-problemi)
13. [Appendice](#13-appendice)

---

## 1. Introduzione

### 1.1 Cos'è DocPat?

DocPat è un Sistema di Gestione dello Studio Medico (MPMS) completo, progettato specificamente per professionisti medici individuali. Costruito con un focus su semplicità, sicurezza e facilità d'uso, DocPat fornisce ai professionisti sanitari tutti gli strumenti necessari per gestire il proprio studio in modo efficiente.

DocPat ti permette di:

- **Gestire le Cartelle Pazienti**: Mantenere dati anagrafici completi, storia clinica, allergie, condizioni croniche e contatti di emergenza in un'unica posizione centralizzata.
- **Programmare Appuntamenti**: Utilizzare un'interfaccia calendario intuitiva con viste giornaliera, settimanale e mensile. Supporta appuntamenti ricorrenti e rilevamento automatico dei conflitti.
- **Documentare le Visite Cliniche**: Registrare gli incontri clinici utilizzando il formato standard SOAP (Soggettivo, Oggettivo, Valutazione, Piano) con firme digitali.
- **Scrivere Prescrizioni**: Creare prescrizioni con controllo automatico delle interazioni farmacologiche, tracciamento ricariche e supporto modelli.
- **Generare Documenti**: Produrre certificati medici professionali, lettere di riferimento, richieste di laboratorio e riepiloghi delle visite utilizzando modelli personalizzabili.
- **Monitorare le Analisi**: Monitorare le performance dello studio con report dettagliati su appuntamenti, pazienti, diagnosi e produttività del medico.
- **Gestire le Notifiche**: Inviare promemoria appuntamenti e consegne documenti via email con tracciamento completo.

### 1.2 Destinatari

DocPat è progettato per:

- **Professionisti Medici Individuali**: Geriatri, medici di base, specialisti e fornitori di medicina alternativa (come agopuntori)
- **Piccoli Studi Medici**: Studi individuali o piccole cliniche con uno a tre professionisti
- **Personale Amministrativo**: Responsabili d'ufficio e assistenti medici che gestiscono programmazione e documentazione

### 1.3 Funzionalità Principali

| Funzionalità | Descrizione |
|--------------|-------------|
| Gestione Pazienti | Operazioni CRUD complete con ricerca, filtri e tracciamento storia clinica |
| Programmazione Appuntamenti | Viste calendario, rilevamento conflitti, appuntamenti ricorrenti, flusso stati |
| Documentazione Clinica | Note SOAP, segni vitali, diagnosi ICD-10, firme digitali, modelli |
| Prescrizioni | Ricerca database farmaci, avvisi interazioni, gestione ricariche, modelli |
| Generazione Documenti | Sistema modelli con variabili, generazione PDF, consegna email |
| Report e Analisi | Quattro tipi di report con grafici, filtri per data e esportazione multi-formato |
| Notifiche | Notifiche email con tracciamento stato, funzionalità di ripetizione |
| Amministrazione | Gestione utenti, impostazioni sistema, log di audit, monitoraggio salute |

### 1.4 Requisiti di Sistema

#### Requisiti Browser

DocPat è un'applicazione web che funziona nei browser moderni:

| Browser | Versione Minima |
|---------|-----------------|
| Google Chrome | 100+ |
| Mozilla Firefox | 100+ |
| Apple Safari | 15+ |
| Microsoft Edge | 100+ |

**Nota**: Internet Explorer non è supportato. Per la migliore esperienza, raccomandiamo l'utilizzo dell'ultima versione di Google Chrome o Mozilla Firefox.

#### Risoluzione Schermo

- **Minima**: 1024×768 pixel
- **Raccomandata**: 1920×1080 pixel o superiore
- **Mobile**: DocPat supporta il design responsive per tablet e smartphone, anche se l'uso desktop è raccomandato per la documentazione clinica

#### Requisiti di Rete

- Connessione internet stabile (minimo 1 Mbps)
- Accesso HTTPS al tuo server DocPat
- La porta 443 (HTTPS) deve essere accessibile

#### Requisiti Aggiuntivi

- **Visualizzatore PDF**: Integrato nella maggior parte dei browser moderni per visualizzare i documenti generati
- **App di Autenticazione**: Google Authenticator, Authy o simili per l'Autenticazione Multi-Fattore (MFA)

### 1.5 Panoramica sulla Sicurezza

DocPat implementa sicurezza di livello enterprise per proteggere i dati medici sensibili:

#### Crittografia dei Dati

- **A Riposo**: Tutti i dati sensibili dei pazienti sono crittografati utilizzando crittografia AES-256 nel database
- **In Transito**: Tutte le comunicazioni utilizzano TLS 1.3 con HTTP Strict Transport Security (HSTS)

#### Autenticazione e Controllo Accessi

- **Autenticazione Multi-Fattore (MFA)**: Secondo fattore opzionale ma fortemente raccomandato basato su TOTP
- **Controllo Accessi Basato su Ruoli (RBAC)**: Due ruoli (Admin, Dottore) con permessi granulari
- **Gestione Sessioni**: Timeout automatico della sessione dopo 30 minuti di inattività
- **Blocco Account**: Gli account vengono temporaneamente bloccati dopo 5 tentativi di accesso falliti

#### Audit e Conformità

- **Logging di Audit Completo**: Ogni azione sui dati dei pazienti viene registrata con utente, timestamp e dettagli delle modifiche
- **Log Immutabili**: I record di audit non possono essere modificati o eliminati
- **Considerazioni HIPAA**: DocPat è progettato con i principi di conformità HIPAA in mente

---

## 2. Per Iniziare

### 2.1 Accesso a DocPat

Per accedere a DocPat:

1. Apri il tuo browser web
2. Naviga all'URL del tuo server DocPat (fornito dal tuo amministratore)
3. Vedrai la pagina di login con il logo DocPat

### 2.2 Processo di Login

> **📸 Screenshot necessario:** Pagina di login che mostra i campi nome utente/password, casella "Ricordami" e pulsante "Accedi"
>
> *File: `screenshots/login-page.png`*

#### Login Standard

1. **Inserisci Nome Utente**: Digita il tuo nome utente nel primo campo (minimo 3 caratteri)
2. **Inserisci Password**: Digita la tua password nel secondo campo (minimo 8 caratteri)
   - Clicca l'icona dell'occhio per mostrare/nascondere la password
3. **Ricordami** (Opzionale): Seleziona questa casella sui dispositivi fidati per rimanere connesso
4. **Clicca "Accedi"**: Il pulsante mostrerà uno spinner di caricamento durante l'autenticazione

#### Login con Autenticazione Multi-Fattore (MFA)

Se l'MFA è abilitato sul tuo account:

1. Completa i passaggi di login standard sopra
2. Appare una nuova schermata che richiede il codice di verifica
3. Apri la tua app di autenticazione (Google Authenticator, Authy, ecc.)
4. Inserisci il codice a 6 cifre mostrato nell'app
5. Clicca "Verifica" per completare il login

> **📸 Screenshot necessario:** Schermata verifica MFA con campo inserimento codice a 6 cifre
>
> *File: `screenshots/mfa-verification.png`*

**Importante**: I codici si aggiornano ogni 30 secondi. Se il tuo codice viene rifiutato, attendi il prossimo codice.

#### Password Dimenticata

Se dimentichi la password:

1. Clicca il link "Password dimenticata?" sotto il form di login
2. Inserisci il tuo indirizzo email registrato
3. Clicca "Invia Link di Reset"
4. Controlla la tua email per un link di reset password
5. Clicca il link e crea una nuova password che soddisfi questi requisiti:
   - Almeno 8 caratteri
   - Almeno una lettera maiuscola (A-Z)
   - Almeno una lettera minuscola (a-z)
   - Almeno un numero (0-9)
   - Almeno un carattere speciale (!@#$%^&*)

### 2.3 Comprendere l'Interfaccia

Una volta effettuato l'accesso, l'interfaccia di DocPat è composta da quattro aree principali:

> **📸 Screenshot necessario:** Interfaccia completa dell'applicazione che mostra barra laterale, barra intestazione e area contenuto principale
>
> *File: `screenshots/main-interface-overview.png`*

#### Barra Laterale (Pannello Sinistro)

La barra laterale fornisce la navigazione a tutti i moduli di DocPat. È organizzata in tre sezioni:

**Funzionalità Cliniche** (visibili a tutti gli utenti):
- Dashboard – Panoramica dello studio e azioni rapide
- Pazienti – Gestione cartelle pazienti
- Appuntamenti – Calendario e programmazione
- Visite – Documentazione clinica
- Prescrizioni – Gestione farmaci
- Documenti – Generazione documenti
- Report – Analisi e statistiche
- Notifiche – Tracciamento messaggi

**Amministrazione** (visibile solo agli utenti Admin):
- Modelli Documento – Gestione modelli
- Utenti – Gestione account utenti
- Impostazioni – Configurazione sistema
- Log di Audit – Monitoraggio attività
- Stato Sistema – Stato del server

**Personale**:
- Profilo – Le tue impostazioni account
- Aiuto – Documentazione e supporto

#### Intestazione (Barra Superiore)

L'intestazione contiene:

- **Pulsante Menu** (solo mobile): Apre il drawer della barra laterale
- **Breadcrumb**: Mostra la tua posizione attuale nell'applicazione
- **Ricerca Globale**: Ricerca rapida tra pazienti e record
- **Campanella Notifiche**: Mostra il conteggio delle notifiche non lette
- **Pulsante Logout**: Esci da DocPat
- **Selettore Tema**: Alterna tra tema Chiaro, Scuro o Sistema
- **Selettore Lingua**: Passa tra Inglese e Italiano

#### Area Contenuto Principale

L'area centrale mostra il contenuto della pagina corrente, inclusi form, liste, grafici e dettagli.

#### Indicatori di Stato

In tutta l'interfaccia vedrai indicatori visivi:

- **Verde**: Successo, attivo o stato positivo
- **Giallo/Arancione**: Avviso, in attesa o attenzione necessaria
- **Rosso**: Errore, fallito o stato negativo
- **Blu**: Informazione o avvisi minori
- **Grigio**: Inattivo, completato o stato neutro

### 2.4 Ruoli Utente e Permessi

DocPat utilizza due ruoli utente con diversi livelli di accesso:

#### Ruolo Admin

Gli amministratori hanno accesso completo al sistema incluso:

- Tutte le funzionalità cliniche (Pazienti, Appuntamenti, Visite, Prescrizioni, Documenti, Report, Notifiche)
- Gestione utenti (creare, modificare, attivare/disattivare utenti)
- Configurazione impostazioni sistema
- Gestione modelli documento
- Accesso ai log di audit
- Monitoraggio stato sistema
- Capacità di eliminazione per la maggior parte dei record

#### Ruolo Dottore

I dottori hanno accesso alle funzionalità cliniche:

- Accesso completo a Pazienti, Appuntamenti, Visite, Prescrizioni, Documenti
- Accesso a Report e Notifiche
- Possono firmare e bloccare visite
- Non possono accedere alle funzioni amministrative (Utenti, Impostazioni, Log di Audit)
- Capacità di eliminazione limitate

### 2.5 Configurare il Tuo Profilo

Dopo il primo login, configura il tuo profilo:

1. Clicca **Profilo** nella barra laterale (o clicca il tuo avatar nell'intestazione)
2. Rivedi le tue informazioni personali visualizzate:
   - Avatar (mostra le tue iniziali)
   - Nome completo e nome utente
   - Badge ruolo (ADMIN o DOTTORE)
   - Informazioni di contatto
   - Date account

### 2.6 Abilitare l'Autenticazione Multi-Fattore (MFA)

Raccomandiamo fortemente di abilitare l'MFA per una sicurezza avanzata:

1. Naviga a **Profilo** dalla barra laterale
2. Scorri alla sezione **Impostazioni di Sicurezza**
3. Vedrai il tuo stato MFA attuale (Abilitato o Disabilitato)
4. Clicca il pulsante **"Abilita MFA"**

**Processo di Configurazione MFA**:

1. Appare un dialogo con un codice QR
2. Apri la tua app di autenticazione (Google Authenticator, Authy, Microsoft Authenticator)
3. Tocca il pulsante "+" o "Aggiungi Account" nell'app
4. **Scansiona il Codice QR** mostrato in DocPat
   - In alternativa, clicca "Non riesci a scansionare? Inserisci manualmente" e digita la chiave segreta
5. L'app genererà un codice a 6 cifre
6. Inserisci questo codice nel campo di verifica
7. Clicca **"Verifica e Abilita"**
8. **Importante**: Salva i codici di backup mostrati – questi possono essere usati se perdi l'accesso alla tua app di autenticazione

> **📸 Screenshot necessario:** Dialogo configurazione MFA che mostra codice QR e campo inserimento codice verifica
>
> *File: `screenshots/mfa-setup-dialog.png`*

**Nota**: Se il tuo amministratore ha reso l'MFA obbligatorio, ti verrà chiesto di configurarlo al primo login e non potrai saltare questo passaggio.

### 2.7 Disabilitare l'MFA

Per disabilitare l'MFA (se consentito dalle impostazioni di sistema):

1. Naviga a **Profilo**
2. Nella sezione Impostazioni di Sicurezza, clicca **"Disabilita MFA"**
3. Appare un dialogo di conferma che avverte sulla riduzione della sicurezza
4. Clicca **"Conferma Disabilitazione"** per procedere

**Attenzione**: Disabilitare l'MFA riduce la sicurezza del tuo account. Disabilita solo se assolutamente necessario.

### 2.8 Cambiare il Tema

DocPat supporta temi chiaro e scuro:

1. Clicca l'**icona tema** (sole/luna) nell'intestazione
2. Seleziona la tua preferenza:
   - **Chiaro**: Sfondo luminoso, testo scuro
   - **Scuro**: Sfondo scuro, testo chiaro
   - **Sistema**: Corrisponde automaticamente alle impostazioni del dispositivo

> **📸 Screenshot necessario:** Dropdown selettore tema che mostra opzioni Chiaro/Scuro/Sistema
>
> *File: `screenshots/theme-switcher.png`*

La tua preferenza viene salvata e persiste tra le sessioni.

### 2.9 Cambiare la Lingua

DocPat supporta Inglese e Italiano:

1. Clicca il **selettore lingua** (icona bandiera) nell'intestazione
2. Seleziona la lingua preferita:
   - **English** (EN)
   - **Italiano** (IT)

Tutto il testo dell'interfaccia, le etichette e i messaggi si aggiorneranno immediatamente.

### 2.10 Disconnessione

Per disconnettersi in modo sicuro:

1. Clicca il **pulsante Logout** nell'intestazione
2. Verrai reindirizzato alla pagina di login
3. La tua sessione viene terminata sul server

**Logout Automatico**: Le sessioni scadono automaticamente dopo 30 minuti di inattività per sicurezza.

---

## 3. Dashboard

### 3.1 Panoramica

La Dashboard è la tua pagina iniziale in DocPat, fornendo una vista d'insieme dell'attività del tuo studio e accesso rapido alle attività comuni. È la prima pagina che vedi dopo il login.

> **📸 Screenshot necessario:** Pagina Dashboard che mostra schede statistiche, attività recente e azioni rapide
>
> *File: `screenshots/dashboard-overview.png`*

### 3.2 Schede Statistiche

La sezione superiore mostra quattro schede statistiche in fila:

#### Scheda Pazienti Attivi
- **Icona**: Utenti (icona persone)
- **Valore**: Conteggio totale dei pazienti attivi nel tuo studio
- **Sottotitolo**: "Attivi"
- **Azione Click**: Naviga alla pagina Pazienti

#### Scheda Appuntamenti Oggi
- **Icona**: Calendario
- **Valore**: Numero di appuntamenti programmati per oggi
- **Sottotitolo**: "Oggi"
- **Azione Click**: Naviga alla pagina Appuntamenti

#### Scheda Visite Questa Settimana
- **Icona**: Documento (icona file)
- **Valore**: Numero di visite registrate questa settimana
- **Sottotitolo**: "Questa settimana"
- **Azione Click**: Naviga alla pagina Visite

#### Scheda Prescrizioni Attive
- **Icona**: Pillola
- **Valore**: Numero di prescrizioni attualmente attive
- **Sottotitolo**: "Attive"
- **Azione Click**: Naviga alla pagina Prescrizioni

**Nota**: Clicca qualsiasi scheda per navigare direttamente alla vista dettagliata di quel modulo.

### 3.3 Sezione Attività Recente

La sezione Attività Recente (lato sinistro) mostra le tue interazioni più recenti:

#### Appuntamenti Recenti

Mostra fino a 3 appuntamenti recenti con:
- Nome paziente
- Tipo appuntamento (es. Controllo, Consulto)
- Data e ora programmati
- Badge stato (COMPLETATO, PROGRAMMATO, ecc.)

Clicca qualsiasi riga appuntamento per vedere i dettagli completi.

#### Visite Recenti

Mostra fino a 2 visite cliniche recenti con:
- Nome paziente
- Tipo visita
- Data visita
- Badge stato (BOZZA, FIRMATO, BLOCCATO)

Clicca qualsiasi riga visita per vedere la documentazione completa.

**Pulsante "Vedi Tutta l'Attività"**: Apre una cronologia completa delle attività.

### 3.4 Sezione Azioni Rapide

La sezione Azioni Rapide (lato destro) fornisce pulsanti con un clic per attività comuni:

| Pulsante | Azione |
|----------|--------|
| **Nuovo Appuntamento** | Apre il form di creazione appuntamento |
| **Nuovo Paziente** | Apre il form di registrazione paziente |
| **Nuova Visita** | Apre il selettore paziente, poi il form di creazione visita |
| **Nuova Prescrizione** | Apre il form di creazione prescrizione |

Questi pulsanti forniscono il modo più veloce per eseguire attività di routine.

### 3.5 Gestione Errori

Se i dati non si caricano:

1. Appare un messaggio di errore in cima alla Dashboard
2. Viene fornito un pulsante **Aggiorna**
3. Clicca Aggiorna per riprovare a caricare i dati
4. Se l'errore persiste, contatta il tuo amministratore

### 3.6 Stati di Caricamento

Durante il caricamento dei dati:
- Le schede statistiche mostrano placeholder scheletro (rettangoli grigi)
- Le liste attività mostrano indicatori di caricamento
- I pulsanti rimangono funzionali durante il caricamento dati

---

## 4. Gestione Pazienti

### 4.1 Panoramica

Il modulo Gestione Pazienti è la base di DocPat, permettendoti di mantenere record completi per tutti i tuoi pazienti. Da questo modulo puoi aggiungere nuovi pazienti, cercare record esistenti, visualizzare dettagli paziente e gestire la storia clinica.

### 4.2 Accesso alla Gestione Pazienti

Naviga a **Pazienti** dalla barra laterale. Vedrai:

- **Intestazione**: Titolo "Pazienti" con badge conteggio totale pazienti
- **Pulsante Nuovo Paziente**: Pulsante principale per aggiungere nuovi pazienti
- **Lista Pazienti**: Lista ricercabile e filtrabile di tutti i pazienti

> **📸 Screenshot necessario:** Pagina lista pazienti che mostra barra ricerca, filtri e schede/righe pazienti
>
> *File: `screenshots/patient-list.png`*

### 4.3 Funzionalità Lista Pazienti

#### Funzionalità di Ricerca

La barra di ricerca in alto ti permette di trovare pazienti per:
- Nome o cognome
- Numero Cartella Clinica (MRN)
- Numero di telefono
- Indirizzo email
- Codice fiscale

I risultati si aggiornano mentre digiti (con debounce per performance).

#### Filtri

Clicca l'icona filtro per accedere a filtri aggiuntivi:
- **Stato**: Pazienti Attivi o Inattivi
- **Sesso**: Maschio, Femmina, Altro
- **Intervallo Date**: Filtra per data di registrazione

#### Visualizzazione Lista

Ogni scheda/riga paziente mostra:
- Nome paziente (cliccabile per vedere dettagli)
- Data di nascita e età
- Numero di telefono
- Numero Cartella Clinica (MRN)
- Badge stato (Attivo/Inattivo)
- Pulsanti azione rapida

#### Paginazione

Per liste pazienti ampie:
- Naviga usando i numeri di pagina
- Seleziona elementi per pagina (10, 25, 50, 100)
- Indicatore "Mostrando X-Y di Z pazienti"

### 4.4 Aggiungere un Nuovo Paziente

1. Clicca il pulsante **"Nuovo Paziente"**
2. Vieni portato alla pagina Form Paziente

> **📸 Screenshot necessario:** Form nuovo paziente che mostra sezione anagrafica con campi obbligatori
>
> *File: `screenshots/patient-form-demographics.png`*

#### Sezione Dati Anagrafici (Campi Obbligatori)

| Campo | Requisiti | Descrizione |
|-------|-----------|-------------|
| **Nome*** | Obbligatorio, max 100 caratteri | Nome del paziente |
| **Cognome*** | Obbligatorio, max 100 caratteri | Cognome del paziente |
| Secondo Nome | Opzionale, max 100 caratteri | Secondo nome se applicabile |
| **Data di Nascita*** | Obbligatorio, deve essere data passata | Usa il selettore calendario |
| **Sesso*** | Obbligatorio, dropdown | Maschio, Femmina o Altro |
| Codice Fiscale | Opzionale, esattamente 16 caratteri alfanumerici | Codice fiscale italiano |

#### Sezione Informazioni di Contatto

| Campo | Requisiti | Descrizione |
|-------|-----------|-------------|
| Telefono Principale | Opzionale, max 20 caratteri | Numero di contatto principale |
| Telefono Secondario | Opzionale, max 20 caratteri | Numero alternativo |
| Email | Opzionale, formato email valido | Indirizzo email del paziente |
| **Contatto Preferito*** | Obbligatorio, dropdown | TELEFONO, EMAIL o SMS |

#### Sezione Indirizzo

| Campo | Requisiti | Descrizione |
|-------|-----------|-------------|
| Via | Opzionale, max 255 caratteri | Nome via e numero civico |
| Città | Opzionale, max 100 caratteri | Città o paese |
| Provincia | Opzionale, max 50 caratteri | Regione o provincia |
| CAP | Opzionale, max 20 caratteri | Codice postale |
| Paese | Default: IT, max 2 caratteri | Codice paese |

#### Sezione Contatto di Emergenza

| Campo | Requisiti | Descrizione |
|-------|-----------|-------------|
| Nome Contatto | Opzionale, max 200 caratteri | Persona di contatto emergenza |
| Relazione | Opzionale, max 50 caratteri | Relazione con il paziente (es. Coniuge, Figlio) |
| Telefono Contatto | Opzionale, max 20 caratteri | Numero telefono emergenza |

#### Sezione Informazioni Mediche

| Campo | Requisiti | Descrizione |
|-------|-----------|-------------|
| Gruppo Sanguigno | Opzionale, max 10 caratteri | A+, A-, B+, B-, AB+, AB-, O+, O- |
| Allergie | Opzionale, separato da virgole | Lista delle allergie note |
| Condizioni Croniche | Opzionale, separato da virgole | Condizioni mediche in corso |
| Scadenza Tessera Sanitaria | Opzionale, selettore data | Data scadenza tessera sanitaria |

#### Sezione Note

| Campo | Requisiti | Descrizione |
|-------|-----------|-------------|
| Note | Opzionale, area di testo | Qualsiasi nota aggiuntiva sul paziente |

#### Salvare il Paziente

1. Compila tutti i campi obbligatori (contrassegnati con *)
2. Opzionalmente completa i campi aggiuntivi
3. Clicca il pulsante **"Salva"**
4. Se si verificano errori di validazione, appaiono sotto ogni campo in rosso
5. In caso di successo, vieni reindirizzato alla pagina dettagli del paziente

### 4.5 Visualizzare i Dettagli Paziente

Clicca su qualsiasi paziente nella lista per vedere il suo profilo completo.

> **📸 Screenshot necessario:** Pagina dettaglio paziente che mostra scheda info paziente e record associati
>
> *File: `screenshots/patient-detail.png`*

#### Layout Pagina Dettaglio Paziente

**Sezione Intestazione**:
- Pulsante indietro (ritorna alla lista pazienti)
- Nome completo del paziente come titolo
- Pulsanti azione:
  - **Nuova Visita**: Crea una visita per questo paziente
  - **Modifica**: Modifica informazioni paziente
  - **Riattiva** (se inattivo): Ripristina un paziente inattivo
  - **Elimina** (solo Admin): Rimuovi record paziente

**Scheda Informazioni Paziente**:

Il componente DettaglioPaziente mostra tutte le informazioni del paziente organizzate in sezioni:

1. **Dati Anagrafici**: Nome, data nascita, età, sesso, codice fiscale, MRN
2. **Informazioni di Contatto**: Numeri telefono, email, metodo contatto preferito
3. **Indirizzo**: Dettagli indirizzo completo
4. **Contatto di Emergenza**: Informazioni contatto emergenza
5. **Informazioni Mediche**: Gruppo sanguigno, allergie, condizioni croniche, tessera sanitaria

**Record Associati**:

Sotto le informazioni paziente troverai:

- **Cronologia Visite**: Visite recenti con stato, tipo, data e motivo principale
  - Pulsante "Vedi Tutto" per vedere la cronologia completa
  - Icona occhio per vedere la singola visita

- **Prescrizioni**: Prescrizioni attive e passate
  - Pulsante "Nuova Prescrizione"
  - Link vedi tutte le prescrizioni

- **Documenti**: Documenti generati per questo paziente
  - Pulsante "Genera Documento"
  - Opzioni scarica/email per documenti esistenti

- **Notifiche**: Cronologia delle notifiche inviate a questo paziente

### 4.6 Modificare le Informazioni Paziente

1. Apri la pagina dettagli del paziente
2. Clicca il pulsante **"Modifica"** nell'intestazione
3. Il Form Paziente si apre con i dati precompilati
4. Effettua le tue modifiche
5. Clicca **"Salva"**
6. Le modifiche vengono registrate nel trail di audit

### 4.7 Disattivare un Paziente

Per disattivare un paziente (invece di eliminare):

1. Questo viene gestito attraverso la gestione stato paziente
2. I pazienti disattivati:
   - Rimangono nel database per i record storici
   - Sono nascosti dalle ricerche pazienti predefinite
   - Possono essere riattivati successivamente

### 4.8 Riattivare un Paziente

Se un paziente è stato precedentemente disattivato:

1. Cerca il paziente (includi inattivi nei filtri)
2. Apri la sua pagina dettagli
3. Clicca il pulsante **"Riattiva"**
4. Conferma la riattivazione nel dialogo
5. Il paziente diventa nuovamente attivo

### 4.9 Eliminare un Paziente (Solo Admin)

**Attenzione**: L'eliminazione dovrebbe essere rara. Considera la disattivazione invece.

1. Apri la pagina dettagli del paziente
2. Clicca il pulsante **"Elimina"** (icona cestino)
3. Appare un dialogo di conferma:
   - Titolo: "Conferma Eliminazione"
   - Messaggio: "Sei sicuro di voler eliminare [Nome Paziente]?"
4. Clicca **"Elimina"** per confermare o **"Annulla"** per abortire
5. I pazienti eliminati non possono essere recuperati

**Nota**: I pazienti con visite o prescrizioni associate potrebbero avere restrizioni sull'eliminazione per mantenere l'integrità dei dati.

### 4.10 Storia Clinica del Paziente

La storia clinica del paziente viene mantenuta attraverso:

- **Allergie**: Elencate nel profilo paziente, visibili a tutti i professionisti
- **Condizioni Croniche**: Elencate nel profilo paziente
- **Cronologia Visite**: Record completo di tutti gli incontri clinici
- **Cronologia Prescrizioni**: Tutti i farmaci prescritti
- **Cronologia Documenti**: Tutti i documenti generati

### 4.11 Best Practice per la Gestione Pazienti

1. **Completare i Dati Anagrafici**: Compila tutte le informazioni paziente disponibili per record migliori
2. **Verificare le Informazioni di Contatto**: Conferma telefono/email per i promemoria appuntamenti
3. **Aggiornare Regolarmente**: Rivedi e aggiorna le informazioni paziente ad ogni visita
4. **Documentare le Allergie**: Registra sempre le allergie in modo prominente per la sicurezza
5. **Usare il Codice Fiscale**: Per i pazienti italiani, il codice fiscale aiuta nell'identificazione
6. **Contatti di Emergenza**: Richiedi sempre le informazioni del contatto di emergenza

---

## 5. Appuntamenti

### 5.1 Panoramica

Il modulo Appuntamenti fornisce un'interfaccia calendario completa per programmare, gestire e tracciare gli appuntamenti dei pazienti. Supporta multiple viste calendario, appuntamenti ricorrenti, rilevamento conflitti e gestione del flusso stati.

### 5.2 Accesso al Modulo Appuntamenti

Naviga a **Appuntamenti** dalla barra laterale. Vedrai:

- **Intestazione**: Icona calendario, titolo "Appuntamenti", conteggio appuntamenti
- **Pulsanti Azione**: Stampa Programma, Nuovo Appuntamento
- **Schede Statistiche**: Quattro schede che mostrano metriche appuntamenti
- **Vista Calendario**: Componente calendario interattivo

### 5.3 Statistiche Appuntamenti

La sezione superiore mostra quattro schede statistiche:

| Scheda | Descrizione |
|--------|-------------|
| **In Arrivo Oggi** | Numero di appuntamenti programmati per oggi |
| **In Arrivo Questa Settimana** | Totale appuntamenti per la settimana corrente |
| **Tasso Non Presentati** | Percentuale di pazienti che non si sono presentati (storico) |
| **Tasso Cancellazioni** | Percentuale di appuntamenti cancellati (storico) |

### 5.4 Viste Calendario

Il calendario supporta tre modalità di visualizzazione:

> **📸 Screenshot necessario:** Vista settimanale del calendario appuntamenti che mostra appuntamenti programmati
>
> *File: `screenshots/calendar-week-view.png`*

#### Vista Giornaliera

- Mostra un singolo giorno con slot orari
- Migliore per la programmazione giornaliera dettagliata
- Ogni ora mostra gli appuntamenti in quello slot
- Codice colore per tipo appuntamento
- Clicca su slot vuoto per creare appuntamento
- Clicca su appuntamento per vedere/modificare

#### Vista Settimanale (Predefinita)

- Mostra 7 giorni (da lunedì a domenica)
- Fornisce panoramica settimanale
- Slot temporali mostrati verticalmente
- Visualizzazione appuntamenti compatta
- Ideale per pianificare la settimana

#### Vista Mensile

- Mostra l'intero mese calendario
- Migliore per pianificazione a lungo termine
- I giorni con appuntamenti mostrano indicatori
- Clicca su un giorno per vedere gli appuntamenti di quel giorno
- Navigazione rapida tra i mesi

#### Navigazione Calendario

- **Frecce Precedente/Successivo**: Muovi indietro/avanti per periodo di vista
- **Pulsante Oggi**: Salta alla data corrente
- **Selettore Vista**: Passa tra Giorno/Settimana/Mese
- **Selettore Data**: Salta a una data specifica

### 5.5 Creare un Appuntamento

#### Metodo 1: Pulsante Nuovo Appuntamento

1. Clicca il pulsante **"Nuovo Appuntamento"** nell'intestazione
2. Si apre il form appuntamento

#### Metodo 2: Clicca sul Calendario

1. Clicca su uno slot temporale vuoto nel calendario
2. Si apre il form appuntamento con data/ora precompilati

#### Campi Form Appuntamento

> **📸 Screenshot necessario:** Form nuovo appuntamento con selezione paziente, selettore data/ora e dropdown tipo
>
> *File: `screenshots/appointment-form.png`*

**Selezione Paziente**:
- Digita il nome paziente per cercare
- Seleziona dai risultati dropdown
- Le info paziente vengono mostrate dopo la selezione

**Medico** (precompilato):
- Mostra il medico attualmente connesso
- Gli admin possono selezionare un medico diverso

**Selezione Data**:
- Il selettore calendario si apre al click
- Date disabilitate: giorni non lavorativi, festività
- Le date passate non sono selezionabili

**Selezione Ora**:
- Dropdown degli slot temporali disponibili
- Basato sulla configurazione orari di lavoro
- Gli slot non disponibili sono marcati
- Mostra indicatore di disponibilità

**Tipo Appuntamento** (Obbligatorio):

| Tipo | Durata Tipica |
|------|---------------|
| NUOVO_PAZIENTE | 45-60 minuti |
| CONTROLLO | 20-30 minuti |
| URGENTE | 15-20 minuti |
| CONSULTO | 30-45 minuti |
| VISITA_ROUTINE | 20-30 minuti |
| AGOPUNTURA | 45-60 minuti |

**Durata** (minuti):
- Precompilata in base al tipo appuntamento
- Può essere regolata manualmente
- Minimo: 15 minuti
- Massimo: 480 minuti (8 ore)

**Motivo della Visita** (Opzionale):
- Campo testo per il motivo dell'appuntamento
- Massimo 2000 caratteri

**Note** (Opzionale):
- Note aggiuntive per l'appuntamento
- Massimo 5000 caratteri
- Visibili al personale clinico

#### Appuntamenti Ricorrenti

Per creare appuntamenti ripetuti:

1. Seleziona **"Rendi questo un appuntamento ricorrente"**
2. Seleziona **Frequenza**:
   - Giornaliero
   - Settimanale
   - Bisettimanale
   - Mensile
   - Annuale
3. Imposta **Intervallo**: Quante unità di frequenza tra gli appuntamenti (1-52)
4. Scegli **Condizione di Fine**:
   - Data Fine: Gli appuntamenti si fermano dopo questa data
   - Max Occorrenze: Ferma dopo X appuntamenti (1-100)

Esempio: Settimanale di martedì per 8 settimane

#### Opzioni Notifica

Configura i promemoria appuntamento:
- Seleziona **"Invia notifica appuntamento"**
- Seleziona il timing del promemoria (es. 24 ore prima, 1 ora prima)
- La notifica email verrà inviata al paziente

#### Salvare l'Appuntamento

1. Completa tutti i campi obbligatori
2. Clicca **"Salva"**
3. Se vengono rilevati conflitti, appare un dialogo di avviso
4. Conferma o regola l'appuntamento
5. In caso di successo, il calendario si aggiorna e l'appuntamento appare

### 5.6 Rilevamento Conflitti

DocPat rileva automaticamente i conflitti di programmazione:

**Tipi di Conflitti**:
- Doppia prenotazione dello stesso medico
- Orari appuntamento sovrapposti
- Appuntamenti fuori dagli orari di lavoro
- Appuntamenti nelle festività

**Quando Viene Rilevato un Conflitto**:
1. Appare un **Dialogo Avviso Conflitto**
2. Mostra l'appuntamento/i in conflitto
3. Opzioni:
   - **Annulla**: Torna indietro e cambia orario
   - **Salva Comunque**: Sovrascrive e crea (se permesso)

### 5.7 Flusso Stati Appuntamento

Gli appuntamenti seguono una progressione di stati definita:

> **📸 Screenshot necessario:** Pannello dettaglio appuntamento che mostra badge stato e pulsanti azione
>
> *File: `screenshots/appointment-status-actions.png`*

```
PROGRAMMATO → CONFERMATO → IN_CORSO → COMPLETATO
                  ↓             ↓
             ANNULLATO     NON_PRESENTATO
```

#### Descrizioni Stati

| Stato | Descrizione | Azioni Successive |
|-------|-------------|-------------------|
| **PROGRAMMATO** | Stato iniziale dopo la creazione | Conferma, Annulla |
| **CONFERMATO** | Il paziente ha confermato la presenza | Inizia, Annulla |
| **IN_CORSO** | Il paziente è attualmente in visita | Completa |
| **COMPLETATO** | Appuntamento terminato con successo | Crea Visita |
| **ANNULLATO** | Appuntamento cancellato | Riprogramma |
| **NON_PRESENTATO** | Il paziente non si è presentato | Riprogramma |

#### Cambiare lo Stato dell'Appuntamento

1. Clicca sull'appuntamento nel calendario
2. Visualizza i dettagli appuntamento nel pannello laterale o modale
3. Clicca il pulsante stato appropriato:
   - **Conferma**: Cambia a CONFERMATO
   - **Inizia**: Cambia a IN_CORSO
   - **Completa**: Cambia a COMPLETATO
   - **Segna Non Presentato**: Cambia a NON_PRESENTATO
   - **Annulla**: Apre dialogo cancellazione

### 5.8 Annullare un Appuntamento

1. Clicca sull'appuntamento per vedere i dettagli
2. Clicca il pulsante **"Annulla"**
3. Appare il **Dialogo Cancellazione**:
   - Titolo: "Conferma Cancellazione"
   - Campo **Motivo Cancellazione** (obbligatorio)
   - Placeholder: "Motivo della cancellazione..."
4. Inserisci il motivo
5. Clicca **"Conferma"** per annullare o **"Annulla"** per abortire
6. Lo stato dell'appuntamento cambia a ANNULLATO
7. Se le notifiche sono abilitate, il paziente viene notificato

### 5.9 Riprogrammare un Appuntamento

Per riprogrammare (cambiare data/ora):

1. Clicca sull'appuntamento
2. Clicca **"Modifica"** o trascina l'appuntamento a un nuovo slot temporale
3. Modifica la data e/o l'ora
4. Salva le modifiche
5. Se le notifiche sono abilitate, il paziente riceve l'aggiornamento

### 5.10 Visualizzare i Dettagli Appuntamento

Clicca qualsiasi appuntamento per vedere:

- Nome paziente e info contatto
- Tipo e stato appuntamento
- Data, ora e durata
- Nome medico
- Motivo della visita
- Note
- Cronologia stati
- Visita associata (se creata)

### 5.11 Stampa Programma

Per stampare il tuo programma giornaliero:

1. Clicca il pulsante **"Stampa Programma"** nell'intestazione
2. Si apre il dialogo di stampa che mostra gli appuntamenti di oggi
3. Usa la funzione stampa del browser (Ctrl+P / Cmd+P)
4. Seleziona stampante e opzioni
5. Stampa il programma

### 5.12 Best Practice Appuntamenti

1. **Confermare gli Appuntamenti**: Contatta i pazienti per confermare 24-48 ore prima
2. **Tempo Buffer**: Lascia spazi tra gli appuntamenti per la documentazione
3. **Tracciare i Non Presentati**: Monitora i tassi di non presentati e fai follow-up con i pazienti
4. **Usare Ricorrenti**: Per follow-up regolari, usa appuntamenti ricorrenti
5. **Documentare le Cancellazioni**: Registra sempre i motivi delle cancellazioni
6. **Controllare i Conflitti**: Rivedi gli avvisi prima di fare doppie prenotazioni

---

## 6. Visite Cliniche

### 6.1 Panoramica

Il modulo Visite Cliniche è il sistema di documentazione clinica centrale in DocPat. Permette ai professionisti sanitari di registrare gli incontri con i pazienti utilizzando il formato standard SOAP (Soggettivo, Oggettivo, Valutazione, Piano), catturare i segni vitali, documentare le diagnosi e firmare digitalmente i record clinici.

### 6.2 Accesso al Modulo Visite

Naviga a **Visite** dalla barra laterale. Vedrai:

- **Intestazione**: Titolo "Visite" con pulsanti azione
- **Schede Statistiche**: Tre schede che mostrano i conteggi visite
- **Scheda Filtri**: Opzioni ricerca e filtro
- **Lista Visite**: Tutte le visite con stato, paziente e data

### 6.3 Statistiche Visite

Tre schede statistiche mostrano:

| Scheda | Descrizione |
|--------|-------------|
| **Totale Visite** | Conteggio completo di tutte le visite |
| **Visite Bozza** | Visite non ancora firmate |
| **Visite Firmate/Bloccate** | Documentazione clinica completata |

### 6.4 Filtrare le Visite

La scheda filtri fornisce diverse opzioni:

| Filtro | Descrizione |
|--------|-------------|
| **Paziente** | Cerca e seleziona paziente specifico |
| **Stato** | Tutti, BOZZA, FIRMATO o BLOCCATO |
| **Da Data** | Inizio intervallo date |
| **A Data** | Fine intervallo date |

Clicca **"Cancella Tutto"** per resettare tutti i filtri.

### 6.5 Creare una Nuova Visita

#### Passo 1: Seleziona Paziente

1. Clicca il pulsante **"Nuova Visita"**
2. Appare un **Dialogo Selezione Paziente**
3. Cerca e seleziona il paziente
4. Clicca **"Continua"**
5. Vieni navigato al form visita

#### Alternativa: Da Dettaglio Paziente

1. Apri la pagina dettagli di un paziente
2. Clicca il pulsante **"Nuova Visita"** nell'intestazione
3. Il form visita si apre con il paziente preselezionato

#### Alternativa: Da Appuntamento

1. Completa un appuntamento
2. Clicca **"Crea Visita"** dall'appuntamento
3. Il form visita si apre collegato a quell'appuntamento

### 6.6 Struttura del Form Visita

Il form visita è organizzato in sezioni seguendo il formato SOAP:

> **📸 Screenshot necessario:** Form visita che mostra sezioni SOAP (Soggettivo, Oggettivo, Valutazione, Piano)
>
> *File: `screenshots/visit-form-soap.png`*

#### Sezione Informazioni Visita

| Campo | Requisiti | Descrizione |
|-------|-----------|-------------|
| **Tipo Visita*** | Dropdown obbligatorio | Tipo di incontro clinico |
| **Data Visita*** | Obbligatorio, precompilato | Data e ora della visita |
| **Modello** | Opzionale | Precompila da modello |

**Tipi di Visita**:
- Visita Iniziale
- Controllo
- Visita Annuale
- Urgenza
- Consulto
- Sessione Agopuntura
- Visita Benessere
- Pre-operatoria
- Post-operatoria

#### Sezione Soggettivo

Documenta i sintomi riportati dal paziente e la storia:

| Campo | Descrizione |
|-------|-------------|
| **Motivo Principale*** | Motivo primario della visita (obbligatorio) |
| **Storia della Malattia Attuale** | Descrizione dettagliata dei sintomi correnti |
| **Revisione dei Sistemi** | Revisione sistematica dei sistemi corporei |
| **Storia Medica Passata** | Condizioni precedenti rilevanti |
| **Storia Familiare** | Storia medica familiare rilevante |
| **Storia Sociale** | Fattori stile di vita, occupazione, abitudini |

**Consigli per la Documentazione Soggettiva**:
- Usa le parole del paziente quando possibile
- Nota durata, gravità e qualità dei sintomi
- Documenta cosa migliora o peggiora i sintomi
- Includi negativi rilevanti (nega febbre, nega dolore toracico)

#### Sezione Oggettivo

Documenta i risultati clinici dall'esame:

**Segni Vitali** (con validazione automatica):

> **📸 Screenshot necessario:** Sezione inserimento segni vitali che mostra campi PA, FC, temperatura, peso, altezza
>
> *File: `screenshots/visit-vitals-section.png`*

| Segno Vitale | Intervallo Valido | Unità |
|--------------|-------------------|-------|
| Pressione Arteriosa Sistolica | 70-250 | mmHg |
| Pressione Arteriosa Diastolica | 40-150 | mmHg |
| Frequenza Cardiaca | 30-250 | bpm |
| Frequenza Respiratoria | 8-60 | respiri/min |
| Temperatura | 35.0-42.0 | °C |
| Peso | 0.5-500 | kg |
| Altezza | 20-300 | cm |
| Saturazione Ossigeno | 70-100 | % |

**BMI**: Calcolato automaticamente da altezza e peso.

**Esame Fisico**:
- Area di testo per risultati esame dettagliati
- Organizza per sistema corporeo
- Documenta risultati normali e anormali

#### Sezione Valutazione

Documenta la tua valutazione clinica e diagnosi:

**Aggiungere Diagnosi**:

> **📸 Screenshot necessario:** Dialogo ricerca diagnosi con risultati ricerca codice ICD-10
>
> *File: `screenshots/visit-diagnosis-search.png`*

1. Clicca il pulsante **"Aggiungi Diagnosi"**
2. Cerca per codice ICD-10 o descrizione
3. Seleziona la diagnosi dai risultati di ricerca
4. Scegli il tipo di diagnosi:
   - **Provvisoria**: Sospettata, in attesa di conferma
   - **Confermata**: Diagnosi verificata
   - **Differenziale**: Possibile diagnosi alternativa
   - **Da Escludere**: Da escludere tramite test
5. Aggiungi note specifiche per questa diagnosi
6. Clicca **"Aggiungi"**

**Gestire le Diagnosi**:
- Visualizza tutte le diagnosi aggiunte in una lista
- Modifica tipo diagnosi o note
- Rimuovi diagnosi
- Riordina le diagnosi per importanza

**Ragionamento Clinico**:
- Area di testo per riepilogo valutazione
- Spiega il tuo ragionamento diagnostico
- Nota considerazioni di diagnosi differenziale

#### Sezione Piano

Documenta il piano di trattamento:

| Campo | Descrizione |
|-------|-------------|
| **Piano di Trattamento** | Approccio terapeutico dettagliato |
| **Farmaci** | Link a prescrizioni o note farmaci |
| **Follow-Up** | Quando tornare, condizioni per ritorno anticipato |
| **Educazione Paziente** | Istruzioni date al paziente |
| **Riferimenti** | Riferimenti a specialisti necessari |

### 6.7 Usare i Modelli Visita

I modelli precompilano pattern di visita comuni:

1. Quando crei una visita, clicca il dropdown **"Seleziona Modello"**
2. Scegli dai modelli disponibili (es. "Visita Annuale", "Follow-Up Diabete")
3. Il contenuto del modello riempie il form
4. Modifica come necessario per il paziente specifico
5. Continua con la documentazione

**Nota**: I modelli sono gestiti dagli amministratori nella sezione Gestione Modelli.

### 6.8 Salvare una Visita

#### Salva come Bozza

1. Completa la documentazione (parziale o completa)
2. Clicca il pulsante **"Salva"**
3. La visita viene salvata con stato BOZZA
4. Può essere modificata e salvata nuovamente
5. Appare nella tua lista visite bozza

#### Auto-Salvataggio

DocPat salva automaticamente le bozze periodicamente per prevenire la perdita di dati.

### 6.9 Firmare una Visita

Una volta completata la documentazione:

1. Rivedi tutte le sezioni per completezza
2. Clicca il pulsante **"Firma Visita"**
3. Appare un dialogo di conferma:
   - Mostra riepilogo visita
   - Elenca le diagnosi
   - Mostra riepilogo segni vitali
4. Rivedi le informazioni
5. Clicca **"Conferma Firma"**

**Caratteristiche Visita Firmata**:
- La firma digitale con timestamp viene registrata
- Mostra "Firmato da [Nome Medico] il [Data/Ora]"
- Lo stato cambia a FIRMATO
- Il contenuto diventa di sola lettura (non modificabile)
- Solo le modifiche possono essere aggiunte

### 6.10 Modificare una Visita Firmata

Se hai bisogno di aggiungere informazioni dopo la firma:

1. Apri la visita firmata
2. Clicca **"Aggiungi Modifica"**
3. Inserisci il testo della modifica
4. La modifica viene timestampata e allegata
5. Il contenuto originale rimane invariato
6. Le modifiche sono visibili nel trail di audit

### 6.11 Bloccare una Visita

Per l'archiviazione permanente:

1. Apri una visita FIRMATA
2. Clicca il pulsante **"Blocca Visita"**
3. Appare dialogo di conferma con avviso
4. Clicca **"Conferma Blocco"**

**Caratteristiche Visita Bloccata**:
- Lo stato cambia a BLOCCATO
- Completamente immutabile (nessuna modifica)
- Non può essere sbloccata
- Conservata per scopi legali/conformità

### 6.12 Visualizzare i Dettagli Visita

Clicca qualsiasi visita nella lista per vedere:

- **Intestazione**: Nome paziente, data visita, badge stato
- **Sezioni SOAP**: Tutta la documentazione visualizzata
- **Segni Vitali**: Segni vitali formattati con valori
- **Diagnosi**: Lista con codici ICD-10 e tipi
- **Informazioni Firma**: Chi ha firmato e quando
- **Azioni**: Basate sullo stato corrente

### 6.13 Azioni Visita per Stato

| Stato | Azioni Disponibili |
|-------|-------------------|
| **BOZZA** | Modifica, Salva, Firma, Elimina |
| **FIRMATO** | Visualizza, Aggiungi Modifica, Blocca, Stampa |
| **BLOCCATO** | Visualizza, Stampa |

### 6.14 Stampare una Visita

Per stampare la documentazione della visita:

1. Apri il dettaglio visita
2. Clicca il pulsante **"Stampa"**
3. Si apre l'anteprima di stampa
4. Usa stampa browser (Ctrl+P / Cmd+P)
5. Seleziona stampante e stampa

### 6.15 Gestione Modelli Visita

Gli amministratori possono gestire i modelli visita:

1. Clicca **"Gestisci Modelli"** nella pagina Visite
2. Visualizza i modelli esistenti
3. Crea nuovi modelli con contenuto precompilato
4. Modifica nome, tipo e contenuto del modello
5. Elimina modelli non utilizzati

### 6.16 Best Practice per la Documentazione Clinica

1. **Completare la Documentazione**: Compila tutte le sezioni rilevanti in modo completo
2. **Inserimento in Tempo Reale**: Documenta durante o immediatamente dopo la visita
3. **Essere Specifici**: Usa terminologia e misurazioni precise
4. **Documentare Oggettivamente**: Registra i risultati senza pregiudizi
5. **Includere Negativi Pertinenti**: Nota risultati assenti rilevanti
6. **Firmare Prontamente**: Firma le visite lo stesso giorno quando possibile
7. **Rivedere Prima di Firmare**: Una volta firmato, le modifiche richiedono integrazioni
8. **Usare i Modelli**: Sfrutta i modelli per l'efficienza
9. **Seguire l'Ordine SOAP**: Mantieni un flusso di documentazione logico
10. **Collegare agli Appuntamenti**: Connetti le visite ai loro appuntamenti

---

## 7. Prescrizioni

### 7.1 Panoramica

Il modulo Prescrizioni permette ai professionisti sanitari di creare, gestire e tracciare le prescrizioni farmaci. Include ricerca database farmaci, controllo automatico interazioni farmacologiche, gestione ricariche e modelli prescrizione per l'efficienza.

### 7.2 Accesso alle Prescrizioni

Naviga a **Prescrizioni** dalla barra laterale. Vedrai:

- **Intestazione**: Icona pillola, titolo "Prescrizioni"
- **Pulsante Nuova Prescrizione**: Crea nuova prescrizione
- **Filtri**: Opzioni ricerca e filtro
- **Lista Prescrizioni**: Schede che mostrano tutte le prescrizioni

### 7.3 Funzionalità Lista Prescrizioni

#### Filtri

| Filtro | Opzioni |
|--------|---------|
| **Paziente** | Cerca e seleziona paziente |
| **Stato** | Tutti, Attive, In Pausa, Sospese, Completate, Annullate |
| **Scadute** | Mostra/nascondi prescrizioni scadute |
| **Intervallo Date** | Filtra per data prescrizione |

#### Schede Prescrizione

Ogni scheda prescrizione mostra:
- Nome farmaco (generico e marca)
- Dosaggio e frequenza
- Nome paziente
- Date inizio/fine
- Informazioni ricarica
- Badge stato (codice colore)
- Badge avviso interazione (se applicabile)

**Codice Colore Stati**:

| Stato | Colore | Descrizione |
|-------|--------|-------------|
| **ATTIVA** | Verde | Prescrizione attualmente valida |
| **IN_PAUSA** | Giallo | Temporaneamente sospesa |
| **SOSPESA** | Arancione | Interrotta dal medico |
| **COMPLETATA** | Grigio | Corso prescrizione terminato |
| **ANNULLATA** | Rosso | Mai iniziata/annullata |

### 7.4 Creare una Prescrizione

1. Clicca il pulsante **"Nuova Prescrizione"**
2. Si apre il form prescrizione

> **📸 Screenshot necessario:** Form prescrizione con ricerca farmaco, campi dosaggio e istruzioni
>
> *File: `screenshots/prescription-form.png`*

#### Campi Form Prescrizione

**Selezione Paziente** (Obbligatorio):
- Cerca paziente per nome o MRN
- Seleziona dai risultati
- Se viene da dettaglio paziente, precompilato

**Ricerca Farmaco**:
- Digita nome farmaco per cercare nel database
- I risultati mostrano nome generico, nomi marca, forme
- Seleziona il farmaco desiderato
- OPPURE clicca **"Farmaco Personalizzato"** per farmaci non elencati

**Dialogo Farmaco Personalizzato**:
- Nome Farmaco (obbligatorio)
- Nome Generico
- Concentrazione/Dosaggio
- Forma (compressa, capsula, liquido, ecc.)
- Clicca "Aggiungi" per creare voce personalizzata

**Dettagli Farmaco** (dopo la selezione):

| Campo | Requisiti | Descrizione |
|-------|-----------|-------------|
| **Nome Generico*** | Obbligatorio | Nome generico del farmaco |
| **Nome Marca** | Opzionale | Nome marca se applicabile |
| **Concentrazione*** | Obbligatorio | Concentrazione dosaggio (es. "500mg") |
| **Forma*** | Dropdown obbligatorio | Compressa, Capsula, Liquido, Iniezione, Topico, ecc. |

**Istruzioni Dosaggio**:

| Campo | Requisiti | Descrizione |
|-------|-----------|-------------|
| **Quantità*** | Numero obbligatorio | Quantità per dose (es. 1, 2) |
| **Unità*** | Obbligatorio | compressa, capsula, ml, ecc. |
| **Frequenza*** | Dropdown obbligatorio | Una volta al giorno, Due volte al giorno, Ogni 8 ore, Al bisogno, ecc. |
| **Via*** | Dropdown obbligatorio | Orale, Topico, Iniezione, Inalazione, ecc. |
| **Data Inizio*** | Obbligatorio | Quando iniziare il farmaco |
| **Data Fine** | Opzionale | Quando fermare (se noto) |

**Informazioni Ricarica**:

| Campo | Requisiti | Descrizione |
|-------|-----------|-------------|
| **Ricariche Consentite** | Numero | Quante ricariche permesse (0 per nessuna) |
| **Frequenza Ricarica** | Dropdown | Quanto spesso le ricariche possono essere ottenute |

**Istruzioni Speciali**:
- Area di testo per istruzioni al paziente
- Include:
  - Assumere con cibo/a stomaco vuoto
  - Evitare certe attività
  - Segnali di allarme a cui prestare attenzione
  - Istruzioni conservazione

### 7.5 Controllo Interazioni Farmacologiche

DocPat controlla automaticamente le interazioni farmacologiche:

**Come Funziona**:
1. Quando aggiungi un farmaco, il sistema controlla contro:
   - Altre prescrizioni attive del paziente
   - Database noto di interazioni farmaco-farmaco
2. Gli avvisi appaiono immediatamente
3. Devi riconoscere gli avvisi prima di salvare

**Livelli Gravità Interazione**:

| Livello | Colore | Descrizione | Azione Richiesta |
|---------|--------|-------------|------------------|
| **Controindicato** | Rosso | Evitare questa combinazione | Non prescrivere insieme |
| **Maggiore** | Arancione | Rischio serio di interazione | Usa alternativa se possibile |
| **Moderato** | Giallo | Può causare problemi | Usa con cautela |
| **Minore** | Blu | Basso rischio | Monitora paziente |

**Visualizzazione Avviso Interazione**:
- Badge avviso appare sulla prescrizione
- Clicca per vedere dettagli interazione
- Mostra: gravità, descrizione, effetti clinici, raccomandazioni

> **📸 Screenshot necessario:** Dialogo avviso interazione farmacologica che mostra livello gravità e dettagli clinici
>
> *File: `screenshots/drug-interaction-warning.png`*

**Importante**: Rivedi sempre gli avvisi di interazione prima di finalizzare le prescrizioni. Documenta la giustificazione clinica se sovrascrivi gli avvisi.

### 7.6 Azioni Prescrizione

#### Visualizza Prescrizione
- Clicca la scheda prescrizione per vedere dettagli completi
- Mostra tutte le info farmaco, dosaggio, istruzioni
- Mostra informazioni interazione
- Elenca cronologia ricariche

#### Modifica Prescrizione
- Apri dettaglio prescrizione
- Clicca il pulsante **"Modifica"**
- Modifica i campi
- Salva le modifiche
- Disponibile solo per prescrizioni ATTIVE o IN_PAUSA

#### Rinnova Prescrizione
1. Apri una prescrizione ATTIVA
2. Clicca il pulsante **"Rinnova"**
3. Viene creata una nuova prescrizione con stessi dettagli
4. Nuova data inizio applicata
5. Prescrizione originale marcata come COMPLETATA

#### Sospendi Prescrizione
1. Apri una prescrizione ATTIVA
2. Clicca il pulsante **"Sospendi"**
3. Appare **Dialogo Sospensione**:
   - Motivo sospensione (obbligatorio)
   - Data effettiva
4. Inserisci motivo (es. "Effetti collaterali", "Non più necessario")
5. Clicca **"Conferma"**
6. Lo stato cambia a SOSPESA

#### Riprendi Prescrizione
Per prescrizioni IN_PAUSA:
1. Apri la prescrizione
2. Clicca il pulsante **"Riprendi"**
3. Conferma nel dialogo
4. Lo stato cambia a ATTIVA

#### Stampa Prescrizione
1. Apri dettaglio prescrizione
2. Clicca il pulsante **"Stampa"**
3. Il dialogo stampa mostra la prescrizione formattata
4. Include: info paziente, farmaco, dosaggio, linea firma medico
5. Stampa usando la funzione stampa del browser

#### Elimina Prescrizione (Solo Admin)
1. Apri dettaglio prescrizione
2. Clicca il pulsante **"Elimina"**
3. Conferma eliminazione
4. Prescrizione rimossa (registrata nell'audit)

### 7.7 Modelli Prescrizione

Per farmaci prescritti frequentemente:

#### Usare i Modelli
1. Nel form prescrizione, clicca **"Usa Modello"**
2. Seleziona dai modelli disponibili
3. Il form si precompila con i valori del modello
4. Regola come necessario per il paziente
5. Completa e salva

#### Gestione Modelli (Admin)
1. Naviga alla sezione modelli prescrizione
2. Visualizza modelli esistenti
3. Crea nuovo modello:
   - Nome modello
   - Informazioni farmaco
   - Dosaggio e istruzioni predefiniti
4. Modifica o elimina modelli esistenti

### 7.8 Visualizzare le Prescrizioni di un Paziente

Dalla pagina dettagli di un paziente:
1. Scorri alla sezione **Prescrizioni**
2. Vedi tutte le prescrizioni per quel paziente
3. Visualizza attive, storiche e sospese
4. Clicca **"Nuova Prescrizione"** per aggiungere

### 7.9 Best Practice Prescrizioni

1. **Controllare le Interazioni**: Rivedi sempre gli avvisi di interazione
2. **Istruzioni Chiare**: Fornisci istruzioni specifiche e comprensibili
3. **Documentare la Motivazione**: Nota perché è stato scelto il farmaco
4. **Rivedere le Allergie**: Controlla le allergie del paziente prima di prescrivere
5. **Durata Appropriata**: Imposta la durata del trattamento corretta
6. **Monitorare le Ricariche**: Traccia le richieste di ricarica
7. **Sospendere Correttamente**: Documenta sempre i motivi di sospensione
8. **Usare i Modelli**: Crea modelli per prescrizioni comuni
9. **Follow-Up**: Programma follow-up per revisione farmaci
10. **Educazione Paziente**: Assicurati che il paziente comprenda la prescrizione

---

## 8. Documenti

### 8.1 Panoramica

Il modulo Documenti permette la generazione di documenti medici professionali inclusi certificati, lettere di riferimento, richieste laboratorio e riepiloghi visite. Presenta un sistema di modelli con sostituzione variabili per la personalizzazione.

### 8.2 Accesso ai Documenti

Naviga a **Documenti** dalla barra laterale. Vedrai:

- **Intestazione**: Icona file, titolo "Documenti"
- **Pulsante Gestisci Modelli**: (Solo admin) Accedi alla gestione modelli
- **Lista Documenti**: Tutti i documenti generati con filtri

### 8.3 Funzionalità Lista Documenti

#### Filtri

| Filtro | Descrizione |
|--------|-------------|
| **Paziente** | Cerca e seleziona paziente |
| **Tipo Documento** | Filtra per tipo modello |
| **Intervallo Date** | Intervallo data generazione |
| **Stato** | Bozza, Finale, Inviato |

#### Visualizzazione Lista Documenti

Ogni documento mostra:
- Titolo/tipo documento
- Nome paziente
- Data generazione
- Stato
- Pulsanti azione: Scarica, Email, Elimina

### 8.4 Tipi di Documento

DocPat supporta vari modelli documento:

| Tipo | Scopo |
|------|-------|
| **Certificato Medico** | Prova di consulto/visita |
| **Lettera di Riferimento** | Invio paziente a specialista |
| **Richiesta Laboratorio** | Ordinazione esami di laboratorio |
| **Riepilogo Visita** | Sommario dell'incontro clinico |
| **Report Prescrizione** | Documento prescrizione formale |
| **Personalizzato** | Documenti specifici dello studio |

### 8.5 Generare un Documento

1. Clicca **"Genera Documento"** (dalla pagina Documenti o Dettaglio Paziente)
2. Si apre il **Dialogo Generazione Documento**

> **📸 Screenshot necessario:** Dialogo generazione documento con selezione modello e campi variabili
>
> *File: `screenshots/document-generation-dialog.png`*

#### Passo 1: Seleziona Modello
- Sfoglia i modelli disponibili
- Seleziona il tipo di modello appropriato
- L'anteprima mostra la struttura del modello

#### Passo 2: Seleziona Paziente
- Se non preselezionato, scegli il paziente
- Le informazioni paziente si compilano automaticamente

#### Passo 3: Seleziona Record Correlati (Opzionale)
- Collega a visita specifica
- Collega a appuntamento specifico
- Collega a prescrizioni

#### Passo 4: Rivedi Variabili
Le variabili del modello vengono compilate automaticamente:
- Informazioni paziente (nome, data nascita, ecc.)
- Informazioni studio (nome, indirizzo, ecc.)
- Informazioni visita (se collegata)
- Informazioni medico

**Variabili Manuali**:
Alcuni modelli richiedono input manuale:
- Campi testo personalizzati
- Date specifiche
- Note aggiuntive

#### Passo 5: Anteprima
- Vedi come apparirà il documento
- Controlla che tutte le informazioni siano corrette
- Verifica la formattazione

#### Passo 6: Genera
1. Clicca il pulsante **"Genera"**
2. Il documento viene creato
3. Opzione per:
   - **Scarica**: Salva PDF sul dispositivo
   - **Email**: Invia al paziente
   - **Entrambi**: Scarica e invia email

### 8.6 Variabili del Modello

I modelli usano variabili che si compilano automaticamente. Le variabili comuni includono:

**Variabili Paziente**:
- `{{patient.first_name}}` - Nome del paziente
- `{{patient.last_name}}` - Cognome del paziente
- `{{patient.full_name}}` - Nome completo
- `{{patient.date_of_birth}}` - Data di nascita
- `{{patient.age}}` - Età calcolata
- `{{patient.gender}}` - Sesso
- `{{patient.fiscal_code}}` - Codice fiscale
- `{{patient.phone}}` - Numero telefono
- `{{patient.email}}` - Indirizzo email
- `{{patient.address}}` - Indirizzo completo

**Variabili Studio**:
- `{{practice.name}}` - Nome studio
- `{{practice.address}}` - Indirizzo studio
- `{{practice.phone}}` - Telefono studio
- `{{practice.email}}` - Email studio

**Variabili Medico**:
- `{{provider.name}}` - Nome completo medico
- `{{provider.title}}` - Titolo professionale

**Variabili Visita** (se collegata):
- `{{visit.date}}` - Data visita
- `{{visit.type}}` - Tipo visita
- `{{visit.diagnosis}}` - Diagnosi primaria
- `{{visit.notes}}` - Note visita

**Variabili Data**:
- `{{current_date}}` - Data odierna
- `{{current_time}}` - Ora corrente

### 8.7 Scaricare Documenti

1. Trova il documento nella lista
2. Clicca **icona Scarica** (o apri e clicca Scarica)
3. Il PDF si scarica sul tuo dispositivo
4. Apri con visualizzatore PDF

### 8.8 Inviare Documenti via Email

1. Clicca **icona Email** sul documento
2. Si apre **Dialogo Email Documento**:
   - **Email Destinatario**: Precompilata con email paziente (modificabile)
   - **Destinatari Aggiuntivi**: Aggiungi altri indirizzi email
   - **Oggetto**: Precompilato, può essere modificato
   - **Corpo**: Testo messaggio email
3. Rivedi e modifica come necessario
4. Clicca **"Invia"**
5. Viene creata e tracciata una notifica

### 8.9 Modelli Documento (Solo Admin)

Gli amministratori possono gestire i modelli:

#### Accesso alla Gestione Modelli
1. Clicca **"Gestisci Modelli"** nella pagina Documenti
2. Oppure naviga a **Modelli Documento** nella sezione Admin

#### Visualizzazione Modelli
- La lista mostra tutti i modelli
- Nome modello, tipo, ultima modifica
- Azioni: Modifica, Elimina, Duplica

#### Creare un Nuovo Modello

1. Clicca **"Nuovo Modello"**
2. Compila i dettagli del modello:

**Informazioni Base**:
- **Nome Modello**: Nome descrittivo
- **Tipo Modello**: Seleziona dal dropdown
- **Descrizione**: Scopo del modello

**Contenuto Modello**:
- Editor rich text per il contenuto
- Barra strumenti inserimento variabili
- Opzioni formattazione (grassetto, corsivo, liste, ecc.)

**Riferimento Variabili**:
- Barra laterale mostra variabili disponibili
- Clicca per inserire variabile
- Le variabili vengono evidenziate nel contenuto

3. **Anteprima**: Vedi il modello con dati esempio
4. Clicca **"Salva Modello"**

#### Modificare Modelli
1. Clicca **Modifica** sul modello
2. Modifica il contenuto
3. Anteprima modifiche
4. Salva

#### Eliminare Modelli
1. Clicca **Elimina** sul modello
2. Conferma eliminazione
3. Modello rimosso (non può essere annullato)

### 8.10 Best Practice Documenti

1. **Verificare le Informazioni**: Controlla sempre i dati compilati automaticamente
2. **Linguaggio Professionale**: Mantieni un tono professionale
3. **Completare i Modelli**: Assicurati che tutti i campi richiesti siano compilati
4. **Anteprima Prima di Generare**: Individua errori prima di finalizzare
5. **Consegna Tempestiva**: Invia i documenti via email prontamente
6. **Tracciare la Consegna**: Monitora lo stato delle notifiche
7. **Manutenzione Modelli**: Rivedi e aggiorna regolarmente i modelli
8. **Formattazione Coerente**: Usa modelli standard per coerenza

---

## 9. Report

### 9.1 Panoramica

Il modulo Report fornisce analisi e statistiche per aiutarti a comprendere le performance del tuo studio. Include quattro tipi di report con grafici interattivi, capacità di filtraggio e opzioni di esportazione multi-formato.

### 9.2 Accesso ai Report

Naviga a **Report** dalla barra laterale. Vedrai:

- **Intestazione**: Icona trending, titolo "Report"
- **Selettore Intervallo Date**: Seleziona periodo di analisi
- **Pulsante Aggiorna**: Ricarica dati report
- **Menu Esporta**: Scarica report
- **Tab Report**: Quattro categorie di report

### 9.3 Selezione Intervallo Date

Tutti i report possono essere filtrati per intervallo date:

1. Clicca il selettore date nell'intestazione
2. Seleziona **Da Data** e **A Data**
3. Clicca **Applica**
4. I report si aggiornano per mostrare il periodo selezionato

**Intervalli Predefiniti**:
- Oggi
- Ultimi 7 Giorni
- Ultimi 30 Giorni
- Questo Mese
- Mese Scorso
- Quest'Anno
- Intervallo Personalizzato

### 9.4 Report Appuntamenti

Mostra statistiche relative agli appuntamenti:

> **📸 Screenshot necessario:** Report appuntamenti con schede statistiche e grafici trend
>
> *File: `screenshots/report-appointments.png`*

#### Metriche Visualizzate

| Metrica | Descrizione |
|---------|-------------|
| **Totale Appuntamenti** | Conteggio di tutti gli appuntamenti |
| **Completati** | Completati con successo |
| **Programmati** | Appuntamenti futuri |
| **Tasso Non Presentati** | Percentuale di non presentati |
| **Tasso Cancellazioni** | Percentuale cancellati |

#### Grafici

- **Trend Appuntamenti**: Grafico a linee che mostra appuntamenti nel tempo
- **Per Tipo**: Grafico a torta dei tipi appuntamento
- **Distribuzione Giornaliera**: Grafico a barre degli appuntamenti per giorno della settimana
- **Trend Non Presentati/Cancellazioni**: Grafico a linee degli appuntamenti mancati

### 9.5 Report Pazienti

Mostra statistiche relative ai pazienti:

> **📸 Screenshot necessario:** Report pazienti che mostra grafico crescita e distribuzione demografica
>
> *File: `screenshots/report-patients.png`*

#### Metriche Visualizzate

| Metrica | Descrizione |
|---------|-------------|
| **Totale Pazienti** | Tutti i pazienti registrati |
| **Nuovi Pazienti** | Pazienti aggiunti nel periodo |
| **Pazienti Attivi** | Attualmente attivi |
| **Pazienti Inattivi** | Pazienti disattivati |

#### Grafici

- **Crescita Pazienti**: Grafico a linee che mostra nuove registrazioni
- **Distribuzione Sesso**: Grafico a torta dei sessi dei pazienti
- **Distribuzione Età**: Grafico a barre delle età dei pazienti
- **Suddivisione Stato**: Attivi vs inattivi

### 9.6 Report Diagnosi

Mostra statistiche relative alle diagnosi:

> **📸 Screenshot necessario:** Report diagnosi con grafico a barre delle principali diagnosi
>
> *File: `screenshots/report-diagnoses.png`*

#### Metriche Visualizzate

| Metrica | Descrizione |
|---------|-------------|
| **Totale Diagnosi** | Tutte le diagnosi registrate |
| **Condizioni Uniche** | Numero di diagnosi diverse |
| **Più Comune** | Diagnosi principale |

#### Grafici

- **Top 20 Diagnosi**: Grafico a barre delle più frequenti
- **Frequenza Diagnosi**: Tabella con conteggi
- **Distribuzione ICD-10**: Suddivisione per categoria

#### Opzioni Aggiuntive

- **Limite**: Mostra top 10, 20, 50 o 100 diagnosi
- **Ordina Per**: Frequenza, alfabetico, codice ICD

### 9.7 Report Produttività

Mostra metriche di produttività del medico:

> **📸 Screenshot necessario:** Report produttività che mostra carico lavoro medico e trend visite
>
> *File: `screenshots/report-productivity.png`*

#### Metriche Visualizzate

| Metrica | Descrizione |
|---------|-------------|
| **Totale Visite** | Visite completate |
| **Durata Media Visita** | Tempo medio per visita |
| **Appuntamenti Soddisfatti** | Tasso di completamento |
| **Prescrizioni Scritte** | Numero di prescrizioni |

#### Grafici

- **Carico di Lavoro Medico**: Grafico a barre delle visite per medico
- **Trend Visite**: Grafico a linee nel tempo
- **Soddisfazione Appuntamenti**: Tasso di appuntamenti completati
- **Tempo Documentazione**: Durata media documentazione

### 9.8 Esportare i Report

Per esportare i dati del report:

1. Clicca il dropdown **"Esporta"** nell'intestazione
2. Seleziona formato:
   - **JSON**: Formato dati grezzi
   - **CSV**: Compatibile foglio di calcolo
   - **PDF**: Documento stampabile
   - **Excel**: Formato Microsoft Excel
3. Il file si scarica automaticamente
4. I filtri correnti vengono applicati all'esportazione

### 9.9 Aggiornare i Report

Se fai modifiche e vuoi aggiornare i report:

1. Clicca il pulsante **"Aggiorna"** nell'intestazione
2. I report si ricaricano con i dati correnti
3. Mantiene i filtri selezionati e l'intervallo date

### 9.10 Best Practice Report

1. **Revisione Regolare**: Controlla i report settimanalmente/mensilmente
2. **Identificare Trend**: Cerca pattern nel tempo
3. **Affrontare i Non Presentati**: Indaga alti tassi di non presentati
4. **Monitorare la Produttività**: Traccia il carico di lavoro del medico
5. **Usare Intervalli Date**: Confronta periodi diversi
6. **Esportare per Riunioni**: Scarica report per discussioni di team
7. **Tracciare la Crescita**: Monitora i trend di acquisizione pazienti

---

## 10. Notifiche

### 10.1 Panoramica

Il modulo Notifiche gestisce tutte le notifiche di sistema inclusi promemoria appuntamenti, consegne documenti e avvisi di sistema. Fornisce tracciamento, funzionalità di ripetizione e monitoraggio stato.

### 10.2 Accesso alle Notifiche

Naviga a **Notifiche** dalla barra laterale. Vedrai:

- **Intestazione**: Icona campanella, titolo "Notifiche", pulsante Aggiorna
- **Schede Statistiche**: Quattro schede stato
- **Filtri**: Opzioni ricerca e filtro
- **Lista Notifiche**: Tutte le notifiche con stato

> **📸 Screenshot necessario:** Pagina notifiche che mostra schede statistiche e lista notifiche con badge stato
>
> *File: `screenshots/notifications-list.png`*

### 10.3 Statistiche Notifiche

Quattro schede mostrano le metriche delle notifiche:

| Scheda | Icona | Descrizione |
|--------|-------|-------------|
| **Totale** | Mail | Tutte le notifiche di sempre |
| **In Attesa** | Orologio (giallo) | In attesa di consegna |
| **Inviate Oggi** | Spunta (verde) | Inviate con successo oggi |
| **Fallite** | X (rosso) | Richiedono attenzione |

### 10.4 Tipi di Notifica

| Tipo | Descrizione |
|------|-------------|
| **EMAIL** | Notifiche email |
| **SMS** | Notifiche messaggio testo (se configurato) |
| **IN_APP** | Notifiche interne all'applicazione |

### 10.5 Stato Notifica

| Stato | Descrizione |
|-------|-------------|
| **IN_ATTESA** | Programmata per la consegna |
| **INVIATA** | Consegnata con successo |
| **FALLITA** | Consegna fallita |
| **ANNULLATA** | Annullata prima della consegna |

### 10.6 Filtrare le Notifiche

| Filtro | Opzioni |
|--------|---------|
| **Tipo** | EMAIL, SMS, IN_APP, Tutti |
| **Stato** | IN_ATTESA, INVIATA, FALLITA, Tutti |
| **Intervallo Date** | Filtra per data |
| **Destinatario** | Cerca per destinatario |

### 10.7 Visualizzazione Lista Notifiche

Ogni notifica mostra:
- Email/telefono destinatario
- Badge tipo (EMAIL, SMS, IN_APP)
- Badge stato (codice colore)
- Timestamp
- Anteprima oggetto/messaggio
- Pulsanti azione

### 10.8 Azioni Notifica

#### Ripetere Notifiche Fallite

1. Trova la notifica con stato FALLITA
2. Clicca il pulsante **"Riprova"**
3. Conferma nel dialogo
4. Il sistema tenta di reinviare
5. Lo stato si aggiorna in base al risultato

#### Annullare Notifiche in Attesa

1. Trova la notifica con stato IN_ATTESA
2. Clicca il pulsante **"Annulla"**
3. Conferma annullamento
4. Lo stato cambia a ANNULLATA

#### Visualizzare Dettagli Notifica

1. Clicca sulla notifica
2. Visualizza dettagli completi:
   - Informazioni destinatario
   - Contenuto messaggio completo
   - Tentativi di consegna
   - Messaggi di errore (se fallita)
   - Timestamp

### 10.9 Campanella Notifiche nell'Intestazione

Nell'intestazione dell'applicazione:
- L'icona campanella mostra il conteggio non lette
- Clicca per vedere una vista rapida delle notifiche recenti
- Clicca "Vedi Tutte" per andare alla pagina Notifiche

### 10.10 Best Practice Notifiche

1. **Monitorare le Fallite**: Controlla regolarmente le notifiche fallite
2. **Riprovare Prontamente**: Riprova le notifiche fallite velocemente
3. **Controllare i Destinatari**: Verifica accuratezza email/telefono
4. **Tracciare la Consegna**: Conferma che le notifiche importanti siano state inviate
5. **Pulire**: Annulla notifiche in attesa non necessarie

---

## 11. Amministrazione

*Questa sezione è solo per utenti Admin.*

### 11.1 Panoramica

La sezione Amministrazione fornisce configurazione di sistema, gestione utenti, logging di audit e monitoraggio salute. Solo gli utenti con il ruolo Admin possono accedere a queste funzionalità.

### 11.2 Gestione Utenti

Naviga a **Utenti** dalla barra laterale.

> **📸 Screenshot necessario:** Pagina gestione utenti che mostra lista utenti con ruoli e stato
>
> *File: `screenshots/admin-user-management.png`*

#### Visualizzazione Utenti

- La lista mostra tutti gli utenti del sistema
- Cerca per nome, nome utente o email
- Filtra per ruolo (ADMIN, DOTTORE)
- Filtra per stato (ATTIVO, INATTIVO)

#### Informazioni Utente Visualizzate

| Campo | Descrizione |
|-------|-------------|
| Nome | Nome completo |
| Nome Utente | Nome utente di login |
| Email | Email di contatto |
| Ruolo | ADMIN o DOTTORE |
| Stato | ATTIVO o INATTIVO |
| Ultimo Accesso | Data ultimo login |

#### Creare un Nuovo Utente

1. Clicca il pulsante **"Nuovo Utente"**
2. Compila il form utente:

**Informazioni Personali**:
- Nome* (obbligatorio)
- Cognome* (obbligatorio)
- Secondo Nome (opzionale)
- Email* (obbligatorio, unica, formato valido)
- Telefono (opzionale)

**Informazioni Account**:
- Nome Utente* (obbligatorio, unico, min 3 caratteri)
- Password* (obbligatorio per nuovi utenti):
  - Minimo 8 caratteri
  - Almeno una lettera maiuscola
  - Almeno una lettera minuscola
  - Almeno un numero
  - Almeno un carattere speciale
- Conferma Password* (deve corrispondere)

**Assegnazione Ruolo**:
- Ruolo* (obbligatorio): ADMIN o DOTTORE

3. Clicca **"Crea Utente"**
4. L'utente riceve le credenziali via email

#### Modificare un Utente

1. Clicca l'utente nella lista
2. Clicca il pulsante **"Modifica"**
3. Modifica le informazioni
4. Salva le modifiche

#### Attivare/Disattivare Utenti

- **Disattivare**: Impedisce il login, preserva i record
- **Attivare**: Ripristina l'accesso al login

1. Clicca l'utente nella lista
2. Clicca **"Disattiva"** o **"Attiva"**
3. Conferma l'azione

#### Resettare la Password Utente

1. Clicca l'utente nella lista
2. Clicca **"Reset Password"**
3. Viene generata una nuova password
4. L'utente riceve un'email con le nuove credenziali

#### Resettare l'MFA Utente

Se un utente perde il suo dispositivo MFA:

1. Clicca l'utente nella lista
2. Clicca **"Reset MFA"**
3. Conferma l'azione
4. L'utente può configurare l'MFA nuovamente al prossimo login

### 11.3 Impostazioni di Sistema

Naviga a **Impostazioni** dalla barra laterale.

> **📸 Screenshot necessario:** Pagina impostazioni sistema che mostra tab Impostazioni Studio
>
> *File: `screenshots/admin-system-settings.png`*

Le impostazioni sono organizzate in tab:

#### Impostazioni Studio

| Impostazione | Descrizione |
|--------------|-------------|
| Nome Studio | Nome visualizzato per il tuo studio |
| Indirizzo | Ubicazione dello studio |
| Telefono | Numero di contatto |
| Email | Email dello studio |
| Sito Web | URL sito web (opzionale) |
| Logo | Carica logo dello studio |
| Info Licenza | Dettagli licenza professionale |

#### Impostazioni Appuntamenti

| Impostazione | Descrizione |
|--------------|-------------|
| Durata Predefinita | Lunghezza standard appuntamento (minuti) |
| Prenotazione Anticipata | Quanto in anticipo possono essere prenotati gli appuntamenti |
| Preavviso Cancellazione | Preavviso richiesto per cancellazione |
| Orario Promemoria | Quando inviare i promemoria |
| Tempo Buffer | Tempo tra gli appuntamenti |

#### Impostazioni Localizzazione

| Impostazione | Descrizione |
|--------------|-------------|
| Lingua Predefinita | Default sistema (Inglese/Italiano) |
| Fuso Orario | Fuso orario locale |
| Formato Data | Formato visualizzazione data |
| Valuta | Valuta per visualizzazioni finanziarie |

#### Impostazioni Sicurezza

| Impostazione | Descrizione |
|--------------|-------------|
| MFA Obbligatorio | Forza MFA per tutti gli utenti |
| Timeout Sessione | Timeout inattività (minuti) |
| Scadenza Password | Giorni fino al cambio password obbligatorio |
| Whitelist IP | Indirizzi IP consentiti (opzionale) |
| Lunghezza Minima Password | Lunghezza password richiesta |

#### Orari di Lavoro

Configura il programma giornaliero:
- Per ogni giorno (Lunedì-Domenica):
  - Ora inizio
  - Ora fine
  - Pause
  - Stato Aperto/Chiuso

#### Festività

Gestisci le chiusure dello studio:
- Aggiungi date festività
- Nome festività
- Opzioni ricorrenti
- Elimina festività passate

#### Impostazioni Email

| Impostazione | Descrizione |
|--------------|-------------|
| Server SMTP | Indirizzo server mail |
| Porta SMTP | Porta server mail |
| Nome Utente | Autenticazione SMTP |
| Password | Password SMTP |
| Nome Mittente | Nome "Da" |
| Email Mittente | Indirizzo email "Da" |

#### Impostazioni Scheduler

| Impostazione | Descrizione |
|--------------|-------------|
| Orario Backup | Quando viene eseguito il backup giornaliero |
| Coda Notifiche | Programma elaborazione notifiche |
| Generazione Report | Timing report programmati |

#### Impostazioni Backup

| Impostazione | Descrizione |
|--------------|-------------|
| Frequenza Backup | Quanto spesso fare backup |
| Periodo Conservazione | Quanto tempo conservare i backup |
| Posizione Storage | Destinazione backup |
| Backup Manuale | Attiva backup immediato |

### 11.4 Log di Audit

Naviga a **Log di Audit** dalla barra laterale.

> **📸 Screenshot necessario:** Pagina log di audit che mostra voci log con filtri e vista dettaglio
>
> *File: `screenshots/admin-audit-logs.png`*

#### Scopo

I log di audit tracciano tutte le azioni significative nel sistema per sicurezza e conformità.

#### Informazioni Log

| Campo | Descrizione |
|-------|-------------|
| Timestamp | Quando è avvenuta l'azione |
| Utente | Chi ha eseguito l'azione |
| Azione | Cosa è stato fatto (CREA, AGGIORNA, ELIMINA) |
| Tipo Entità | Cosa è stato interessato (paziente, appuntamento, ecc.) |
| ID Entità | Identificatore del record interessato |
| Risultato | SUCCESSO o FALLIMENTO |
| Modifiche | Valori prima/dopo |

#### Filtrare i Log

| Filtro | Opzioni |
|--------|---------|
| Intervallo Date | Date da/a |
| Utente | Seleziona utente specifico |
| Tipo Entità | Paziente, Appuntamento, Visita, ecc. |
| Azione | CREA, AGGIORNA, ELIMINA, LOGIN, ecc. |
| Risultato | SUCCESSO, FALLIMENTO |

#### Visualizzare Dettagli Log

1. Clicca sulla voce log
2. Visualizza dettagli completi:
   - Timestamp completo
   - Informazioni utente
   - Indirizzo IP
   - User agent (browser)
   - Dettagli completi modifiche
   - Confronto JSON prima/dopo

#### Esportare i Log

1. Clicca il pulsante **"Esporta"**
2. Seleziona formato (PDF o CSV)
3. Scegli intervallo date
4. Seleziona campi da includere
5. Scarica file

#### Tab Statistiche

Visualizza analisi audit:
- Azioni nel tempo (grafico)
- Utenti più attivi
- Entità più modificate
- Distribuzione azioni (grafico a torta)
- Tassi successo/fallimento

### 11.5 Stato Sistema

Naviga a **Stato Sistema** dalla barra laterale.

> **📸 Screenshot necessario:** Dashboard stato sistema che mostra indicatori stato componenti
>
> *File: `screenshots/admin-system-health.png`*

#### Componenti Monitorati

| Componente | Controlli |
|------------|-----------|
| Database | Connessione, performance query |
| API | Tempi di risposta, tassi di errore |
| Storage | Utilizzo disco, stato backup |
| Email | Connettività SMTP |
| Cache | Stato Redis (se abilitato) |

#### Indicatori di Stato

- **Verde**: Sano, funzionamento normale
- **Giallo**: Avviso, potrebbe richiedere attenzione
- **Rosso**: Critico, richiede azione immediata

#### Metriche Visualizzate

- Uptime server
- Tempo risposta database
- Latenza API (p50, p95, p99)
- Sessioni attive
- Utilizzo spazio disco
- Utilizzo memoria
- Errori recenti

### 11.6 Modelli Documento

Naviga a **Modelli Documento** dalla barra laterale.

Vedi Sezione 8.9 per istruzioni dettagliate sulla gestione modelli.

---

## 12. Risoluzione Problemi

### 12.1 Problemi di Accesso

#### Non Riesco ad Accedere

**Problema**: Impossibile accedere al sistema con le proprie credenziali.

**Soluzioni**:
1. Verifica che il nome utente sia corretto (controlla errori di battitura)
2. Verifica che la password sia corretta (controlla Blocco Maiuscole)
3. Se dimenticata, usa il link "Password dimenticata"
4. Cancella cache e cookie del browser
5. Prova un browser diverso
6. Controlla se l'account è bloccato (contatta admin dopo 5 tentativi falliti)
7. Verifica che l'URL del server sia corretto

#### Codice MFA Non Funziona

**Problema**: Il codice di verifica a 6 cifre viene rifiutato.

**Soluzioni**:
1. Controlla che l'ora del tuo dispositivo sia sincronizzata:
   - Vai nelle impostazioni del dispositivo
   - Abilita data/ora automatica
   - I codici sono sensibili al tempo
2. Aspetta un nuovo codice (i codici cambiano ogni 30 secondi)
3. Assicurati di usare la voce corretta dell'app di autenticazione
4. Se usi più account DocPat, seleziona quello giusto
5. Contatta l'amministratore per resettare l'MFA

#### Sessione Scaduta

**Problema**: Vieni disconnesso inaspettatamente.

**Spiegazione**: Le sessioni scadono dopo 30 minuti di inattività per sicurezza.

**Soluzione**: Accedi nuovamente. Per prevenire:
- Rimani attivo nell'applicazione
- Salva il lavoro frequentemente
- Usa "Ricordami" su dispositivi fidati

### 12.2 Problemi di Performance

#### Pagine che si Caricano Lentamente

**Problema**: L'applicazione sembra lenta.

**Soluzioni**:
1. Controlla la velocità della tua connessione internet
2. Cancella la cache del browser:
   - Chrome: Impostazioni → Privacy → Cancella dati di navigazione
   - Firefox: Opzioni → Privacy → Cancella dati
3. Chiudi le schede del browser non necessarie
4. Disabilita temporaneamente le estensioni del browser
5. Prova un browser diverso
6. Prova la modalità incognito/privata
7. Contatta l'amministratore se il problema persiste

#### La Ricerca Non Restituisce Risultati

**Problema**: La ricerca non restituisce nulla quando ti aspetti risultati.

**Soluzioni**:
1. Controlla l'ortografia dei termini di ricerca
2. Prova ricerche con nome parziale
3. Usa meno termini di ricerca
4. Controlla i filtri attivi (potrebbero nascondere risultati)
5. Verifica che paziente/record esista
6. Prova a cancellare tutti i filtri

### 12.3 Problemi con i Dati

#### Le Modifiche Non Vengono Salvate

**Problema**: L'invio del form fallisce o le modifiche non persistono.

**Soluzioni**:
1. Controlla errori di validazione (testo rosso sotto i campi)
2. Assicurati che i campi obbligatori siano compilati (contrassegnati con *)
3. Verifica la connessione internet
4. Aggiorna la pagina e riprova
5. Controlla caratteri speciali che potrebbero causare problemi
6. Contatta l'amministratore se il problema continua

#### Dati Sembrano Mancanti

**Problema**: I record attesi non vengono mostrati.

**Soluzioni**:
1. Controlla i filtri correnti (potrebbero nascondere dati)
2. Controlla i filtri intervallo date
3. Controlla i filtri stato (Attivo/Inattivo)
4. Verifica di avere i permessi per visualizzare i dati
5. Controlla se il record è stato eliminato
6. Contatta l'amministratore per controllare i log di audit

### 12.4 Problemi Appuntamenti

#### Non Riesco a Trovare Slot Disponibili

**Problema**: Nessuno slot temporale disponibile durante la programmazione.

**Soluzioni**:
1. Controlla che la data selezionata non sia una festività
2. Controlla che la data selezionata non sia un giorno non lavorativo
3. Prova date diverse
4. Controlla la configurazione orari di lavoro (admin)
5. Gli appuntamenti esistenti potrebbero riempire tutti gli slot

#### Avviso Doppia Prenotazione

**Problema**: Avviso di conflitto quando crei un appuntamento.

**Soluzioni**:
1. Scegli uno slot temporale diverso
2. Modifica la durata dell'appuntamento
3. Se intenzionale, conferma per sovrascrivere
4. Controlla il calendario per appuntamenti esistenti

### 12.5 Problemi Documenti

#### PDF Non Viene Generato

**Problema**: La generazione del documento fallisce o va in timeout.

**Soluzioni**:
1. Aspetta un momento e riprova
2. Controlla lo stato del documento per messaggi di errore
3. Verifica che il modello sia configurato correttamente
4. Controlla che i campi obbligatori siano compilati
5. Prova un documento più piccolo
6. Contatta l'amministratore se il problema persiste

#### Email Non Viene Inviata

**Problema**: L'email del documento non viene consegnata.

**Soluzioni**:
1. Verifica che l'indirizzo email destinatario sia valido
2. Controlla lo stato della notifica per errori
3. Chiedi al destinatario di controllare la cartella spam
4. Riprova la notifica
5. Contatta l'amministratore per controllare la configurazione email

### 12.6 Problemi di Stampa

#### Formato Stampa Non Corretto

**Problema**: L'output stampato non corrisponde allo schermo.

**Soluzioni**:
1. Usa l'anteprima di stampa per controllare il formato
2. Regola le impostazioni di stampa del browser
3. Seleziona la dimensione carta corretta (A4/Letter)
4. Disabilita intestazioni/piè di pagina nelle impostazioni di stampa
5. Usa l'opzione "Adatta alla pagina"
6. Prova a scaricare il PDF e stampare dal visualizzatore PDF

### 12.7 Problemi Specifici del Browser

#### Funzionalità Non Funzionano in un Browser Specifico

**Problema**: Alcune funzionalità mancano o non funzionano.

**Soluzioni**:
1. Aggiorna il browser all'ultima versione
2. Prova un browser supportato diverso
3. Cancella la cache del browser
4. Disabilita le estensioni del browser
5. Controlla la console del browser per errori (F12 → Console)

### 12.8 Problemi Mobile/Tablet

#### Problemi di Visualizzazione su Mobile

**Problema**: Problemi di layout su schermi più piccoli.

**Soluzioni**:
1. Usa l'orientamento orizzontale per attività complesse
2. Riduci lo zoom per una migliore panoramica
3. Considera l'uso del desktop per la documentazione clinica
4. Cancella la cache del browser mobile
5. Prova un browser mobile diverso

### 12.9 Ottenere Aiuto

Se non riesci a risolvere un problema:

1. **Documenta il Problema**:
   - Cosa stavi cercando di fare
   - Cosa è successo invece
   - Eventuali messaggi di errore (screenshot se possibile)
   - Passaggi per riprodurre

2. **Contatta l'Amministratore**:
   - Fornisci le informazioni documentate
   - Includi il tuo nome utente
   - Nota la data/ora del problema

3. **Informazioni di Sistema**:
   - Nome e versione del browser
   - Sistema operativo
   - Tipo di dispositivo (desktop/mobile)

---

## 13. Appendice

### 13.1 Scorciatoie da Tastiera

DocPat supporta scorciatoie da tastiera per una navigazione efficiente:

#### Scorciatoie Globali

| Scorciatoia | Azione |
|-------------|--------|
| `Ctrl + K` (⌘K su Mac) | Apri ricerca globale |
| `Escape` | Chiudi dialogo/modale |

#### Scorciatoie Navigazione

| Scorciatoia | Azione |
|-------------|--------|
| `Alt + D` | Vai a Dashboard |
| `Alt + P` | Vai a Pazienti |
| `Alt + A` | Vai ad Appuntamenti |
| `Alt + V` | Vai a Visite |
| `Alt + R` | Vai a Report |
| `Alt + N` | Vai a Notifiche |
| `Alt + H` | Vai ad Aiuto |

#### Scorciatoie Form

| Scorciatoia | Azione |
|-------------|--------|
| `Ctrl + S` (⌘S su Mac) | Salva form corrente |
| `Tab` | Muovi al campo successivo |
| `Shift + Tab` | Muovi al campo precedente |
| `Invio` | Invia form (quando su pulsante) |

**Nota**: Su macOS, usa `Cmd` (⌘) invece di `Ctrl`.

### 13.2 Glossario dei Termini

| Termine | Definizione |
|---------|-------------|
| **Admin** | Utente amministratore con accesso completo al sistema |
| **Valutazione** | Valutazione clinica e diagnosi nella nota SOAP |
| **Log di Audit** | Registro di tutte le azioni di sistema per sicurezza |
| **BMI** | Indice di Massa Corporea, calcolato da altezza/peso |
| **Motivo Principale** | Motivo primario per cui il paziente cerca assistenza |
| **CRUD** | Operazioni di Creazione, Lettura, Aggiornamento, Eliminazione |
| **Dottore** | Ruolo utente clinico con accesso alla cura dei pazienti |
| **Bozza** | Documento/visita non salvato o non firmato |
| **Codice Fiscale** | Codice fiscale italiano |
| **HIPAA** | Health Insurance Portability and Accountability Act |
| **ICD-10** | Classificazione Internazionale delle Malattie, 10a Revisione |
| **Bloccato** | Record permanentemente immutabile |
| **MFA** | Autenticazione Multi-Fattore, richiede due metodi di verifica |
| **MRN** | Numero Cartella Clinica, identificatore unico paziente |
| **Non Presentato** | Paziente che ha mancato l'appuntamento senza preavviso |
| **Oggettivo** | Risultati clinici dall'esame nella nota SOAP |
| **Piano** | Piano di trattamento nella nota SOAP |
| **RBAC** | Controllo Accessi Basato su Ruoli |
| **Firmato** | Documento clinicamente approvato e autenticato |
| **SOAP** | Formato nota Soggettivo, Oggettivo, Valutazione, Piano |
| **Soggettivo** | Sintomi riportati dal paziente nella nota SOAP |
| **Modello** | Formato predefinito per documenti o visite |
| **TOTP** | Password Monouso Basata sul Tempo (codici MFA) |
| **Variabile** | Segnaposto nei modelli per dati dinamici |
| **Segni Vitali** | Misurazioni fisiologiche di base |

### 13.3 Riferimento Stati

#### Stati Appuntamento

| Stato | Colore | Descrizione |
|-------|--------|-------------|
| PROGRAMMATO | Blu | Prenotazione iniziale |
| CONFERMATO | Verde | Paziente ha confermato |
| IN_CORSO | Giallo | Attualmente in visita |
| COMPLETATO | Grigio | Terminato con successo |
| ANNULLATO | Rosso | Appuntamento annullato |
| NON_PRESENTATO | Arancione | Paziente non si è presentato |

#### Stati Visita

| Stato | Colore | Descrizione |
|-------|--------|-------------|
| BOZZA | Giallo | Lavoro in corso |
| FIRMATO | Verde | Clinicamente approvato |
| BLOCCATO | Grigio | Archiviato permanentemente |

#### Stati Prescrizione

| Stato | Colore | Descrizione |
|-------|--------|-------------|
| ATTIVA | Verde | Attualmente valida |
| IN_PAUSA | Giallo | Temporaneamente sospesa |
| SOSPESA | Arancione | Interrotta dal medico |
| COMPLETATA | Grigio | Corso terminato |
| ANNULLATA | Rosso | Mai iniziata |

#### Stati Notifica

| Stato | Colore | Descrizione |
|-------|--------|-------------|
| IN_ATTESA | Giallo | In attesa di consegna |
| INVIATA | Verde | Consegnata con successo |
| FALLITA | Rosso | Consegna fallita |
| ANNULLATA | Grigio | Annullata prima della consegna |

### 13.4 Riferimento Segni Vitali

| Misurazione | Intervallo Normale Adulto | Unità |
|-------------|---------------------------|-------|
| Pressione Arteriosa (Sistolica) | 90-120 | mmHg |
| Pressione Arteriosa (Diastolica) | 60-80 | mmHg |
| Frequenza Cardiaca | 60-100 | bpm |
| Frequenza Respiratoria | 12-20 | respiri/min |
| Temperatura | 36.1-37.2 | °C |
| Saturazione Ossigeno | 95-100 | % |

### 13.5 Informazioni Supporto

Per supporto tecnico:
- Contatta il tuo amministratore di sistema
- Rivedi questa documentazione
- Controlla la sezione Aiuto in-app

### 13.6 Cronologia Versioni

| Versione | Data | Modifiche |
|----------|------|-----------|
| 1.0 | Gennaio 2026 | Rilascio iniziale |

---

## Informazioni Documento

**Manuale Utente DocPat**
**Versione**: 1.0
**Ultimo Aggiornamento**: Gennaio 2026
**Lingua**: Italiano

*Questo documento è destinato agli utenti del Sistema di Gestione Studio Medico DocPat. Per la documentazione tecnica, consultare l'amministratore di sistema.*

---

*© 2026 DocPat. Tutti i diritti riservati.*
