/* ============================================================
   DATI STATICI DELL'APP
   Tutto incorporato in JS (nessun fetch obbligatorio) cosi il
   sito funziona anche aperto direttamente da file:// e su
   GitHub Pages, senza server e senza dipendenze esterne.
   ============================================================ */
(() => {
  'use strict';

  /* ---------------- Profilo iniziale (precompilato) ---------------- */
  const PROFILE_DEFAULT = {
    heightCm: 167.5,
    weightStartKg: 63.5,
    bfStartPct: 14.6,
    waistStartCm: 80,
    neckStartCm: 37.5,
    goalBfMinPct: 10,
    goalBfMaxPct: 12,
  };

  /* ---------------- Piano settimanale di default ---------------- */
  // rest = giorno di riposo/mobilita libera
  const WEEK_PLAN_DEFAULT = {
    lun: 'A', mar: 'rest', mer: 'B', gio: 'rest', ven: 'C', sab: 'D', dom: 'rest',
  };
  const WEEKDAY_KEYS = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'];
  const WEEKDAY_LABELS = {
    lun: 'Lunedi', mar: 'Martedi', mer: 'Mercoledi', gio: 'Giovedi',
    ven: 'Venerdi', sab: 'Sabato', dom: 'Domenica',
  };

  /* ---------------- Regole testuali fisse ---------------- */
  const RULE_POWER = 'Fermati quando cala la velocita: non allenare potenza a cedimento.';
  const RULE_FUNDAMENTALS = 'Fondamentali a 1-3 RIR; cedimento solo occasionale sugli accessori.';

  /* ---------------- Schede di allenamento A / B / C / D ---------------- */
  const DAYS = {
    A: {
      key: 'A',
      kicker: 'Giorno A',
      title: 'Forza upper + boxe tecnica',
      focus: 'forza',
      tags: ['Petto', 'Schiena', 'Spalle', 'Sacco'],
      description: 'Spinta, tirata e sacco a round. Fondamentali pesanti, accessori a rifinire, chiusura tecnica.',
      blocks: [
        {
          id: 'a-warmup', type: 'info', title: 'Riscaldamento',
          items: ['Cyclette 5 min ritmo moderato', 'Mobilita spalle e scapole (rotazioni, scapular pulls)'],
        },
        {
          id: 'a-strength', type: 'strength', title: 'Forza upper',
          exercises: [
            { id: 'a-chest-press', name: 'Chest press o floor press', sets: 3, repsMin: 6, repsMax: 10, rirTarget: 2, restSec: 90, kind: 'fondamentale' },
            { id: 'a-trazioni', name: 'Trazioni o lat machine', sets: 3, repsMin: 6, repsMax: 10, rirTarget: 2, restSec: 90, kind: 'fondamentale' },
            { id: 'a-rematore', name: 'Rematore o cable row', sets: 3, repsMin: 8, repsMax: 12, rirTarget: 2, restSec: 75, kind: 'fondamentale' },
            { id: 'a-pushdown', name: 'Pushdown tricipiti', sets: 2, repsMin: 10, repsMax: 15, rirTarget: 1, restSec: 60, kind: 'accessorio' },
            { id: 'a-facepull', name: 'Face pull', sets: 2, repsMin: 15, repsMax: 20, rirTarget: 2, restSec: 60, kind: 'accessorio' },
          ],
        },
        {
          id: 'a-sacco', type: 'rounds', title: 'Sacco', rounds: 4, roundSec: 180, restSec: 60,
          roundLabels: ['Jab e distanza', 'Diretto e uscita', 'Jab-diretto-hook', 'Tecnico libero'],
        },
      ],
    },
    B: {
      key: 'B',
      kicker: 'Giorno B',
      title: 'Tecnica + aerobico',
      focus: 'tecnica',
      tags: ['Shadow', 'Palla', 'Sacco tecnico', 'Cardio'],
      description: 'Giornata di skill e fiato: shadow, palla a doppia estremita, sacco leggero e cardio facile.',
      blocks: [
        { id: 'b-shadow', type: 'rounds', title: 'Shadow boxing', rounds: 3, roundSec: 180, restSec: 60, roundLabels: ['Guardia e passi', 'Combinazioni', 'Difesa e rientro'] },
        { id: 'b-palla', type: 'rounds', title: 'Palla a doppia estremita / reflex ball', rounds: 3, roundSec: 180, restSec: 60, roundLabels: ['Ritmo lento', 'Precisione', 'Ritmo libero'] },
        { id: 'b-sacco', type: 'rounds', title: 'Sacco tecnico (70-80%)', rounds: 3, roundSec: 180, restSec: 60, roundLabels: ['Tecnico', 'Tecnico', 'Tecnico'] },
        { id: 'b-cardio', type: 'info', title: 'Cardio facile (25-40 min)', items: ['Tapis roulant inclinato, cyclette o corsa blanda', 'Ritmo conversazionale, niente affanno'] },
        { id: 'b-mobility', type: 'info', title: 'Mobilita (10 min)', items: ['Anche', 'Caviglie', 'Torace', 'Spalle'] },
      ],
    },
    C: {
      key: 'C',
      kicker: 'Giorno C',
      title: 'Gambe + potenza + sacco',
      focus: 'forza',
      tags: ['Gambe', 'Core', 'Potenza', 'Sacco'],
      description: 'Gambe pesanti, core anti-rotazione, potenza esplosiva e sacco potenza/tecnico.',
      blocks: [
        {
          id: 'c-warmup', type: 'info', title: 'Riscaldamento',
          items: ['Cyclette 5 min', 'Mobilita anche e caviglie'],
        },
        {
          id: 'c-strength', type: 'strength', title: 'Forza gambe',
          exercises: [
            { id: 'c-squat', name: 'Goblet squat o squat', sets: 3, repsMin: 6, repsMax: 10, rirTarget: 2, restSec: 90, kind: 'fondamentale' },
            { id: 'c-rdl', name: 'Romanian deadlift', sets: 3, repsMin: 6, repsMax: 10, rirTarget: 2, restSec: 90, kind: 'fondamentale' },
            { id: 'c-bulgaro', name: 'Bulgarian split squat', sets: 3, repsMin: 8, repsMax: 12, rirTarget: 2, restSec: 75, kind: 'fondamentale', unilateral: true },
            { id: 'c-legcurl', name: 'Leg curl', sets: 3, repsMin: 10, repsMax: 15, rirTarget: 1, restSec: 60, kind: 'accessorio' },
            { id: 'c-calf', name: 'Calf raise', sets: 3, repsMin: 12, repsMax: 20, rirTarget: 1, restSec: 45, kind: 'accessorio' },
          ],
        },
        {
          id: 'c-core', type: 'strength', title: 'Core',
          exercises: [
            { id: 'c-pallof', name: 'Pallof press', sets: 2, repsMin: 10, repsMax: 12, rirTarget: 2, restSec: 45, kind: 'accessorio', unilateral: true },
            { id: 'c-plank', name: 'Plank', sets: 2, repsMin: 30, repsMax: 45, rirTarget: 1, restSec: 45, kind: 'accessorio', isTime: true },
          ],
        },
        {
          id: 'c-power', type: 'power', title: 'Potenza (qualita, non cedimento)',
          note: RULE_POWER,
          exercises: [
            { id: 'c-pushup-ex', name: 'Push-up esplosivi', sets: 4, repsMin: 4, repsMax: 6, restSec: 90 },
            { id: 'c-squatjump', name: 'Squat jump', sets: 4, repsMin: 3, repsMax: 5, restSec: 90 },
          ],
        },
        {
          id: 'c-sacco-potenza', type: 'power', title: 'Sacco potenza',
          note: 'Colpi singoli puliti, massima qualita e velocita, non volume.',
          exercises: [
            { id: 'c-sacco-potenza-ex', name: 'Colpi singoli puliti per lato', sets: 6, repsMin: 3, repsMax: 3, restSec: 60 },
          ],
        },
        { id: 'c-sacco-tecnico', type: 'rounds', title: 'Sacco tecnico', rounds: 2, roundSec: 180, restSec: 60, roundLabels: ['Tecnico', 'Tecnico'] },
      ],
    },
    D: {
      key: 'D',
      kicker: 'Giorno D',
      title: 'Skill facoltativo',
      focus: 'tecnica',
      tags: ['Palla', 'Shadow', 'Sacco', 'Facoltativo'],
      description: 'Sessione leggera di skill puro, da aggiungere solo se il recupero e buono.',
      blocks: [
        { id: 'd-palla', type: 'rounds', title: 'Palla a doppia estremita', rounds: 3, roundSec: 180, restSec: 60, roundLabels: ['Ritmo lento', 'Precisione', 'Ritmo libero'] },
        { id: 'd-shadow', type: 'rounds', title: 'Shadow', rounds: 3, roundSec: 180, restSec: 60, roundLabels: ['Guardia e passi', 'Combinazioni', 'Difesa e rientro'] },
        { id: 'd-sacco', type: 'rounds', title: 'Sacco tecnico e ritmo', rounds: 5, roundSec: 180, restSec: 60, roundLabels: ['Tecnico', 'Tecnico', 'Ritmo', 'Ritmo', 'Libero'] },
        {
          id: 'd-hard', type: 'info', title: 'Round duro (opzionale)',
          items: ['Solo se il recupero e buono (sonno, energia, nessun dolore).', 'In caso di dubbio, salta e resta tecnico.'],
        },
      ],
    },
  };

  const DAY_ORDER = ['A', 'B', 'C', 'D'];

  /* ---------------- Database alimenti (stime per 100 g) ---------------- */
  // Valori indicativi da fonti nutrizionali generiche: usali come stima,
  // non come dato di laboratorio.
  const FOODS = [
    { id: 'petto-pollo', name: 'Petto di pollo (cotto)', cat: 'proteine', kcal: 165, p: 31, c: 0, f: 3.6 },
    { id: 'tacchino-fesa', name: 'Fesa di tacchino (cotta)', cat: 'proteine', kcal: 135, p: 29, c: 0, f: 1.5 },
    { id: 'merluzzo', name: 'Merluzzo (cotto)', cat: 'proteine', kcal: 90, p: 20, c: 0, f: 1 },
    { id: 'gamberi', name: 'Gamberi (cotti)', cat: 'proteine', kcal: 99, p: 24, c: 0.2, f: 0.3 },
    { id: 'tonno-naturale', name: 'Tonno al naturale (sgocciolato)', cat: 'proteine', kcal: 116, p: 26, c: 0, f: 1 },
    { id: 'salmone', name: 'Salmone (cotto)', cat: 'proteine', kcal: 208, p: 22, c: 0, f: 13 },
    { id: 'pesce-bianco', name: 'Pesce bianco generico (cotto)', cat: 'proteine', kcal: 95, p: 20, c: 0, f: 1.2 },
    { id: 'uova-intere', name: 'Uova intere', cat: 'proteine', kcal: 155, p: 13, c: 1.1, f: 11 },
    { id: 'albume', name: "Albume d'uovo", cat: 'proteine', kcal: 52, p: 11, c: 0.7, f: 0.2 },
    { id: 'bresaola', name: 'Bresaola', cat: 'proteine', kcal: 151, p: 32, c: 0.4, f: 2 },
    { id: 'yogurt-greco', name: 'Yogurt greco 0%', cat: 'proteine', kcal: 59, p: 10, c: 3.6, f: 0.4 },
    { id: 'skyr', name: 'Skyr', cat: 'proteine', kcal: 63, p: 11, c: 4, f: 0.2 },
    { id: 'fiocchi-latte', name: 'Fiocchi di latte', cat: 'proteine', kcal: 98, p: 11, c: 3.4, f: 4.3 },
    { id: 'parmigiano', name: 'Parmigiano', cat: 'proteine', kcal: 392, p: 33, c: 0, f: 29 },
    { id: 'riso-crudo', name: 'Riso (pesato crudo)', cat: 'carboidrati', kcal: 332, p: 6.7, c: 79, f: 0.6 },
    { id: 'pasta-cruda', name: 'Pasta (pesata cruda)', cat: 'carboidrati', kcal: 353, p: 12, c: 71, f: 1.5 },
    { id: 'patate', name: 'Patate (crude)', cat: 'carboidrati', kcal: 77, p: 2, c: 17, f: 0.1 },
    { id: 'pane', name: 'Pane comune', cat: 'carboidrati', kcal: 289, p: 8, c: 56, f: 2 },
    { id: 'avena', name: 'Avena', cat: 'carboidrati', kcal: 379, p: 13, c: 61, f: 7 },
    { id: 'corn-flakes', name: 'Corn flakes', cat: 'carboidrati', kcal: 378, p: 7, c: 84, f: 0.9 },
    { id: 'miele', name: 'Miele', cat: 'carboidrati', kcal: 304, p: 0.3, c: 82, f: 0 },
    { id: 'banana', name: 'Banana', cat: 'frutta', kcal: 89, p: 1.1, c: 23, f: 0.3 },
    { id: 'frutti-bosco', name: 'Frutti di bosco', cat: 'frutta', kcal: 43, p: 0.7, c: 10, f: 0.3 },
    { id: 'mela', name: 'Mela', cat: 'frutta', kcal: 52, p: 0.3, c: 14, f: 0.2 },
    { id: 'olio-evo', name: 'Olio EVO', cat: 'grassi', kcal: 884, p: 0, c: 0, f: 100 },
    { id: 'mandorle', name: 'Mandorle', cat: 'grassi', kcal: 579, p: 21, c: 22, f: 50 },
    { id: 'zucchine', name: 'Zucchine', cat: 'verdura', kcal: 17, p: 1.2, c: 3.1, f: 0.3 },
    { id: 'broccoli', name: 'Broccoli', cat: 'verdura', kcal: 34, p: 2.8, c: 7, f: 0.4 },
    { id: 'insalata', name: 'Insalata mista', cat: 'verdura', kcal: 15, p: 1.2, c: 2.9, f: 0.2 },
    { id: 'pomodori', name: 'Pomodori', cat: 'verdura', kcal: 18, p: 0.9, c: 3.9, f: 0.2 },
    { id: 'fagiolini', name: 'Fagiolini', cat: 'verdura', kcal: 31, p: 1.8, c: 7, f: 0.1 },
    { id: 'latte-ps', name: 'Latte parzialmente scremato', cat: 'latticini', kcal: 46, p: 3.3, c: 4.8, f: 1.6 },
    { id: 'creatina', name: 'Creatina monoidrato', cat: 'integratori', kcal: 0, p: 0, c: 0, f: 0 },
  ];

  /* ---------------- Template pasti (giorno allenamento serale / riposo) ---------------- */
  const MEAL_TEMPLATES = {
    forza: [
      { name: 'Colazione', items: [{ id: 'yogurt-greco', qty: 250 }, { id: 'avena', qty: 60 }, { id: 'banana', qty: 100 }] },
      { name: 'Spuntino lavoro', items: [{ id: 'banana', qty: 100 }, { id: 'skyr', qty: 170 }] },
      { name: 'Pranzo', items: [{ id: 'riso-crudo', qty: 110 }, { id: 'petto-pollo', qty: 180 }, { id: 'zucchine', qty: 150 }, { id: 'olio-evo', qty: 10 }] },
      { name: 'Pre-workout', items: [{ id: 'banana', qty: 100 }, { id: 'yogurt-greco', qty: 180 }] },
      { name: 'Cena post-workout', items: [{ id: 'tacchino-fesa', qty: 200 }, { id: 'patate', qty: 300 }, { id: 'broccoli', qty: 150 }, { id: 'olio-evo', qty: 10 }] },
    ],
    boxe: [
      { name: 'Colazione', items: [{ id: 'yogurt-greco', qty: 250 }, { id: 'avena', qty: 60 }, { id: 'frutti-bosco', qty: 100 }] },
      { name: 'Spuntino lavoro', items: [{ id: 'bresaola', qty: 60 }, { id: 'pane', qty: 60 }] },
      { name: 'Pranzo', items: [{ id: 'pasta-cruda', qty: 110 }, { id: 'tonno-naturale', qty: 150 }, { id: 'insalata', qty: 100 }, { id: 'olio-evo', qty: 10 }] },
      { name: 'Pre-workout', items: [{ id: 'banana', qty: 100 }, { id: 'skyr', qty: 180 }] },
      { name: 'Cena post-workout', items: [{ id: 'petto-pollo', qty: 200 }, { id: 'patate', qty: 300 }, { id: 'fagiolini', qty: 150 }, { id: 'olio-evo', qty: 10 }] },
    ],
    tecnica: [
      { name: 'Colazione', items: [{ id: 'yogurt-greco', qty: 250 }, { id: 'corn-flakes', qty: 60 }, { id: 'banana', qty: 100 }] },
      { name: 'Spuntino lavoro', items: [{ id: 'skyr', qty: 170 }, { id: 'mela', qty: 150 }] },
      { name: 'Pranzo', items: [{ id: 'riso-crudo', qty: 100 }, { id: 'merluzzo', qty: 180 }, { id: 'pomodori', qty: 120 }, { id: 'olio-evo', qty: 10 }] },
      { name: 'Pre-workout', items: [{ id: 'banana', qty: 100 }, { id: 'yogurt-greco', qty: 170 }] },
      { name: 'Cena post-workout', items: [{ id: 'pesce-bianco', qty: 200 }, { id: 'pane', qty: 90 }, { id: 'insalata', qty: 120 }, { id: 'olio-evo', qty: 10 }] },
    ],
    riposo: [
      { name: 'Colazione', items: [{ id: 'yogurt-greco', qty: 250 }, { id: 'avena', qty: 60 }, { id: 'banana', qty: 100 }] },
      { name: 'Spuntino', items: [{ id: 'skyr', qty: 170 }, { id: 'mela', qty: 150 }] },
      { name: 'Pranzo', items: [{ id: 'riso-crudo', qty: 80 }, { id: 'petto-pollo', qty: 180 }, { id: 'zucchine', qty: 150 }, { id: 'olio-evo', qty: 10 }] },
      { name: 'Cena', items: [{ id: 'tacchino-fesa', qty: 200 }, { id: 'patate', qty: 200 }, { id: 'broccoli', qty: 150 }, { id: 'olio-evo', qty: 10 }] },
    ],
  };

  const NUTRITION_TARGETS_DEFAULT = {
    proteinMin: 125, proteinMax: 145,
    fatMin: 50, fatMax: 65,
    creatineG: 5,
    waterMlGoal: 2200,
    vegPortionsGoal: 2,
    fruitPortionsGoal: 2,
  };

  /* ---------------- Libreria: contenuti Markdown incorporati ---------------- */
  // Copie incorporate dei file .md della root, cosi la Libreria funziona anche
  // da file:// senza fetch. Il modulo library.js tenta comunque un fetch live
  // (utile su GitHub Pages) e usa questo testo come fallback silenzioso.
  const LIBRARY_DOCS = [
    {
      id: 'piano_ricomposizione_e_performance',
      file: 'piano_ricomposizione_e_performance.md',
      title: 'Piano ricomposizione e performance',
      content: `# Piano ricomposizione e performance

## Direzione
Costruire in 4-5 anni un fisico da fighter: forte, rapido, mobile, resistente, con vita sotto controllo e massa utile. Non inseguire 63,5 kg esatti: usa un range di peso e indicatori di prestazione.

## Dati di partenza
- Altezza: 167,5 cm
- Peso: 63,5 kg
- BF stimata: circa 14,6% (dato da usare come trend, non come valore clinico)
- Vita: 80 cm
- Collo: 37,5 cm

## Obiettivo
Arrivare gradualmente a circa 10-12% di BF con piu massa magra, senza sacrificare Thai/boxe, sacco, mobilita e recupero.

## Principi
- Usa mantenimento, crescita lenta e mini-cut: non bulk sporchi ne tagli aggressivi.
- Proteine: 125-145 g al giorno.
- Creatina: 3-5 g al giorno.
- Peso: osserva media di 7 giorni, vita ogni 2 settimane, foto ogni 4 settimane.
- Indicatori principali: vita, trazioni, press, forza delle gambe, qualita dei round, recupero e mobilita.

## Roadmap
1. 0-6 mesi: tecnica Thai/sparring, aerobico, forza di base, regolarita.
2. 6-18 mesi: ricomposizione lenta; vita in calo o stabile, carichi e capacita di lavoro in aumento.
3. 18-48 mesi: fasi di massa funzionale molto lente alternate a mini-cut da 4-8 settimane quando la vita sale troppo.
4. Ogni 8-12 settimane: rivedi dati e modifica una variabile alla volta.

## Regola decisionale
- Peso stabile + vita cala + performance sale = ricomposizione riuscita.
- Peso e vita salgono per 3-4 settimane = riduci 100-150 kcal o aumenta cardio facile.
- Peso cala, carichi/round crollano = aggiungi 100-200 kcal, soprattutto carboidrati attorno agli allenamenti.
`,
    },
    {
      id: 'schede_allenamento_fighter',
      file: 'schede_allenamento_fighter.md',
      title: 'Schede allenamento fighter',
      content: `# Schede allenamento fighter: forza + tecnica insieme

## Regola centrale
Non alternare una settimana solo pesi e una solo tecnica. Per un fighter, forza e skill vanno mantenute ogni settimana: la tecnica richiede frequenza, la forza richiede esposizione regolare.

## Cedimento o controllo
- Fondamentali: 1-3 RIR. RIR = ripetizioni che avresti ancora potuto fare con tecnica pulita.
- Accessori: puoi arrivare a 0-1 RIR nell'ultima serie, se articolazioni e tecnica restano pulite.
- Salti, push-up esplosivi, sprint e colpi potenti: mai a cedimento. Interrompi quando la velocita cala.
- Sacco: 80% tecnico/decontratto, 20% forte e mirato.

## Settimana base
### Giorno A - Forza upper + boxe tecnica
- Riscaldamento: cyclette 5 min + mobilita spalle/scapole.
- Chest press o floor press: 3x6-10, 2 RIR.
- Trazioni o lat machine: 3x6-10, 1-2 RIR.
- Rematore/cable row: 3x8-12, 1-2 RIR.
- Pushdown: 2x10-15, 1 RIR.
- Face pull: 2x15-20, 1-2 RIR.
- Sacco: 4x3 min, 1 min recupero. R1 jab e distanza; R2 diretto e uscita; R3 jab-diretto-hook; R4 tecnico libero.

### Giorno B - Thai/tecnica + aerobico
- Shadow: 3x3 min, guardia, passi, difesa e rientro.
- Palla a doppia estremita/reflex ball: 3x3 min, precisione e rilassamento.
- Sacco: 3x3 min tecnici, massimo 70-80%.
- Cardio facile: 25-40 min tapis roulant inclinato, cyclette o corsa molto blanda; ritmo conversazionale.
- Mobilita: anche, caviglie, torace, spalle, 10 min.

### Giorno C - Forza gambe + potenza + sacco
- Riscaldamento: cyclette 5 min + mobilita anche/caviglie.
- Goblet squat o squat: 3x6-10, 2 RIR.
- Romanian deadlift: 3x6-10, 2 RIR.
- Bulgarian split squat: 2-3x8-12/lato, 1-2 RIR.
- Leg curl: 2-3x10-15, 1 RIR.
- Calf raise: 3x12-20, 1 RIR.
- Core: Pallof press 2x10-12/lato + plank 2x30-45 sec.
- Potenza: push-up esplosivi 4x4-6 + squat jump 4x3-5, recupero 60-90 sec; fermati se perdi esplosivita.
- Sacco potenza: 6x3 colpi singoli puliti per lato, recupero 45-60 sec; poi 2x3 min tecnici.

### Giorno D facoltativo - Solo skill
- Palla a doppia estremita: 3x3 min.
- Shadow: 3x3 min.
- Sacco: 5x3 min, tecnica e ritmo.
- Un solo round finale duro se recuperato bene; non all-out se fai Thai/sparring il giorno successivo.

## Progressione
- Quando completi il massimo del range in tutte le serie con RIR prescritto, aumenta poco il carico o aggiungi una ripetizione per serie.
- Ogni 4-6 settimane: settimana di scarico, -30-40% serie, niente cedimenti e niente conditioning all-out.
- Se fai 2-3 lezioni Thai a settimana, riduci a 2 sedute pesi: Giorno A e Giorno C.

## Segnali per regredire
- Calo netto di prestazione per 2 sedute consecutive.
- Dolore articolare o dolore localizzato crescente.
- Sonno scarso, gambe pesanti costanti, battito a riposo insolitamente alto.
- Tecnica che si scompone al sacco: riduci volume o intensita.
`,
    },
    {
      id: 'schede_pasti_ricomposizione',
      file: 'schede_pasti_ricomposizione.md',
      title: 'Schede pasti ricomposizione',
      content: `# Schede pasti per ricomposizione e performance

## Obiettivo
Restare circa a mantenimento nelle prime 4 settimane, con proteine alte e carboidrati messi dove servono per lavoro fisico, pesi e Thai. Non inseguire una dieta perfetta: usa porzioni ripetibili e correggi dai dati.

## Target giornalieri
- Proteine: 125-145 g
- Grassi: 50-65 g
- Carboidrati: il resto delle calorie, piu alti nei giorni Thai/pesi e piu bassi nei giorni di riposo
- Verdura: almeno 2 porzioni
- Frutta: 1-2 porzioni
- Acqua: bevi regolarmente, aumentando quando sudi molto

## Schema giorno con allenamento serale
### Colazione
Scegli una:
- 250 g yogurt greco/skyr + 50-70 g avena/corn flakes + banana o frutti rossi.
- 3 uova + 80-100 g pane + frutta.

### Spuntino lavoro
- Banana + yogurt proteico/skyr.
- Oppure panino piccolo con bresaola/tacchino.

### Pranzo
Scegli una:
- 100-120 g riso pesato a crudo + 150-200 g pollo + zucchine/verdure + 10 g olio EVO.
- 100-120 g riso + 180-220 g merluzzo/gamberi + verdure + 10 g olio EVO.
- 100-120 g pasta + 150-180 g tonno al naturale/pollo + verdure.

### Pre-allenamento (60-120 minuti prima)
- Banana + 170-200 g yogurt greco/skyr.
- Oppure 60-80 g pane + 80-100 g fesa/bresaola.

### Cena post-allenamento
Scegli una:
- 180-220 g pollo/tacchino + 250-350 g patate + verdure + 10 g olio EVO.
- 180-220 g pesce bianco + 80-100 g pane o 70-90 g riso + verdure.
- 3 uova + 150-200 g albumi + pane/patate + verdure.

## Giorno senza allenamento
- Mantieni identiche le proteine.
- Togli una porzione di carboidrati: per esempio 30-40 g di riso/pasta crudi, oppure 80-100 g pane, oppure 200-250 g patate.
- Non tagliare insieme carboidrati, grassi e proteine.

## Alimentazione attorno a Thai/sacco intenso
- Prima: carboidrati digeribili e un po' di proteine; pochi grassi e poche fibre se ti appesantiscono.
- Dopo: 30-40 g proteine e una porzione di carboidrati entro le ore successive. Non serve mangiare al minuto, ma non arrivare a letto svuotato.

## Controllo e correzione dopo 4 settimane
- Se media peso stabile, vita cala e prestazione sale: continua.
- Se peso/vita salgono per 3-4 settimane: togli 100-150 kcal al giorno, preferibilmente da extra e carboidrati lontani dall'allenamento.
- Se peso cala e recupero o prestazioni scendono: aggiungi 100-200 kcal, soprattutto carboidrati vicino a pesi/Thai.

## Cosa limitare
- Olio, salse, snack e alcol non conteggiati.
- Saltare pasti e arrivare affamato alla sera.
- Tagli estremi di carboidrati nei giorni di Thai, sacco duro o gambe.
`,
    },
    {
      id: 'regolamento_fight_club',
      file: 'regolamento_fight_club.md',
      title: 'Regolamento Fight Club',
      content: `# Regolamento Fight Club

Documento semplice per incontri interni di sparring con soli pugni.

## 1. Scopo
1. Il Fight Club serve per fare sparring tecnico e controllato, non per farsi male.
2. Sono ammessi solo pugni.
3. Sono vietati calci, ginocchiate, gomitate, testate, lotta a terra, sottomissioni e prese prolungate.

## 2. Area di combattimento
1. Il ring o area di combattimento e da definire.
2. Finche non c'e un ring vero, l'area va delimitata chiaramente prima di iniziare.
3. Fuori dall'area devono restare solo arbitro e spettatori, senza interferire.

## 3. Equipaggiamento obbligatorio
1. Guantoni da sparring.
2. Paradenti obbligatorio.
3. Conchiglia consigliata fortemente.
4. Fasce consigliate.
5. Caschetto consigliato se il livello di contatto sale.

## 4. Regole del match
1. Si combatte un solo match alla volta.
2. Ogni match inizia con tocco di guanti.
3. Si colpisce con controllo, senza cercare il KO.
4. Non si colpisce chi si gira, si ferma o perde il paradenti.
5. Se uno dice "stop", il match si ferma subito.
6. L'arbitro o supervisore puo fermare il match in qualsiasi momento.

## 5. Colpi ammessi e vietati
1. Ammessi: pugni al busto e alla parte frontale/laterale della testa.
2. Vietati: colpi alla nuca, alla gola, ai genitali, alla schiena bassa e dopo lo stop.
3. Vietato spingere, trattenere o fare clinch lungo.

## 6. Intensita
1. Prima del match i due concordano l'intensita: leggera, media o sostenuta ma controllata.
2. Se uno dei due chiede di abbassare il ritmo, si abbassa subito.
3. Chi perde il controllo riceve richiamo; al secondo richiamo il match finisce.

## 7. Sicurezza
1. Chi non e lucido o e infortunato non combatte.
2. Se c'e sangue importante, stordimento o dolore anomalo, il match si chiude.
3. Nessuno rientra a combattere nella stessa giornata se ha preso un colpo che lo ha chiaramente stordito.

## 8. Durata
1. Formato consigliato: 3 round da 2 minuti con 1 minuto di pausa.
2. In alternativa: 3 round da 3 minuti se entrambi sono d'accordo.
3. Nessuno fa piu match duri consecutivi senza recupero adeguato.

## 9. Comportamento
1. Rispetto totale prima, durante e dopo il match.
2. Niente provocazioni inutili, vendette personali o caos fuori regola.
3. Chi non rispetta il regolamento puo essere escluso dalla sessione.

## 10. Quote e gestione economica
1. La quota e indicata come "x" per tutti i partecipanti nei dati ricevuti.
2. Premio in palio indicato: 266,67 EUR.
3. Puntata minima indicata: 10,00 EUR.
4. Quantita scommettitori indicata: 15.
5. Vincita a scommettitori indicata: 20,00 EUR.
6. Questa parte va gestita fuori dal match e con accordo chiaro di tutti.

## 11. Categorie peso
1. Leggero: 0-75 kg.
2. Medio: 76-85 kg.
3. Pesante: 85-120 kg.
4. Gli accoppiamenti vanno preferibilmente fatti dentro la stessa categoria.

## 12. Partecipanti
Vedi tabellone_fight_club_v2.

## 13. Dati organizzativi
| Voce | Valore |
|---|---|
| Premio in palio | 266,67 EUR |
| Puntata minima | 10,00 EUR |
| Quantita scommettitori | 15 |
| Vincita a scommettitori | 20,00 EUR |

## 14. Formula semplice approvata
1. Solo pugni.
2. Match controllati.
3. Stop immediato su chiamata.
4. Accoppiamenti per peso.
5. Supervisione sempre presente.
6. Chi esagera esce.
`,
    },
    {
      id: 'tabellone_fight_club_v2',
      file: 'tabellone_fight_club_v2.md',
      title: 'Tabellone Torneo Fight Club',
      content: `# Tabellone Torneo Fight Club (aggiornato)

Thomas e stato spostato nella categoria Leggero a 75 kg, quindi gli accoppiamenti sono stati aggiornati di conseguenza.

## Partecipanti

| Chi | Peso | Categoria |
| :--- | :---: | :---: |
| ALAIN | 69 | Leggero |
| ALESSIO Q. | 63 | Leggero |
| CHRISTIAN Q. | 72 | Leggero |
| FRATELLO SEV. | 74 | Leggero |
| GIUSEPPE VET. | 68 | Leggero |
| MARCO BAL. | 73 | Leggero |
| MATTEO SEV. | 74 | Leggero |
| TOMMASO T. | 60 | Leggero |
| THOMAS | 75 | Leggero |
| CHICCO | 79 | Medio |
| DIMAX | 78 | Medio |
| HERNAN | 80 | Medio |
| DANIELE C. | 84 | Medio |
| IL RAGA | 85 | Medio |
| MATTEO VIS. | 110 | Pesante |
| MATTIA LEO. | 100 | Pesante |

### Dettagli scommesse
- Premio in palio: 266,67 EUR
- Puntata minima: 10,00 EUR
- Quantita scommettitori: 15

### Categorie di peso
- Leggero: 0-75 kg
- Medio: 76-85 kg
- Pesante: 85-120 kg

## Categoria Leggero
Match 1: Giuseppe Vet. vs Fratello Sev. -> Semifinale 1
Match 2: Tommaso T. vs Alain -> Semifinale 1
Match 3: Marco Bal. vs Alessio Q. -> Semifinale 2
Match 4: Christian Q. vs Matteo Sev. (+ wildcard Thomas 75 kg) -> Semifinale 2
Semifinale 1 + Semifinale 2 -> Finale Leggero -> Campione Leggero

## Categoria Medio
Match 1: Chicco vs Dimax -> Finale Medio
Match 2: Hernan vs Daniele C. -> Finale Medio
Il Raga: attende o match extra -> Finale Medio
Finale Medio -> Campione Medio

## Categoria Pesante
Match 1: Matteo Vis. vs Mattia Leo. -> Campione Pesante

Il diagramma completo (mermaid) e disponibile nel file sorgente su GitHub.
`,
    },
  ];

  /* ---------------- Export globale ---------------- */
  window.APP_DATA = {
    PROFILE_DEFAULT,
    WEEK_PLAN_DEFAULT,
    WEEKDAY_KEYS,
    WEEKDAY_LABELS,
    RULE_POWER,
    RULE_FUNDAMENTALS,
    DAYS,
    DAY_ORDER,
    FOODS,
    MEAL_TEMPLATES,
    NUTRITION_TARGETS_DEFAULT,
    LIBRARY_DOCS,
  };
})();
