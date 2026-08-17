# Road to Boxing — Cockpit del fighter

Web app personale per allenamento da fighter, ricomposizione corporea e
nutrizione. È un sito statico (HTML + CSS + JavaScript vanilla, nessun
framework, nessun build tool, nessuna dipendenza esterna obbligatoria):
funziona aprendo direttamente `index.html` da disco **e** pubblicato su
GitHub Pages, senza backend, database, login o API key.

Pubblicato su GitHub Pages:
https://alessioquagliara.github.io/alessioquagliara-training/

## Funzioni principali

L'app è una single-page app a 6 sezioni, navigabile da tab (barra in basso
su mobile, sidebar su desktop):

- **Dashboard** — allenamento del giorno, stato della settimana, ultime
  misure (peso, media 7 giorni, vita, BF), grafico trend, focus del
  giorno, check recupero rapido (sonno/energia/dolore/stress) e avvisi
  intelligenti (recupero basso, calo peso troppo rapido, ricomposizione in
  corso). Gli avvisi sono indicativi: non sono una diagnosi medica.
- **Allenamento** — schede A/B/C/D interattive (forza upper, tecnica +
  aerobico, gambe + potenza, skill facoltativo) con set spuntabili, carico
  /ripetizioni/RIR editabili, timer round configurabile con segnale sonoro
  generato via Web Audio API (nessun file audio esterno), suggerimenti di
  progressione basati sullo storico, pianificazione settimanale (assegna
  A/B/C/D/riposo a ogni giorno) e toggle "Ho boxe oggi" per ridurre il
  carico della seduta casa. Ogni sessione si salva in automatico a fine
  allenamento (RPE, energia, dolore, note) e alimenta lo storico carichi.
- **Nutrizione** — pasti giornalieri spuntabili con macro stimate da un
  database di alimenti italiani comuni (marcati come stima), generazione
  rapida della giornata da template (giorno forza/boxe/tecnica/riposo),
  aggiunta di pasti/alimenti/alimenti personalizzati, tracker acqua,
  creatina, frutta e verdura.
- **Progressi** — inserimento manuale di peso, vita, collo, BF stimata,
  sonno, energia, dolore, performance (trazioni, press, squat, RDL,
  round) e note di confronto foto. Calcola media mobile 7 giorni,
  rapporto vita/altezza, massa grassa/magra stimata e uno stato di
  ricomposizione (positivo / da rivedere / in osservazione), con grafici
  canvas leggeri. Le foto restano solo in anteprima locale nel browser e
  non vengono mai salvate né caricate da nessuna parte.
- **Libreria / Piano** — i file Markdown del repository (piano di
  ricomposizione, schede allenamento, schede pasti, regolamento e
  tabellone Fight Club) consultabili in app con rendering sicuro e
  ricerca testuale, con link diretto al sorgente su GitHub.
- **Impostazioni e backup** — profilo (altezza, peso, BF, vita, collo,
  obiettivi), target nutrizionali, preferenze (suono timer, "ho boxe
  oggi"), export/import JSON, ripristino dati demo e cancellazione totale
  dei dati locali (con doppia conferma).

## Come funzionano i dati (localStorage)

Tutto lo stato dell'utente (profilo, allenamenti, nutrizione, progressi,
impostazioni) viene salvato in `localStorage`, sotto un'unica chiave
versionata (`rtb_state_v1`), **solo nel browser che stai usando**. Non
c'è alcun invio di dati a un server: GitHub Pages serve solo i file
statici e non riceve né registra nulla di quello che scrivi nell'app.

Questo comporta un limite importante da tenere presente: **non esiste
sincronizzazione multi-dispositivo**. Se apri l'app dal telefono e dal
computer, sono due copie indipendenti dei dati. Per portare i dati da un
dispositivo/browser all'altro usa l'export/import JSON descritto sotto.

### Export / Import JSON

Dalla sezione **Impostazioni e backup**:

- **Esporta dati (JSON)** scarica un file `road-to-boxing-backup-AAAA-MM-GG.json`
  con tutto lo stato corrente.
- **Importa dati** carica un file esportato in precedenza: prima di
  sovrascrivere i dati attuali dell'app ti viene chiesta una conferma
  esplicita.
- **Ripristina demo** carica un set di dati di esempio (utile per
  esplorare l'app senza inserire dati veri).
- **Cancella tutti i dati locali** rimuove tutto da `localStorage`, con
  doppia conferma perché l'azione non è reversibile (a meno di avere un
  backup esportato).

## Struttura del progetto

```
.
├── index.html                          # Shell dell'app: nav a tab + contenitori delle 6 viste
├── assets/
│   ├── css/
│   │   └── style.css                   # Tema dark cockpit, layout responsive, tutti i componenti
│   └── js/
│       ├── data.js                     # Schede A/B/C/D, database alimenti, template pasti,
│       │                                 markdown incorporato dei file .md della root
│       ├── store.js                    # Utility generiche + store su localStorage
│       │                                 (load/update/export/import/reset/demo)
│       ├── charts.js                   # Mini grafico a linee su <canvas>, senza librerie esterne
│       ├── markdown.js                 # Renderer Markdown minimale e sicuro + ricerca testuale
│       ├── ui.js                       # Toast e dialog di conferma nativo (<dialog>)
│       ├── dashboard.js                # Vista Dashboard
│       ├── training.js                 # Vista Allenamento, timer round, session runner
│       ├── nutrition.js                # Vista Nutrizione
│       ├── progress.js                 # Vista Progressi
│       ├── library.js                  # Vista Libreria / Piano
│       ├── settings.js                 # Vista Impostazioni e backup
│       └── app.js                      # Orchestratore: navigazione a tab, wiring globale
├── piano_ricomposizione_e_performance.md
├── schede_allenamento_fighter.md
├── schede_pasti_ricomposizione.md
├── regolamento_fight_club.md
└── tabellone_fight_club_v2.md
```

I contenuti dei file `.md` sono anche incorporati in `assets/js/data.js`:
la sezione Libreria tenta comunque un `fetch` "live" dei file (utile su
GitHub Pages, dove restano la fonte di verità se li aggiorni), e ricade
in automatico e senza errori sul testo incorporato quando il `fetch` non
è disponibile — è il caso dell'apertura diretta da `file://`, dove i
browser bloccano il caricamento di file locali via `fetch`.

## Avvio in locale

Nessun requisito: apri `index.html` con doppio clic (protocollo
`file://`) e l'app funziona per intero, dati inclusi.

Se preferisci comunque un server locale (per test più simili a GitHub
Pages), dalla cartella del progetto:

```bash
python3 -m http.server 8000
```

Poi apri: http://localhost:8000

## Pubblicare su GitHub Pages

1. Fai push del repository su GitHub (branch `main`).
2. Nelle impostazioni del repository, apri **Settings → Pages**.
3. In **Build and deployment**, seleziona **Deploy from a branch**, branch
   `main`, cartella `/ (root)`.
4. Salva: dopo qualche minuto il sito è raggiungibile all'URL indicato da
   GitHub Pages (in questo repository:
   https://alessioquagliara.github.io/alessioquagliara-training/).

Non serve alcuna build: essendo HTML/CSS/JS statici, GitHub Pages serve i
file così come sono nel branch.

## Note

- Tutti i calcoli su calorie, macro, massa grassa/magra e BF sono stime,
  non dati clinici: per esigenze mediche o nutrizionali specifiche
  rivolgiti a un professionista.
- Gli avvisi della Dashboard e lo stato di ricomposizione dei Progressi
  sono suggerimenti basati sui tuoi dati, non diagnosi.
- Il regolamento e il tabellone del Fight Club restano invariati e
  consultabili sia come file `.md` nel repository sia dentro la sezione
  Libreria dell'app.
