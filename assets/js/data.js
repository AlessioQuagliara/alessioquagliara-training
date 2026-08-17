/* ============================================================
   DATI STATICI DELL'APP
   Tutto incorporato in JS (nessun fetch obbligatorio) cosi il
   sito funziona anche aperto direttamente da file:// e su
   GitHub Pages, senza server e senza dipendenze esterne.
   ============================================================ */
(() => {
  'use strict';

  /* ---------------- Versione schema dati ---------------- */
  // Usato da store.js per popolare i default e gestire l'import
  // di backup creati con versioni precedenti dell'app senza perdere dati.
  const SCHEMA_VERSION = 2;
  const APP_VERSION = '2.0.0';

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
  const RULE_QUALITY = 'Qualita prima dell\'ego: meglio una serie pulita in meno che una sporca in piu.';

  /* ---------------- Schede di allenamento A / B / C / D ----------------
     Piano "Fighter + Muscolo": upper forza+ipertrofia, tecnica/aerobico,
     gambe+richiamo upper+potenza, skill facoltativo. Gli id degli esercizi
     gia' presenti nella versione precedente restano invariati dove
     l'esercizio persiste concettualmente, cosi' lo storico caricato nei
     workout salvati resta leggibile e collegato dopo l'aggiornamento.
     equip: 'manubri' | 'bilanciere' | 'cavo-domyos' | 'corpolibero' — usato
     per calibrare il messaggio di progressione (doppia progressione). */
  const DAYS = {
    A: {
      key: 'A',
      kicker: 'Giorno A',
      title: 'Upper forza + ipertrofia + sacco',
      focus: 'forza',
      intensity: 'Forza + ipertrofia (moderata-alta)',
      durationMin: { min: 75, max: 90 },
      tags: ['Petto', 'Schiena', 'Spalle', 'Braccia', 'Sacco'],
      description: 'Upper completo per costruire petto, schiena, spalle e braccia senza sacrificare tecnica e recupero.',
      blocks: [
        {
          id: 'a-warmup', type: 'info', title: 'Riscaldamento',
          items: ['Cyclette o tapis roulant 5-7 min, ritmo moderato', 'Rotazioni spalle e mobilita scapole', '10 push-up leggeri o attivazione specifica'],
        },
        {
          id: 'a-strength', type: 'strength', title: 'Upper forza',
          exercises: [
            { id: 'a-chest-press', name: 'Chest press Domyos', sets: 4, repsMin: 6, repsMax: 10, rirTarget: 1, rirLabel: '1-2', restSec: 90, kind: 'fondamentale', equip: 'cavo-domyos', note: 'Scapole strette, petto alto, eccentrica controllata.' },
            { id: 'a-floor-press', name: 'Floor press manubri', sets: 3, repsMin: 8, repsMax: 10, rirTarget: 1, rirLabel: '1-2', restSec: 90, kind: 'fondamentale', equip: 'manubri', note: 'Pesante ma pulito, nessun cedimento tecnico.' },
            { id: 'a-trazioni', name: 'Trazioni alla sbarra oppure lat machine', sets: 4, repsMin: 6, repsMax: 10, rirTarget: 1, rirLabel: '1-2', restSec: 105, kind: 'fondamentale', equip: 'corpolibero' },
            { id: 'a-rematore', name: 'Rematore al cavo oppure rematore con bilanciere corto', sets: 3, repsMin: 8, repsMax: 12, rirTarget: 1, rirLabel: '1-2', restSec: 90, kind: 'fondamentale', equip: 'cavo-domyos' },
            { id: 'a-shoulder', name: 'Pike push-up oppure shoulder press', sets: 3, repsMin: 6, repsMax: 10, rirTarget: 1, rirLabel: '1-2', restSec: 75, kind: 'fondamentale', equip: 'corpolibero' },
            { id: 'a-lateral-raise', name: 'Alzate laterali', sets: 3, repsMin: 12, repsMax: 20, rirTarget: 1, rirLabel: '1-2', restSec: 60, kind: 'accessorio', equip: 'manubri', lastSetOptionalRir: true },
            { id: 'a-pushdown', name: 'Pushdown tricipiti', sets: 3, repsMin: 10, repsMax: 15, rirTarget: 1, rirLabel: '1', restSec: 60, kind: 'accessorio', equip: 'cavo-domyos', lastSetOptionalRir: true },
            { id: 'a-curl-hammer', name: 'Curl hammer', sets: 3, repsMin: 10, repsMax: 15, rirTarget: 1, rirLabel: '1', restSec: 60, kind: 'accessorio', equip: 'manubri', lastSetOptionalRir: true },
            { id: 'a-facepull', name: 'Face pull', sets: 2, repsMin: 15, repsMax: 20, rirTarget: 1, rirLabel: '1-2', restSec: 60, kind: 'accessorio', equip: 'cavo-domyos' },
          ],
        },
        {
          id: 'a-sacco', type: 'rounds', title: 'Sacco', rounds: 3, roundSec: 180, restSec: 60,
          roundLabels: ['Jab, distanza e rientro in guardia', 'Diretto e uscita angolata', 'Jab-diretto-hook e tecnico libero'],
          note: 'Intensita tecnica, non conditioning all-out.',
        },
      ],
    },
    B: {
      key: 'B',
      kicker: 'Giorno B',
      title: 'Tecnica + aerobico + mobilita',
      focus: 'tecnica',
      intensity: 'Tecnica (bassa-moderata)',
      durationMin: { min: 60, max: 75 },
      tags: ['Shadow', 'Palla', 'Sacco tecnico', 'Cardio', 'Mobilita'],
      description: 'Costruisci timing, precisione, motore aerobico e mobilita; non trasformarlo in una guerra.',
      blocks: [
        { id: 'b-shadow', type: 'rounds', title: 'Shadow boxing', rounds: 3, roundSec: 180, restSec: 60, roundLabels: ['Guardia e passi', 'Combinazioni e ritmo', 'Difesa e rientro'] },
        { id: 'b-palla', type: 'rounds', title: 'Palla a doppia estremita / reflex ball', rounds: 3, roundSec: 180, restSec: 60, roundLabels: ['Ritmo lento', 'Precisione', 'Ritmo libero'] },
        { id: 'b-sacco', type: 'rounds', title: 'Sacco tecnico (70-80%)', rounds: 3, roundSec: 180, restSec: 60, roundLabels: ['Tecnico 70-80%', 'Tecnico 70-80%', 'Tecnico 70-80%'] },
        {
          id: 'b-cardio', type: 'cardio', title: 'Cardio facile', minMinutes: 25, maxMinutes: 40,
          modes: ['Tapis roulant inclinato', 'Cyclette', 'Corsa blanda'],
          note: 'Ritmo conversazionale: se non riesci a parlare, rallenta.',
        },
        { id: 'b-mobility', type: 'info', title: 'Mobilita (10 min)', items: ['Anche', 'Caviglie', 'Torace', 'Spalle'] },
      ],
    },
    C: {
      key: 'C',
      kicker: 'Giorno C',
      title: 'Gambe + richiamo upper + potenza + sacco',
      focus: 'forza',
      intensity: 'Forza gambe + potenza (alta)',
      durationMin: { min: 85, max: 100 },
      tags: ['Gambe', 'Richiamo upper', 'Core', 'Potenza', 'Sacco'],
      description: 'Costruisci gambe forti e massa utile, mantieni un secondo stimolo upper, poi fai potenza quando sei ancora fresco.',
      blocks: [
        {
          id: 'c-warmup', type: 'info', title: 'Riscaldamento',
          items: ['Cyclette 5-7 min', 'Mobilita anche e caviglie', '1-2 serie leggere di squat a corpo libero'],
        },
        {
          id: 'c-strength', type: 'strength', title: 'Forza gambe',
          exercises: [
            { id: 'c-squat', name: 'Goblet squat oppure squat', sets: 4, repsMin: 6, repsMax: 10, rirTarget: 1, rirLabel: '1-2', restSec: 90, kind: 'fondamentale', equip: 'manubri' },
            { id: 'c-rdl', name: 'Romanian deadlift', sets: 3, repsMin: 6, repsMax: 10, rirTarget: 1, rirLabel: '1-2', restSec: 90, kind: 'fondamentale', equip: 'bilanciere' },
            { id: 'c-bulgaro', name: 'Bulgarian split squat', sets: 3, repsMin: 8, repsMax: 12, rirTarget: 1, rirLabel: '1-2', restSec: 90, kind: 'fondamentale', equip: 'manubri', unilateral: true },
            { id: 'c-legext', name: 'Leg extension', sets: 2, repsMin: 12, repsMax: 15, rirTarget: 1, rirLabel: '1', restSec: 60, kind: 'accessorio', equip: 'cavo-domyos', lastSetOptionalRir: true },
            { id: 'c-legcurl', name: 'Leg curl', sets: 3, repsMin: 10, repsMax: 15, rirTarget: 1, rirLabel: '1', restSec: 60, kind: 'accessorio', equip: 'cavo-domyos', lastSetOptionalRir: true },
            { id: 'c-calf', name: 'Calf raise', sets: 4, repsMin: 12, repsMax: 20, rirTarget: 1, rirLabel: '1', restSec: 60, kind: 'accessorio', equip: 'manubri', lastSetOptionalRir: true },
          ],
        },
        {
          id: 'c-richiamo-upper', type: 'strength', title: 'Richiamo upper',
          reducibleWithRecovery: true,
          exercises: [
            { id: 'c-richiamo-chest', name: 'Chest press leggera oppure push-up declinati', sets: 2, repsMin: 10, repsMax: 15, rirTarget: 2, rirLabel: '2', restSec: 75, kind: 'accessorio', equip: 'cavo-domyos' },
            { id: 'c-richiamo-lat', name: 'Lat machine oppure trazioni', sets: 2, repsMin: 8, repsMax: 12, rirTarget: 2, rirLabel: '2', restSec: 75, kind: 'accessorio', equip: 'corpolibero' },
            { id: 'c-richiamo-alzate', name: 'Alzate laterali oppure alzate posteriori', sets: 2, repsMin: 12, repsMax: 20, rirTarget: 1, rirLabel: '1', restSec: 60, kind: 'accessorio', equip: 'manubri' },
          ],
        },
        {
          id: 'c-core', type: 'strength', title: 'Core',
          exercises: [
            { id: 'c-pallof', name: 'Pallof press', sets: 2, repsMin: 10, repsMax: 12, rirTarget: 2, restSec: 45, kind: 'accessorio', unilateral: true, equip: 'cavo-domyos' },
            { id: 'c-plank', name: 'Plank', sets: 2, repsMin: 30, repsMax: 45, rirTarget: 1, restSec: 45, kind: 'accessorio', isTime: true },
          ],
        },
        {
          id: 'c-power', type: 'power', title: 'Potenza (qualita, non cedimento)',
          note: RULE_POWER,
          exercises: [
            { id: 'c-pushup-ex', name: 'Push-up esplosivi', sets: 3, repsMin: 4, repsMax: 6, restSec: 90 },
            { id: 'c-squatjump', name: 'Squat jump', sets: 3, repsMin: 3, repsMax: 5, restSec: 90 },
          ],
        },
        {
          id: 'c-sacco-potenza', type: 'power', title: 'Sacco potenza',
          halvableWithRecovery: true,
          note: 'Qualita, allineamento del polso, trasferimento del peso e ritorno pulito in guardia: non volume.',
          exercises: [
            { id: 'c-sacco-potenza-ex', name: 'Colpi singoli puliti per lato', sets: 4, repsMin: 3, repsMax: 3, restSec: 60 },
          ],
        },
        { id: 'c-sacco-tecnico', type: 'rounds', title: 'Sacco tecnico', rounds: 2, roundSec: 180, restSec: 60, roundLabels: ['Tecnico', 'Tecnico'] },
      ],
    },
    D: {
      key: 'D',
      kicker: 'Giorno D',
      title: 'Skill puro facoltativo',
      focus: 'tecnica',
      intensity: 'Skill (bassa, facoltativa)',
      durationMin: { min: 45, max: 60 },
      tags: ['Palla', 'Shadow', 'Sacco', 'Facoltativo'],
      description: 'Skill leggero/moderato. Usalo solo quando recupero, sonno e articolazioni sono buoni.',
      blocks: [
        { id: 'd-palla', type: 'rounds', title: 'Palla a doppia estremita', rounds: 3, roundSec: 180, restSec: 60, roundLabels: ['Ritmo lento', 'Precisione', 'Ritmo libero'] },
        { id: 'd-shadow', type: 'rounds', title: 'Shadow', rounds: 3, roundSec: 180, restSec: 60, roundLabels: ['Guardia e passi', 'Combinazioni', 'Difesa e rientro'] },
        { id: 'd-sacco', type: 'rounds', title: 'Sacco tecnico e ritmo', rounds: 5, roundSec: 180, restSec: 60, roundLabels: ['Tecnico', 'Tecnico', 'Ritmo', 'Ritmo', 'Libero'] },
        {
          id: 'd-hard', type: 'hardround', title: 'Round duro (opzionale)',
          conditions: { sleepMin: 4, energyMin: 4, painMax: 1 },
          roundSec: 180, restSec: 60,
          note: 'Un round extra a ritmo alto, solo se il corpo e davvero pronto.',
        },
      ],
    },
  };

  const DAY_ORDER = ['A', 'B', 'C', 'D'];

  /* ---------------- Collo (card opzionale, non conteggiata nel volume) ---------------- */
  const NECK_ROUTINE = {
    id: 'neck-routine',
    title: 'Collo (opzionale)',
    fixedNote: 'Movimento lento, niente pesi all\'inizio; fermati ai primi fastidi strani. Non serve il collo da wrestler: costruisci una base.',
    exercises: [
      { id: 'neck-flexion', name: 'Neck flexion supino', sets: 2, repsMin: 15, repsMax: 20, restSec: 45 },
      { id: 'neck-extension', name: 'Neck extension prono', sets: 2, repsMin: 15, repsMax: 20, restSec: 45 },
      { id: 'neck-side', name: 'Side neck', sets: 2, repsMin: 15, repsMax: 20, restSec: 45, unilateral: true },
    ],
  };

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

  /* ---------------- Tipi di giornata nutrizionale ---------------- */
  // Indicatore visivo non prescrittivo: aiuta a capire dove servono piu
  // carboidrati, senza imporre un numero fisso.
  const NUTRITION_DAY_TYPES = [
    { key: 'riposo', label: 'Riposo', carbLevel: 'Carboidrati moderati' },
    { key: 'tecnica', label: 'Tecnica/sacco', carbLevel: 'Carboidrati moderati' },
    { key: 'forza', label: 'Upper forza', carbLevel: 'Carboidrati medio-alti' },
    { key: 'gambe', label: 'Gambe + potenza', carbLevel: 'Carboidrati alti' },
    { key: 'boxe', label: 'Boxe esterna', carbLevel: 'Carboidrati medio-alti, priorita pre/post' },
  ];

  /* ---------------- Template pasti per tipo di giornata ---------------- */
  const MEAL_TEMPLATES = {
    forza: [
      { name: 'Colazione', items: [{ id: 'yogurt-greco', qty: 250 }, { id: 'avena', qty: 60 }, { id: 'banana', qty: 100 }] },
      { name: 'Spuntino lavoro', items: [{ id: 'banana', qty: 100 }, { id: 'skyr', qty: 170 }] },
      { name: 'Pranzo', items: [{ id: 'riso-crudo', qty: 110 }, { id: 'petto-pollo', qty: 180 }, { id: 'zucchine', qty: 150 }, { id: 'olio-evo', qty: 10 }] },
      { name: 'Pre-workout', items: [{ id: 'banana', qty: 100 }, { id: 'yogurt-greco', qty: 180 }] },
      { name: 'Cena post-workout', items: [{ id: 'tacchino-fesa', qty: 200 }, { id: 'patate', qty: 300 }, { id: 'broccoli', qty: 150 }, { id: 'olio-evo', qty: 10 }] },
    ],
    gambe: [
      { name: 'Colazione', items: [{ id: 'yogurt-greco', qty: 250 }, { id: 'avena', qty: 70 }, { id: 'banana', qty: 120 }] },
      { name: 'Spuntino lavoro', items: [{ id: 'banana', qty: 120 }, { id: 'skyr', qty: 170 }] },
      { name: 'Pranzo', items: [{ id: 'riso-crudo', qty: 130 }, { id: 'petto-pollo', qty: 180 }, { id: 'zucchine', qty: 150 }, { id: 'olio-evo', qty: 10 }] },
      { name: 'Pre-workout', items: [{ id: 'banana', qty: 120 }, { id: 'yogurt-greco', qty: 180 }] },
      { name: 'Cena post-workout', items: [{ id: 'tacchino-fesa', qty: 200 }, { id: 'patate', qty: 350 }, { id: 'broccoli', qty: 150 }, { id: 'olio-evo', qty: 10 }] },
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
Costruire in 4-5 anni un fisico da fighter: forte, rapido, mobile, resistente, con vita sotto controllo e massa muscolare utile. "Fighter + Muscolo" significa densita e forza funzionale per boxe/sacco, non volume da bodybuilding fine a se stesso. Non inseguire 63,5 kg esatti: usa un range di peso e indicatori di prestazione.

## Dati di partenza
- Altezza: 167,5 cm
- Peso: 63,5 kg
- BF stimata: circa 14,6% (dato da usare come trend, non come valore clinico)
- Vita: 80 cm
- Collo: 37,5 cm

## Obiettivo
Arrivare gradualmente a circa 10-12% di BF con piu massa magra, senza sacrificare tecnica/boxe, sacco, mobilita e recupero.

## Principi
- Usa mantenimento, crescita lenta e mini-cut: non bulk sporchi ne tagli aggressivi.
- Proteine: 125-145 g al giorno.
- Creatina: 3-5 g al giorno.
- Peso: osserva media di 7 giorni, vita ogni 2 settimane, foto ogni 4 settimane.
- Indicatori principali: vita, trazioni, press, forza delle gambe, qualita dei round, recupero e mobilita.

## Roadmap
1. 0-6 mesi: tecnica/sparring, aerobico, forza di base, regolarita.
2. 6-18 mesi: ricomposizione lenta; vita in calo o stabile, carichi e capacita di lavoro in aumento.
3. 18-48 mesi: fasi di massa funzionale molto lente alternate a mini-cut da 4-8 settimane quando la vita sale troppo.
4. Ogni 8-12 settimane: rivedi dati e modifica una variabile alla volta.
5. Ogni 4-6 settimane di carico continuo: valuta una settimana di scarico (l'app la propone da sola quando serve).

## Regola decisionale
- Peso stabile + vita cala + performance sale = ricomposizione riuscita.
- Peso e vita salgono per 3-4 settimane = riduci 100-150 kcal o aumenta cardio facile.
- Peso cala, carichi/round crollano = aggiungi 100-200 kcal, soprattutto carboidrati attorno agli allenamenti.
`,
    },
    {
      id: 'schede_allenamento_fighter',
      file: 'schede_allenamento_fighter.md',
      title: 'Schede allenamento fighter + muscolo',
      content: `# Schede allenamento "Fighter + Muscolo"

## Regola centrale
Costruire nel lungo periodo un fisico muscoloso, denso, forte, rapido e funzionale per boxe/sacco. Niente volume ridondante da vecchia split push/pull/gambe: ogni sessione tiene insieme forza, ipertrofia e tecnica senza rubare recupero al lavoro fisico.

## Cedimento o controllo
- Fondamentali: 1-3 RIR. RIR = ripetizioni che avresti ancora potuto fare con tecnica pulita.
- Accessori: ultima serie opzionalmente 0-1 RIR, solo se forma e articolazioni restano pulite.
- Salti, push-up esplosivi, sprint e colpi potenti: mai a cedimento. Fermati quando cala la velocita.
- Sacco: 80% tecnico/decontratto, 20% forte e mirato.
- Qualita prima dell'ego: meglio una serie pulita in meno che una sporca in piu.

## Settimana base

### Giorno A - Upper forza + ipertrofia + sacco (75-90 min)
Riscaldamento: cyclette/tapis 5-7 min, rotazioni spalle, 10 push-up leggeri.
- Chest press Domyos: 4x6-10, RIR 1-2, rec 90s.
- Floor press manubri: 3x8-10, RIR 1-2, rec 90s.
- Trazioni o lat machine: 4x6-10, RIR 1-2, rec 90-120s.
- Rematore al cavo o bilanciere corto: 3x8-12, RIR 1-2, rec 75-90s.
- Pike push-up o shoulder press: 3x6-10, RIR 1-2, rec 75s.
- Alzate laterali: 3x12-20, RIR 1-2 (ultima serie 0-1 RIR ok), rec 60s.
- Pushdown tricipiti: 3x10-15, RIR 1 (ultima 0-1 RIR ok), rec 60s.
- Curl hammer: 3x10-15, RIR 1 (ultima 0-1 RIR ok), rec 60s.
- Face pull: 2x15-20, RIR 1-2, rec 60s.
- Sacco: 3x3 min, rec 1 min. R1 jab/distanza/rientro; R2 diretto e uscita angolata; R3 jab-diretto-hook e tecnico libero.

### Giorno B - Tecnica + aerobico + mobilita (60-75 min)
- Shadow boxing: 3x3 min, rec 1 min (guardia/passi, combinazioni, difesa/rientro).
- Palla a doppia estremita/reflex ball: 3x3 min, rec 1 min.
- Sacco tecnico: 3x3 min, rec 1 min, intensita 70-80%.
- Cardio facile: 25-40 min, tapis inclinato/cyclette/corsa blanda, ritmo conversazionale.
- Mobilita: 10 min, anche/caviglie/torace/spalle.

### Giorno C - Gambe + richiamo upper + potenza + sacco (85-100 min)
Riscaldamento: cyclette 5-7 min, mobilita anche/caviglie, 1-2 serie leggere di squat a corpo libero.

Forza gambe:
- Goblet squat o squat: 4x6-10, RIR 1-2, rec 90s.
- Romanian deadlift: 3x6-10, RIR 1-2, rec 90s.
- Bulgarian split squat: 3x8-12/lato, RIR 1-2, rec 90s.
- Leg extension: 2x12-15, RIR 1 (ultima 0-1 ok), rec 60s.
- Leg curl: 3x10-15, RIR 1 (ultima 0-1 ok), rec 60s.
- Calf raise: 4x12-20, RIR 1 (ultima 0-1 ok), rec 45-60s.

Richiamo upper (si riduce da solo se il recupero e medio/basso):
- Chest press leggera o push-up declinati: 2x10-15, RIR 2, rec 60-75s.
- Lat machine o trazioni: 2x8-12, RIR 2, rec 60-75s.
- Alzate laterali o posteriori: 2x12-20, RIR 1, rec 60s.

Core: Pallof press 2x10-12/lato + plank 2x30-45 sec.

Potenza (mai a cedimento, fermati se cala la velocita):
- Push-up esplosivi: 3x4-6, rec 90s.
- Squat jump: 3x3-5, rec 90s.

Sacco potenza: 4x3 colpi singoli puliti per lato, rec 60s (qualita, allineamento polso, trasferimento peso, ritorno in guardia). Poi sacco tecnico 2x3 min.

Nota: se il recupero segnato in dashboard e medio o basso, l'app toglie il richiamo upper e dimezza il sacco potenza in automatico.

### Giorno D facoltativo - Skill puro (45-60 min)
- Palla a doppia estremita: 3x3 min, rec 1 min.
- Shadow: 3x3 min, rec 1 min.
- Sacco: 4-5x3 min, rec 1 min, tecnica e ritmo.
- Round duro opzionale solo se sonno >= 4/5, energia >= 4/5, dolore/fastidi <= 1/5 e non hai boxe/sparring il giorno dopo.

### Collo (opzionale, dopo A o C)
- Neck flexion supino: 2x15-20.
- Neck extension prono: 2x15-20.
- Side neck: 2x15-20 per lato.
Movimento lento, niente pesi all'inizio, fermati ai primi fastidi strani. Non e conteggiata nel volume totale della seduta.

## Doppia progressione
- Se tutte le serie chiudono al limite alto del range con RIR uguale o superiore al target e tecnica segnata "buona": manubri/bilanciere +1-2 kg, cavi/Domyos il piu piccolo incremento disponibile, corpo libero +1 ripetizione o piccola zavorra.
- Se il range e chiuso basso o il RIR e piu basso del target: ripeti lo stesso carico la prossima volta.
- Se un esercizio peggiora per 2 sedute consecutive: mantieni o riduci 5-10% e verifica sonno, calorie e recupero.
- Tutti i suggerimenti sono proposte, non prescrizioni.

## Settimana di scarico
Ogni 4-6 settimane di carico continuo, l'app propone una settimana di scarico non vincolante: -30/40% delle serie, RIR 3-4, niente round all-out. Puoi accettarla, rimandarla o ignorarla; il piano base non viene mai cancellato.

## Boxe esterna
Se fai 2 o piu lezioni di boxe a settimana, l'app suggerisce A e C come unici giorni pesi, riduce o disattiva D e propone per B di sostituire con boxe o recupero. Se hai boxe il giorno dopo il Giorno C, riduci i finisher di sacco e potenza. Sono sempre consigli, mai vincoli.

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
Restare circa a mantenimento, con proteine alte e carboidrati messi dove servono per lavoro fisico e tecnica. Non inseguire una dieta perfetta: usa porzioni ripetibili e correggi dai dati.

## Target giornalieri
- Proteine: 125-145 g
- Grassi: 50-65 g
- Carboidrati: il resto delle calorie, variabili per tipo di giornata
- Verdura: almeno 2 porzioni
- Frutta: 1-2 porzioni
- Acqua: bevi regolarmente, aumentando quando sudi molto

## Le 5 giornate tipo
1. Riposo: carboidrati moderati.
2. Tecnica/sacco: carboidrati moderati.
3. Upper forza: carboidrati medio-alti.
4. Gambe + potenza: carboidrati alti.
5. Boxe esterna: carboidrati medio-alti, con priorita pre e post sessione.

Sono indicatori, non regole rigide: l'app genera un template di partenza per ciascuna e resta modificabile pasto per pasto.

### Colazione (tutte le giornate)
Scegli una:
- 250 g yogurt greco/skyr + 50-70 g avena/corn flakes + banana o frutti rossi.
- 3 uova + 80-100 g pane + frutta.

### Spuntino lavoro
- Banana + yogurt proteico/skyr.
- Oppure panino piccolo con bresaola/tacchino.

### Pranzo
Scegli una in base al tipo di giornata (piu riso nei giorni gambe, piu contenuto nei giorni di riposo):
- 80-130 g riso pesato a crudo + 150-200 g pollo + zucchine/verdure + 10 g olio EVO.
- 100-120 g riso + 180-220 g merluzzo/gamberi + verdure + 10 g olio EVO.
- 100-120 g pasta + 150-180 g tonno al naturale/pollo + verdure.

### Pre-allenamento (60-120 minuti prima)
- Banana + 170-200 g yogurt greco/skyr.
- Oppure 60-80 g pane + 80-100 g fesa/bresaola.

### Cena post-allenamento
Scegli una, piu abbondante nei giorni gambe/potenza:
- 180-220 g pollo/tacchino + 250-350 g patate + verdure + 10 g olio EVO.
- 180-220 g pesce bianco + 80-100 g pane o 70-90 g riso + verdure.
- 3 uova + 150-200 g albumi + pane/patate + verdure.

## Giorno di riposo
- Mantieni identiche le proteine.
- Togli una porzione di carboidrati: per esempio 30-40 g di riso/pasta crudi, oppure 80-100 g pane, oppure 200-250 g patate.
- Non tagliare insieme carboidrati, grassi e proteine.

## Piano settimanale e lista della spesa
L'app permette di salvare pasti preferiti, duplicare un giorno sugli altri e generare una lista della spesa aggregata per 7 giorni, raggruppata per categoria (proteine, carboidrati, verdure/frutta, latticini, grassi/condimenti, extra). Le quantita sono sempre stime.

## Controllo e correzione dopo 4 settimane
- Se media peso stabile, vita cala e prestazione sale: continua.
- Se peso/vita salgono per 3-4 settimane: togli 100-150 kcal al giorno, preferibilmente da extra e carboidrati lontani dall'allenamento.
- Se peso cala e recupero o prestazioni scendono: aggiungi 100-200 kcal, soprattutto carboidrati vicino agli allenamenti.

## Cosa limitare
- Olio, salse, snack e alcol non conteggiati.
- Saltare pasti e arrivare affamato alla sera.
- Tagli estremi di carboidrati nei giorni gambe, boxe o sacco duro.
- Se le proteine di giornata scendono sotto i 100 g, aggiungi subito una fonte proteica in uno dei pasti.
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

Thomas è stato spostato nella categoria Leggero a 75 kg, quindi gli accoppiamenti sono stati aggiornati di conseguenza.

## Partecipanti

| Chi | Stile | Entrata | Soprannome | Peso | Quota | Categoria |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| ALAIN | | | | 69 | x | Leggero |
| ALESSIO Q. | | | | 63 | x | Leggero |
| CHRISTIAN Q. | | | | 72 | x | Leggero |
| FRATELLO SEV. | | | | 74 | x | Leggero |
| GIUSEPPE VET. | | | | 68 | x | Leggero |
| MARCO BAL. | | | | 73 | x | Leggero |
| MATTEO SEV. | | | | 74 | x | Leggero |
| TOMMASO T. | | | | 60 | x | Leggero |
| THOMAS | | | | 75 | x | Leggero |
| CHICCO | | | | 79 | x | Medio |
| DIMAX | | | | 78 | x | Medio |
| HERNAN | | | | 80 | x | Medio |
| DANIELE C. | | | | 84 | x | Medio |
| IL RAGA | | | | 85 | x | Medio |
| MATTEO VIS. | | | | 110 | x | Pesante |
| MATTIA LEO. | | | | 100 | x | Pesante |

### Dettagli Scommesse
* **Premio in palio:** 266,67 €
* **Puntata minima:** 10,00 €
* **Quantità scommettitori:** 15

### Categorie di Peso
* **Leggero:** 0-75 kg
* **Medio:** 76-85 kg
* **Pesante:** 85-120 kg

## Categoria Leggero

\`\`\`mermaid
flowchart LR
    subgraph Torneo_Leggero
        LQ1A["GIUSEPPE VET."] --> LQ1["Match 1"]
        LQ1B["FRATELLO SEV."] --> LQ1
        LQ1 --> LS1["Semifinale 1"]

        LQ2A["TOMMASO T."] --> LQ2["Match 2"]
        LQ2B["ALAIN"] --> LQ2
        LQ2 --> LS1

        LQ3A["MARCO BAL."] --> LQ3["Match 3"]
        LQ3B["ALESSIO Q."] --> LQ3
        LQ3 --> LS2["Semifinale 2"]

        LQ4A["CHRISTIAN Q."] --> LQ4["Match 4"]
        LQ4B["MATTEO SEV."] --> LQ4
        LQ4 --> LS2

        LWB["THOMAS (wildcard 75 kg)"] --> LQ4

        LS1 --> LF["Finale Leggero"]
        LS2 --> LF
        LF --> LC["Campione Leggero"]
    end
\`\`\`

## Categoria Medio

\`\`\`mermaid
flowchart LR
    subgraph Torneo_Medio
        MQ1A["CHICCO"] --> MQ1["Match 1"]
        MQ1B["DIMAX"] --> MQ1
        MQ1 --> MS1["Finale Medio"]
        MQ2A["HERNAN"] --> MQ2["Match 2"]
        MQ2B["DANIELE C."] --> MQ2
        MQ2 --> MS1
        MQ3["IL RAGA (attende o match extra)"] --> MS1
        MS1 --> MC["Campione Medio"]
    end
\`\`\`

## Categoria Pesante

\`\`\`mermaid
flowchart LR
    subgraph Torneo_Pesante
        PQ1A["MATTEO VIS."] --> PQ1["Match 1"]
        PQ1B["MATTIA LEO."] --> PQ1
        PQ1 --> PF["Campione Pesante"]
    end
\`\`\`
`,
    },
  ];

  /* ---------------- Export globale ---------------- */
  window.APP_DATA = {
    SCHEMA_VERSION,
    APP_VERSION,
    PROFILE_DEFAULT,
    WEEK_PLAN_DEFAULT,
    WEEKDAY_KEYS,
    WEEKDAY_LABELS,
    RULE_POWER,
    RULE_FUNDAMENTALS,
    RULE_QUALITY,
    DAYS,
    DAY_ORDER,
    NECK_ROUTINE,
    FOODS,
    NUTRITION_DAY_TYPES,
    MEAL_TEMPLATES,
    NUTRITION_TARGETS_DEFAULT,
    LIBRARY_DOCS,
  };
})();
