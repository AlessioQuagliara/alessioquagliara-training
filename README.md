# Boxer Engine — Forza Utile. Piedi Veloci. Colpi Puliti.

Piano essenziale di calisthenics, gambe, sacco e double-end bag. Niente volume ridondante da fitness da palestra normale: solo gli esercizi che costruiscono potenza e tecnica boxer.

Sito statico (HTML + CSS + JavaScript vanilla, nessun framework, nessun build tool). L'unica dipendenza esterna è **Tailwind CSS + DaisyUI via CDN**, usati solo per lo stile dei componenti (tab, badge, accordion) — nessuna build, nessun npm. Funziona su GitHub Pages senza backend, database, login o API key.

**Pubblicato su GitHub Pages:**  
https://alessioquagliara.github.io/alessioquagliara-training/

---

## Che cosa troverai

Un sito single-page con sezioni navigate dal menu sticky:

- **Home** — Boxer Engine: cos'è, tre metriche (Potenza, Piedi, Motore)
- **Piano** — settimana standard lunedì–domenica, e la **scheda dettagliata interattiva** (esercizi, serie/ripetizioni/recuperi, varianti RIENTRO/BASE/POTENZA), disegnata con componenti DaisyUI e alimentata da `assets/data/scheda.json`
- **Tecnica** — le tre modalità di allenamento (RIENTRO, BASE, POTENZA)
- **Rientro** — come gestire il ritorno da infortunio (gran dentato, lombare), criteri di progressione
- **Pasti** — nutrizione semplice, target proteici/macro, esempio giorno forza
- **Regole** — progressione senza cedere, cosa evitare, regressione intelligente
- **Documentazione** — link alle 3 schede Markdown complete (Allenamento, Pasti, Piano 8 Settimane)

---

## Modificare la scheda di allenamento (JSON)

Il contenuto della "Scheda Dettagliata" nella sezione **Piano** non è scritto nell'HTML: viene letto a runtime da [`assets/data/scheda.json`](assets/data/scheda.json) e disegnato con componenti DaisyUI (tab, badge, accordion) da [`assets/js/scheda.js`](assets/js/scheda.js).

Per modificare esercizi, serie/ripetizioni, recuperi o varianti:

1. Apri `assets/data/scheda.json` in VS Code.
2. Modifica i campi che ti servono (es. `serie_ripetizioni`, `recupero`, `note`, `rientro`, `potenza` dentro `sessioni.forza.esercizi` o `sessioni.tecnica.blocchi`).
3. Salva: è JSON puro, senza commenti, quindi rispetta virgole e virgolette. Un JSON non valido fa comparire un messaggio d'errore nella pagina invece della scheda.
4. Ricarica il sito (con un server locale, vedi sotto) per vedere il risultato.

Non serve toccare `index.html` o il JavaScript per aggiornare i contenuti della scheda.

---

## I file Markdown

Tre file contengono la documentazione completa e tecnica:

1. **schede_allenamento_fighter.md** — piano settimanale completo, esercizi dettagliati con serie/ripetizioni/recuperi, varianti per RIENTRO/BASE/POTENZA, principi di progressione e regressione.

2. **schede_pasti_ricomposizione.md** — nutrizione pratica, target giornalieri (125–145 g proteine, 50–65 g grassi), 3 giornate tipo (forza, tecnica, riposo), alimenti reali (pollo, merluzzo, riso, pasta, yogurt), niente conteggi ossessivi.

3. **piano_ricomposizione_e_performance.md** — struttura di 8 settimane: RIENTRO (sett. 1–2) → BASE (sett. 3–6) → scarico (sett. 7) → verifica tecnica (sett. 8), indicatori di progresso, segnali di regressione, note di sicurezza.

I link alla documentazione sono in fondo al sito (sezione "Documentazione Completa").

---

## Struttura del progetto

```
.
├── index.html                          # Single-page site, nav sticky, sezioni ancorate
├── README.md                           # Questo file
├── schede_allenamento_fighter.md       # Dettagli allenamento (RIENTRO/BASE/POTENZA)
├── schede_pasti_ricomposizione.md      # Dettagli nutrizione
├── piano_ricomposizione_e_performance.md # Piano 8 settimane
├── assets/
│   ├── css/
│   │   └── style.css                   # Tema dark (nero/charcoal + rosso + ambra),
│   │                                     layout responsive, animazioni leggere,
│   │                                     allineamento colori dei componenti DaisyUI
│   ├── data/
│   │   └── scheda.json                 # Dati della scheda di allenamento (editabile)
│   └── js/
│       ├── main.js                     # Smooth scroll nav, intersection observer
│       └── scheda.js                   # Legge scheda.json e disegna la scheda
│                                          interattiva con componenti DaisyUI
```

Nessun JS framework, nessun bundle tool, nessun npm. Tailwind + DaisyUI arrivano da CDN (`<script>`/`<link>` in `index.html`), solo per lo stile — tutta la logica resta vanilla JS.

---

## Avvio in locale

### Opzione 1: File diretto (sconsigliato)
Doppio clic su `index.html` apre il sito, ma la Scheda Dettagliata resta vuota: i browser bloccano `fetch()` di file locali (`assets/data/scheda.json`) quando la pagina è aperta con protocollo `file://`. Usa un server locale (Opzione 2) per vedere la scheda interattiva.

### Opzione 2: Server locale (consigliato)

**Python 3:**
```bash
python3 -m http.server 8000
```
Apri: http://localhost:8000

**Node.js (http-server):**
```bash
npx http-server
```
Segui le istruzioni a video.

**Live Server (VS Code extension):**
Installa l'estensione "Live Server", poi tasto destro su `index.html` → "Open with Live Server".

---

## Pubblicare su GitHub Pages

1. Fai push del repository su GitHub (branch `main`).
2. Repo Settings → Pages.
3. Build and deployment: **Deploy from a branch**, `main`, folder `/`.
4. Salva.

Dopo pochi minuti il sito è raggiungibile all'URL GitHub Pages del tuo repo.

GitHub Pages serve solo i file statici come sono: nessuna build, nessun processing server-side.

---

## Note importanti

### Sicurezza e privacy
- **Nessun dato viene inviato a server.** Il sito non traccia, non raccoglie dati, non usa analytics.
- **I file Markdown sono pubblici** come parte del repository: il piano, le schede, la nutrizione sono consultabili da chiunque cloni il repository o visiti GitHub Pages.
- Il sito è completamente offline-capable: una volta caricato, funziona anche senza connessione internet.

### Medico-legale
- Questo non è consiglio medico. Indicazioni generali per un fighter in rientro da infortunio (gran dentato, lombare).
- Se hai dolore persistente, formicolio, debolezza o sintomi importanti, consulta un professionista.
- I criteri di progressione (RIENTRO → BASE → POTENZA) sono linee guida: adattale al tuo corpo.

---

## Licenza e uso

Modificabile e riutilizzabile. Se lo cloni, aggiorna i file `.md` con i tuoi piani e la tua nutrizione, e pubblica la tua versione su GitHub Pages.

---

## Contatti e FAQ

**D: Posso modificare le schede?**  
R: Sì. Per la scheda interattiva in home, modifica [`assets/data/scheda.json`](assets/data/scheda.json) (vedi sezione sopra). Per i piani completi, modifica i file `.md`. In entrambi i casi le modifiche sono visibili al reload.

**D: Funziona offline?**  
R: Il caricamento iniziale richiede internet per i font e per Tailwind/DaisyUI via CDN. La scheda interattiva richiede anche che la pagina sia servita da un server locale (non aperta come file), altrimenti il browser blocca la lettura di `scheda.json`.

**D: Posso aggiungere timer, tracker o dashboard?**  
R: Il sito è pensato apposta per restarne senza: niente storage, niente gamification, niente tracking. Se ti serve comunque qualcosa in JS puro, aggiungilo in `assets/js/`, ma valuta prima se non appesantisce lo scopo del sito.

**D: Il sito è mobile-first?**  
R: Sì. Responsive fino a 320px di larghezza. Prova su telefono.

---

Costruisci forza senza inseguire ego. Piedi veloci. Colpi puliti. 🥊
