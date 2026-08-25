# Boxer Engine — Forza Utile. Piedi Veloci. Colpi Puliti.

Piano essenziale di calisthenics, gambe, sacco e double-end bag. Niente volume ridondante da fitness da palestra normale: solo gli esercizi che costruiscono potenza e tecnica boxer.

Sito statico (HTML + CSS + JavaScript vanilla, nessun framework, nessun build tool, nessuna dipendenza esterna). Funziona aprendo direttamente `index.html` da disco **e** su GitHub Pages, senza backend, database, login o API key.

**Pubblicato su GitHub Pages:**  
https://alessioquagliara.github.io/alessioquagliara-training/

---

## Che cosa troverai

Un sito single-page con sezioni navigate dal menu sticky:

- **Home** — Boxer Engine: cos'è, tre metriche (Potenza, Piedi, Motore)
- **Piano** — settimana standard lunedì–domenica, giorni e sessioni
- **Tecnica** — le tre modalità di allenamento (RIENTRO, BASE, POTENZA)
- **Rientro** — come gestire il ritorno da infortunio (gran dentato, lombare), criteri di progressione
- **Pasti** — nutrizione semplice, target proteici/macro, esempio giorno forza
- **Regole** — progressione senza cedere, cosa evitare, regressione intelligente
- **Documentazione** — link alle 3 schede Markdown complete (Allenamento, Pasti, Piano 8 Settimane)

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
│   │   └── style.css                   # Tema dark (nero/charcoal + rosso + ambra)
│   │                                     layout responsive, animazioni leggere
│   └── js/
│       └── main.js                     # Smooth scroll nav, intersection observer
```

Nessun JS framework, nessun bundle tool, nessun npm. Solo file statici che funzionano come sono.

---

## Avvio in locale

### Opzione 1: File diretto (sconsigliato per sviluppo)
Doppio clic su `index.html` apre il sito nel browser. Alcuni browser moderni bloccano il caricamento di link ai file Markdown via JavaScript per motivi di sicurezza (`file://` protocol).

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
R: Sì. Modifica i file `.md` e le modifiche saranno visibili al reload.

**D: Funziona offline?**  
R: Una volta caricato, sì. Ma il primo caricamento e il caricamento dei file `.md` richiedono internet (se usi il server locale, no).

**D: Posso aggiungere feature (timer, tracker, data visualization)?**  
R: Sì, aggiungi codice a `main.js` o crea nuovi file `.js`. Ricorda di importarli in `index.html`.

**D: Il sito è mobile-first?**  
R: Sì. Responsive fino a 320px di larghezza. Prova su telefono.

---

Costruisci forza senza inseguire ego. Piedi veloci. Colpi puliti. 🥊
