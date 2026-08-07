# alessioquagliara-training

Scheda di allenamento **Road to Boxing — Forza, Footwork e Conditioning**: sito
statico (HTML + CSS + JavaScript vanilla, nessun framework né build tool) con
divisione A / B / C, timer recupero integrato e pulsanti di recupero rapido
dentro ogni esercizio.

Pubblicato su GitHub Pages:
https://alessioquagliara.github.io/alessioquagliara-training/

## Struttura del progetto

```
.
├── index.html                     # Solo markup strutturale; carica CSS e JS
├── assets/
│   ├── css/
│   │   └── style.css              # Tutto lo stile (tema chiaro/scuro, layout, responsive)
│   ├── js/
│   │   └── app.js                 # Tema, timer, fetch del JSON e generazione del markup
│   └── data/
│       └── training-plan.json     # Contenuti della scheda: giorni, blocchi, esercizi, note
├── regolamento_fight_club.md
└── tabellone_fight_club_v2.md
```

- **`index.html`** contiene solo la struttura (topbar, timer, contenitori vuoti).
- **`assets/css/style.css`** raccoglie tutto il CSS prima inline.
- **`assets/js/app.js`** gestisce tema, timer e interazioni, carica i dati via
  `fetch("assets/data/training-plan.json")` e genera l'HTML di giorni, blocchi,
  esercizi e note.
- **`assets/data/training-plan.json`** contiene i testi e i dati strutturati
  (titoli, descrizioni, serie/ripetizioni, recuperi, note). Nelle note è
  supportato il grassetto con la sintassi `**testo**`.

Tutti i percorsi sono **relativi alla root del repository**, così il sito
funziona sia in locale sia sotto il prefisso `/alessioquagliara-training/` di
GitHub Pages.

## Avvio in locale

Il JavaScript carica i contenuti tramite `fetch`, quindi aprire `index.html`
con doppio clic (protocollo `file://`) **non funziona**: serve un server locale.

Dalla cartella del progetto:

```bash
python3 -m http.server 8000
```

Poi apri: http://localhost:8000

In alternativa, con Node installato:

```bash
npx serve .
```

Se il JSON non viene caricato, la pagina mostra un messaggio di errore e il
dettaglio è visibile nella console del browser.
