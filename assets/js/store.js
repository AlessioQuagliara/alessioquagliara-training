/* ============================================================
   UTILITY GENERICHE + STORE (localStorage)
   Nessuna dipendenza esterna. Tutto lo stato utente vive in
   localStorage sotto un'unica chiave versionata.
   ============================================================ */
(() => {
  'use strict';

  /* ================= Utility generiche ================= */

  const escapeHtml = (str) => String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const uid = (prefix = 'id') => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

  const round1 = (n) => Math.round(n * 10) / 10;

  const toISODate = (d) => {
    const dt = d instanceof Date ? d : new Date(d);
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const todayISO = () => toISODate(new Date());

  const WEEKDAY_KEYS = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'];

  const weekdayKeyOf = (date) => WEEKDAY_KEYS[(date instanceof Date ? date : new Date(date)).getDay()];

  const formatDateLongIt = (date) => {
    const dt = date instanceof Date ? date : new Date(date);
    const giorni = ['Domenica', 'Lunedi', 'Martedi', 'Mercoledi', 'Giovedi', 'Venerdi', 'Sabato'];
    const mesi = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
    return `${giorni[dt.getDay()]} ${dt.getDate()} ${mesi[dt.getMonth()]} ${dt.getFullYear()}`;
  };

  const formatDateShortIt = (dateStr) => {
    const dt = new Date(dateStr);
    return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}`;
  };

  // Lunedi come inizio settimana. Ritorna [isoLunedi, isoDomenica].
  const currentWeekRange = (ref = new Date()) => {
    const dt = new Date(ref);
    const day = dt.getDay(); // 0 dom .. 6 sab
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(dt);
    monday.setDate(dt.getDate() + diffToMonday);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return [toISODate(monday), toISODate(sunday)];
  };

  const movingAverage = (points, windowSize) => points.map((p, i, arr) => {
    const start = Math.max(0, i - windowSize + 1);
    const slice = arr.slice(start, i + 1);
    const avg = slice.reduce((s, v) => s + v.value, 0) / slice.length;
    return { date: p.date, value: round1(avg) };
  });

  const debounce = (fn, wait = 300) => {
    let t = null;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  };

  const downloadJSON = (filename, dataObj) => {
    const blob = new Blob([JSON.stringify(dataObj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  window.Utils = {
    escapeHtml, uid, clamp, round1, toISODate, todayISO, weekdayKeyOf,
    formatDateLongIt, formatDateShortIt, currentWeekRange, movingAverage,
    debounce, downloadJSON,
  };

  /* ================= Store (localStorage) ================= */

  // La chiave fisica resta invariata dalla v1: cambiarla wiperebbe i dati
  // di chi ha gia' usato l'app. La compatibilita' tra versioni dei dati e'
  // gestita da schemaVersion + migrate(), non dal nome della chiave.
  const STORAGE_KEY = 'rtb_state_v1';
  const D = window.APP_DATA;

  const defaultState = () => ({
    schemaVersion: D.SCHEMA_VERSION,
    version: D.SCHEMA_VERSION, // alias di compatibilita' per letture esterne
    profile: { ...D.PROFILE_DEFAULT },
    settings: {
      weekPlan: { ...D.WEEK_PLAN_DEFAULT },
      boxingToday: false,
      soundEnabled: true,
      nutritionTargets: { ...D.NUTRITION_TARGETS_DEFAULT },
      externalBoxing: { active: false, sessionsPerWeek: 0, days: [] },
      lastDeloadAt: null,
      deloadActiveWeekStart: null,
      deloadPromptSnoozedUntil: null,
    },
    workouts: [],
    recoveryChecks: [],
    nutritionDays: {},
    customFoods: [],
    favoriteMeals: [],
    progress: [],
    blockNotes: [],
  });

  let state = null;
  const listeners = new Set();

  const notify = () => listeners.forEach((fn) => {
    try { fn(state); } catch (e) { console.error('Errore in listener store:', e); }
  });

  const migrate = (parsed) => {
    // Merge superficiale con i default per tollerare versioni precedenti
    // o campi mancanti, senza rompere l'app e senza perdere gli storici
    // gia' salvati (workouts, progress, nutritionDays restano quelli
    // importati/esistenti, vengono solo validati come array/oggetti).
    const base = defaultState();
    const incomingSettings = parsed.settings || {};
    return {
      ...base,
      ...parsed,
      schemaVersion: D.SCHEMA_VERSION,
      version: D.SCHEMA_VERSION,
      profile: { ...base.profile, ...(parsed.profile || {}) },
      settings: {
        ...base.settings,
        ...incomingSettings,
        weekPlan: { ...base.settings.weekPlan, ...(incomingSettings.weekPlan || {}) },
        nutritionTargets: { ...base.settings.nutritionTargets, ...(incomingSettings.nutritionTargets || {}) },
        externalBoxing: { ...base.settings.externalBoxing, ...(incomingSettings.externalBoxing || {}) },
      },
      workouts: Array.isArray(parsed.workouts) ? parsed.workouts : [],
      recoveryChecks: Array.isArray(parsed.recoveryChecks) ? parsed.recoveryChecks : [],
      nutritionDays: parsed.nutritionDays && typeof parsed.nutritionDays === 'object' ? parsed.nutritionDays : {},
      customFoods: Array.isArray(parsed.customFoods) ? parsed.customFoods : [],
      favoriteMeals: Array.isArray(parsed.favoriteMeals) ? parsed.favoriteMeals : [],
      progress: Array.isArray(parsed.progress) ? parsed.progress : [],
      blockNotes: Array.isArray(parsed.blockNotes) ? parsed.blockNotes : [],
    };
  };

  const load = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        state = defaultState();
        return state;
      }
      state = migrate(JSON.parse(raw));
      return state;
    } catch (e) {
      console.error('Stato locale corrotto, ripristino i default:', e);
      state = defaultState();
      return state;
    }
  };

  const persist = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Impossibile salvare in localStorage:', e);
    }
  };

  const getState = () => state;

  // update(fn): fn riceve lo stato corrente e lo muta direttamente (mutazione
  // diretta va bene qui: stato semplice, no rendering concorrente).
  const update = (fn) => {
    fn(state);
    persist();
    notify();
  };

  const subscribe = (fn) => {
    listeners.add(fn);
    return () => listeners.delete(fn);
  };

  const resetAll = () => {
    localStorage.removeItem(STORAGE_KEY);
    state = defaultState();
    persist();
    notify();
  };

  const loadDemo = () => {
    const s = defaultState();
    const today = new Date();
    const isoOffset = (days) => Utils.toISODate(new Date(today.getTime() - days * 86400000));

    // Progressi demo: 5 settimane di trend di ricomposizione plausibile
    for (let i = 34; i >= 0; i -= 2) {
      const t = (34 - i) / 34;
      s.progress.push({
        date: isoOffset(i),
        weight: Utils.round1(64.2 - t * 1.1 + (Math.random() - 0.5) * 0.3),
        waist: Utils.round1(80.5 - t * 2.6 + (Math.random() - 0.5) * 0.4),
        neck: 37.5,
        bf: Utils.round1(14.8 - t * 1.6),
        sleep: 3 + Math.round(Math.random() * 2),
        energy: 3 + Math.round(Math.random() * 2),
        pain: Math.round(Math.random()),
        pullups: 6 + Math.floor(t * 3),
        pressKg: 40 + Math.floor(t * 8),
        squatKg: 50 + Math.floor(t * 10),
        rdlKg: 55 + Math.floor(t * 10),
        rounds: 8 + Math.floor(t * 4),
      });
    }

    // Check recupero demo
    for (let i = 6; i >= 0; i -= 1) {
      s.recoveryChecks.push({
        date: isoOffset(i),
        sleep: Utils.clamp(3 + Math.round(Math.random() * 2), 1, 5),
        energy: Utils.clamp(3 + Math.round(Math.random() * 2), 1, 5),
        pain: Utils.clamp(Math.round(Math.random() * 2), 1, 5),
        stress: Utils.clamp(2 + Math.round(Math.random() * 2), 1, 5),
      });
    }

    // Sessioni demo: alcuni A/B/C completati
    ['A', 'B', 'C', 'A'].forEach((key, idx) => {
      const day = D.DAYS[key];
      const exBlock = day.blocks.find((b) => b.type === 'strength');
      const exercises = {};
      if (exBlock) {
        exBlock.exercises.forEach((ex) => {
          exercises[ex.id] = {
            sets: Array.from({ length: ex.sets }, () => ({
              load: 20 + Math.round(Math.random() * 20),
              reps: ex.repsMax,
              rir: ex.rirTarget,
              done: true,
            })),
          };
        });
      }
      s.workouts.push({
        id: Utils.uid('wk'),
        date: isoOffset(9 - idx * 2),
        dayKey: key,
        exercises,
        rounds: {},
        rpe: 6 + Math.round(Math.random() * 2),
        energy: 4,
        pain: 1,
        notes: 'Sessione demo generata automaticamente.',
      });
    });

    // Nutrizione demo: oggi e ieri
    [0, 1].forEach((offset) => {
      const date = isoOffset(offset);
      const meals = D.MEAL_TEMPLATES.forza.map((m) => ({
        id: Utils.uid('meal'),
        name: m.name,
        items: m.items.map((it) => ({ foodId: it.id, qty: it.qty })),
        checked: offset === 1,
      }));
      s.nutritionDays[date] = {
        dayType: 'forza', meals, waterMl: 1800, creatineG: 5, fruitPortions: 2, vegPortions: 2,
      };
    });

    state = s;
    persist();
    notify();
  };

  const exportData = () => ({
    exportedAt: new Date().toISOString(),
    app: 'road-to-boxing',
    schemaVersion: D.SCHEMA_VERSION,
    appVersion: D.APP_VERSION,
    state,
  });

  // Ritorna true se il file importato veniva da uno schema piu' vecchio
  // (utile per avvisare l'utente che i dati sono stati aggiornati).
  const importData = (payload) => {
    if (!payload || typeof payload !== 'object') throw new Error('File non valido.');
    const incoming = payload.state && typeof payload.state === 'object' ? payload.state : payload;
    if (!incoming || typeof incoming !== 'object') throw new Error('Struttura dati non riconosciuta.');
    const incomingVersion = incoming.schemaVersion || incoming.version || 1;
    state = migrate(incoming);
    persist();
    notify();
    return incomingVersion < D.SCHEMA_VERSION;
  };

  window.Store = {
    load, getState, update, subscribe, resetAll, loadDemo, exportData, importData,
  };
})();
