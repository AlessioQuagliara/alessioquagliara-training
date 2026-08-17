/* ============================================================
   MODULO ALLENAMENTO
   Schede A/B/C/D "Fighter + Muscolo", pianificazione settimanale,
   session runner a schermo intero con timer round (Web Audio,
   no file esterni), doppia progressione, deload automatico
   suggerito, riduzione Giorno C su recupero medio/basso, collo
   opzionale, cardio loggabile e boxe esterna.
   ============================================================ */
(() => {
  'use strict';

  const U = window.Utils;
  const D = window.APP_DATA;
  const { escapeHtml } = U;

  const DELOAD_THRESHOLD_WEEKS = 5; // meta del range 4-6 settimane richiesto

  let selectedDayKey = null;
  let includeNeck = false;
  let sessionState = null; // sessione attiva o null
  let audioCtx = null;

  /* ---------------- Audio ---------------- */
  const ensureAudioCtx = () => {
    if (!audioCtx) {
      try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { audioCtx = null; }
    }
    return audioCtx;
  };

  const playTone = (freq, dur = 0.18, delay = 0) => {
    const state = window.Store.getState();
    if (state.settings.soundEnabled === false) return;
    const ctx = ensureAudioCtx();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.value = 0.07;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const t0 = ctx.currentTime + delay;
      osc.start(t0);
      osc.stop(t0 + dur);
    } catch (e) { /* silenzioso: audio non disponibile */ }
  };

  const playBeep = (kind) => {
    if (kind === 'work') playTone(880, 0.2);
    else if (kind === 'rest') playTone(523, 0.2);
    else if (kind === 'done') { playTone(880, 0.15, 0); playTone(880, 0.15, 0.22); playTone(1046, 0.28, 0.44); }
  };

  /* ---------------- Timer round ---------------- */
  const createRoundTimer = (cfg) => {
    let s = {
      phase: 'idle', round: 1, remaining: cfg.roundSec, running: false, done: false, completed: [],
    };
    let intervalId = null;
    const listeners = [];
    const emit = () => listeners.forEach((fn) => fn(s));

    const finish = () => {
      if (intervalId) clearInterval(intervalId);
      intervalId = null;
      s.running = false; s.phase = 'done'; s.done = true;
      playBeep('done');
      emit();
    };

    const tick = () => {
      s.remaining -= 1;
      if (s.remaining <= 0) {
        if (s.phase === 'work') {
          s.completed[s.round - 1] = true;
          if (s.round >= cfg.rounds) { finish(); return; }
          s.phase = 'rest'; s.remaining = cfg.restSec; playBeep('rest');
        } else {
          s.round += 1; s.phase = 'work'; s.remaining = cfg.roundSec; playBeep('work');
        }
      }
      emit();
    };

    const start = () => {
      if (s.done) return;
      if (s.phase === 'idle') { s.phase = 'work'; s.remaining = cfg.roundSec; playBeep('work'); }
      s.running = true;
      intervalId = setInterval(tick, 1000);
      emit();
    };
    const pause = () => { if (intervalId) { clearInterval(intervalId); intervalId = null; } s.running = false; emit(); };
    const resume = () => { if (s.done) return; s.running = true; intervalId = setInterval(tick, 1000); emit(); };
    const skip = () => {
      if (s.done) return;
      if (s.phase === 'idle') { start(); return; }
      if (s.phase === 'work') {
        s.completed[s.round - 1] = true;
        if (s.round >= cfg.rounds) { finish(); return; }
        s.phase = 'rest'; s.remaining = cfg.restSec;
      } else {
        s.round += 1; s.phase = 'work'; s.remaining = cfg.roundSec;
      }
      emit();
    };
    const reset = () => {
      if (intervalId) clearInterval(intervalId);
      intervalId = null;
      s = {
        phase: 'idle', round: 1, remaining: cfg.roundSec, running: false, done: false, completed: [],
      };
      emit();
    };
    const updateConfig = (patch) => {
      Object.assign(cfg, patch);
      if (s.phase === 'idle') s.remaining = cfg.roundSec;
      emit();
    };
    const destroy = () => { if (intervalId) clearInterval(intervalId); listeners.length = 0; };
    const onUpdate = (fn) => listeners.push(fn);

    return {
      start, pause, resume, skip, reset, destroy, onUpdate, updateConfig, getState: () => s, cfg,
    };
  };

  /* ---------------- Cronometro semplice (per il cardio loggato) ---------------- */
  const createStopwatch = () => {
    let seconds = 0;
    let running = false;
    let intervalId = null;
    const listeners = [];
    const emit = () => listeners.forEach((fn) => fn({ seconds, running }));
    const start = () => { if (running) return; running = true; intervalId = setInterval(() => { seconds += 1; emit(); }, 1000); emit(); };
    const pause = () => { if (intervalId) clearInterval(intervalId); intervalId = null; running = false; emit(); };
    const reset = () => { pause(); seconds = 0; emit(); };
    const destroy = () => { if (intervalId) clearInterval(intervalId); listeners.length = 0; };
    const onUpdate = (fn) => listeners.push(fn);
    return { start, pause, reset, destroy, onUpdate, getSeconds: () => seconds };
  };

  const fmtTime = (secs) => {
    const s = Math.max(0, secs);
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const r = Math.floor(s % 60).toString().padStart(2, '0');
    return `${m}:${r}`;
  };

  /* ---------------- Dati derivati: storico ed esercizi ---------------- */

  const getExerciseRecords = (exId) => {
    const state = window.Store.getState();
    return state.workouts
      .filter((w) => w.exercises && w.exercises[exId])
      .map((w) => {
        const data = w.exercises[exId];
        const sets = data.sets || [];
        const maxLoad = sets.reduce((m, s) => Math.max(m, Number(s.load) || 0), 0);
        const maxReps = sets.reduce((m, s) => Math.max(m, Number(s.reps) || 0), 0);
        return {
          date: w.date, dayKey: w.dayKey, sets, maxLoad, maxReps, technique: data.technique || null, energy: w.energy, pain: w.pain,
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  };

  const allExerciseHistory = (exId) => getExerciseRecords(exId).map((r) => ({ date: r.date, load: r.maxLoad, reps: r.maxReps }));

  const getLastExerciseRecord = (exId, dayKey) => {
    const recs = getExerciseRecords(exId).filter((r) => r.dayKey === dayKey);
    if (!recs.length) return null;
    return recs[recs.length - 1];
  };

  const EQUIP_PROGRESSION_MSG = {
    manubri: 'aggiungi 1-2 kg complessivi quando possibile',
    bilanciere: 'aggiungi 1-2 kg complessivi quando possibile',
    'cavo-domyos': 'sali il più piccolo incremento disponibile',
    corpolibero: 'aggiungi 1 ripetizione per serie o una piccola zavorra',
  };

  // Doppia progressione: propone (non prescrive) in base a range/RIR/tecnica,
  // e segnala un calo su 2 sedute consecutive indipendentemente dall'ultimo esito.
  const progressionHint = (ex, dayKey) => {
    if (!ex.equip) return null;

    const hist = allExerciseHistory(ex.id);
    if (hist.length >= 3) {
      const last3 = hist.slice(-3);
      if (last3[2].load > 0 && last3[2].load < last3[1].load && last3[1].load < last3[0].load) {
        return { text: 'Cala da 2 sedute: mantieni o riduci 5-10% e verifica sonno, calorie e recupero.', tone: 'warn' };
      }
    }

    const rec = getLastExerciseRecord(ex.id, dayKey);
    if (!rec) return null;
    const lowRecovery = (rec.energy != null && rec.energy <= 2) || (rec.pain != null && rec.pain >= 4);
    const techniquePoor = rec.technique === 'rivedere';
    if (lowRecovery || techniquePoor) return null;
    if (!rec.sets.length) return null;

    const allHitTarget = rec.sets.every((s) => s.done && Number(s.reps) >= ex.repsMax && Number(s.rir) >= Number(ex.rirTarget));
    if (allHitTarget) {
      return { text: `Prossima volta: ${EQUIP_PROGRESSION_MSG[ex.equip] || 'aumenta leggermente il carico'}.`, tone: 'up' };
    }
    return { text: 'Range basso o RIR sotto target: ripeti lo stesso carico la prossima volta.', tone: 'repeat' };
  };

  /* ---------------- Recupero, deload, riduzione Giorno C ---------------- */

  const getRecoveryLevel = (state) => {
    const today = U.todayISO();
    const check = state.recoveryChecks.find((c) => c.date === today)
      || [...state.recoveryChecks].sort((a, b) => b.date.localeCompare(a.date))[0];
    if (!check) return null;
    const avgSE = (check.sleep + check.energy) / 2;
    if (avgSE <= 2.5 || check.pain >= 4 || check.stress >= 4) return 'basso';
    if (avgSE <= 3.5 || check.pain >= 3 || check.stress >= 3) return 'medio';
    return 'alto';
  };

  const weekStartOf = (dateStr) => U.currentWeekRange(new Date(dateStr))[0];

  const getTrainedWeekStarts = (state) => {
    const set = new Set(state.workouts.map((w) => weekStartOf(w.date)));
    return [...set].sort();
  };

  const isDeloadActive = (state) => {
    const ws = state.settings.deloadActiveWeekStart;
    if (!ws) return false;
    const days = (Date.now() - new Date(ws).getTime()) / 86400000;
    return days >= 0 && days < 7;
  };

  const shouldShowDeloadPrompt = (state) => {
    if (isDeloadActive(state)) return false;
    const snooze = state.settings.deloadPromptSnoozedUntil;
    if (snooze && U.todayISO() < snooze) return false;
    const weeks = getTrainedWeekStarts(state);
    const since = state.settings.lastDeloadAt ? weekStartOf(state.settings.lastDeloadAt) : null;
    const relevant = since ? weeks.filter((w) => w > since) : weeks;
    return relevant.length >= DELOAD_THRESHOLD_WEEKS;
  };

  // Trasformazione "display-time": non tocca mai i dati base di D.DAYS.
  const applyDeloadToBlocks = (blocks) => blocks.map((b) => {
    if (b.type !== 'strength' && b.type !== 'power') return b;
    return {
      ...b,
      deloadApplied: true,
      exercises: b.exercises.map((ex) => ({ ...ex, sets: Math.max(1, Math.round(ex.sets * 0.65)), rirTarget: Math.max(ex.rirTarget || 0, 3) })),
    };
  });

  const applyRecoveryReduction = (dayKey, blocks, level) => {
    if (dayKey !== 'C' || !level || level === 'alto') return { blocks, reduced: false };
    const filtered = blocks
      .filter((b) => !b.reducibleWithRecovery)
      .map((b) => (b.halvableWithRecovery
        ? { ...b, exercises: b.exercises.map((ex) => ({ ...ex, sets: Math.max(1, Math.round(ex.sets / 2)) })) }
        : b));
    return { blocks: filtered, reduced: true };
  };

  // Combina deload + riduzione recupero per una vista coerente sia nel
  // dettaglio scheda sia nella sessione live.
  const getEffectiveDay = (dayKey, state) => {
    const base = D.DAYS[dayKey];
    const level = getRecoveryLevel(state);
    const deloadActive = isDeloadActive(state);
    let blocks = base.blocks;
    const { blocks: reducedBlocks, reduced } = applyRecoveryReduction(dayKey, blocks, level);
    blocks = reducedBlocks;
    if (deloadActive) blocks = applyDeloadToBlocks(blocks);
    return {
      day: { ...base, blocks }, deloadActive, recoveryReduced: reduced, recoveryLevel: level,
    };
  };

  const computeRirRangeLabel = (blocks) => {
    const byKind = { fondamentale: new Set(), accessorio: new Set() };
    blocks.forEach((b) => {
      if (!b.exercises) return;
      b.exercises.forEach((ex) => {
        if (ex.rirLabel && byKind[ex.kind]) byKind[ex.kind].add(ex.rirLabel);
      });
    });
    const parts = [];
    if (byKind.fondamentale.size) parts.push(`Fondamentali ${[...byKind.fondamentale].sort().join('/')}`);
    if (byKind.accessorio.size) parts.push(`Accessori ${[...byKind.accessorio].sort().join('/')}`);
    return parts.length ? parts.join(' · ') : '—';
  };

  /* ---------------- Boxe esterna: avvisi non vincolanti ---------------- */

  const externalBoxingAdvice = (state) => {
    const eb = state.settings.externalBoxing;
    if (!eb || !eb.active || !eb.sessionsPerWeek) return null;
    if (eb.sessionsPerWeek >= 2) {
      return 'Con 2+ lezioni di boxe questa settimana, valuta A e C come unici giorni pesi, riduci o disattiva D. Per B: sostituisci con boxe oppure recupero.';
    }
    return 'Boxe esterna attiva questa settimana: tieni d\'occhio il recupero attorno alle lezioni.';
  };

  const boxingTomorrowAfterC = (state) => {
    const eb = state.settings.externalBoxing;
    if (!eb || !eb.active || !eb.days || !eb.days.length) return false;
    const cDay = Object.entries(state.settings.weekPlan).find(([, v]) => v === 'C');
    if (!cDay) return false;
    const idx = D.WEEKDAY_KEYS.indexOf(cDay[0]);
    const tomorrow = D.WEEKDAY_KEYS[(idx + 1) % 7];
    return eb.days.includes(tomorrow);
  };

  /* ================= Vista Allenamento (tab) ================= */

  const dayButtons = () => D.DAY_ORDER.map((key) => {
    const d = D.DAYS[key];
    return `<button class="day-select-btn" type="button" data-day="${key}" data-active="${key === selectedDayKey}">${d.kicker}<br><span style="font-weight:600;font-size:var(--text-xs);color:var(--color-text-muted)">${escapeHtml(d.title)}</span></button>`;
  }).join('');

  const renderTopInfoBar = (day) => {
    const rir = computeRirRangeLabel(day.blocks);
    return `
      <div class="day-top-info">
        <span class="top-info-chip"><strong>Intensità</strong>${escapeHtml(day.intensity || '—')}</span>
        <span class="top-info-chip"><strong>RIR target</strong>${escapeHtml(rir)}</span>
        <span class="top-info-chip"><strong>Regola</strong>${escapeHtml(D.RULE_QUALITY)}</span>
        <span class="top-info-chip"><strong>Durata stimata</strong>${day.durationMin ? `${day.durationMin.min}-${day.durationMin.max} min` : '—'}</span>
      </div>`;
  };

  const renderDeloadBanner = () => `
    <div class="alert alert-info deload-banner" id="deloadBanner">
      <span class="alert-icon">🛠️</span>
      <div>
        <strong>Settimana di scarico consigliata</strong>
        Riduci le serie del 30-40%, mantieni tecnica e lascia 3-4 RIR. Niente round all-out.
        <div class="chip-group" style="margin-top:.6rem">
          <button class="btn btn-sm btn-primary" type="button" id="deloadAccept">Accetta</button>
          <button class="btn btn-sm" type="button" id="deloadSnooze">Rimanda 7 giorni</button>
          <button class="btn btn-sm btn-ghost" type="button" id="deloadDismiss">Ignora</button>
        </div>
      </div>
    </div>`;

  const renderBlockReadOnly = (block, dayKey) => {
    if (block.type === 'info') {
      return `
        <div class="block">
          <div class="block-head"><h4>${escapeHtml(block.title)}</h4></div>
          <ul style="display:grid;gap:.35rem">${block.items.map((it) => `<li style="font-size:var(--text-sm);color:var(--color-text-muted)">— ${escapeHtml(it)}</li>`).join('')}</ul>
        </div>`;
    }
    if (block.type === 'cardio') {
      return `
        <div class="block">
          <div class="block-head"><h4>${escapeHtml(block.title)}</h4><span class="tag">${block.minMinutes}-${block.maxMinutes} min</span></div>
          <p style="font-size:var(--text-sm);color:var(--color-text-muted)">${escapeHtml(block.note)}</p>
          <div class="chip-group">${block.modes.map((m) => `<span class="tag">${escapeHtml(m)}</span>`).join('')}</div>
        </div>`;
    }
    if (block.type === 'hardround') {
      return `
        <div class="block">
          <div class="block-head"><h4>${escapeHtml(block.title)}</h4></div>
          <p style="font-size:var(--text-sm);color:var(--color-text-muted)">${escapeHtml(block.note)}</p>
          <p class="block-note">Attivo solo con sonno ≥ ${block.conditions.sleepMin}/5, energia ≥ ${block.conditions.energyMin}/5, dolore ≤ ${block.conditions.painMax}/5 e nessuna boxe il giorno dopo.</p>
        </div>`;
    }
    if (block.type === 'rounds') {
      return `
        <div class="block">
          <div class="block-head"><h4>${escapeHtml(block.title)}</h4><span class="tag">${block.rounds} × ${Math.round(block.roundSec / 60)} min</span></div>
          <div class="rounds-summary"><span class="info">Recupero ${block.restSec}s tra i round. ${block.roundLabels ? escapeHtml(block.roundLabels.join(' · ')) : ''}</span></div>
          ${block.note ? `<div class="block-note">${escapeHtml(block.note)}</div>` : ''}
        </div>`;
    }
    // strength / power
    const hasFundamental = block.exercises.some((e) => e.kind === 'fondamentale');
    return `
      <div class="block">
        <div class="block-head"><h4>${escapeHtml(block.title)}</h4>${block.deloadApplied ? '<span class="tag tag-d">Scarico</span>' : ''}</div>
        ${block.note ? `<div class="block-note">⚡ ${escapeHtml(block.note)}</div>` : ''}
        ${hasFundamental ? `<div class="block-note">🎯 ${escapeHtml(D.RULE_FUNDAMENTALS)}</div>` : ''}
        <div style="display:grid;gap:.5rem">
          ${block.exercises.map((ex) => {
            const hint = progressionHint(ex, dayKey);
            const metaParts = [`${ex.sets}×${ex.repsMin}-${ex.repsMax}${ex.unilateral ? '/lato' : ''}${ex.isTime ? ' sec' : ''}`];
            if (ex.rirLabel) metaParts.push(`RIR ${ex.rirLabel}`);
            metaParts.push(`rec ${ex.restSec}s`);
            return `
              <div class="exercise-row">
                <div class="exercise-row-head"><span class="name">${escapeHtml(ex.name)}</span><span class="meta">${metaParts.join(' · ')}</span></div>
                ${ex.lastSetOptionalRir ? '<span style="font-size:var(--text-xs);color:var(--color-text-faint)">Ultima serie: 0-1 RIR ok</span>' : ''}
                ${hint ? `<span class="exercise-progress-hint hint-${hint.tone}">${hint.tone === 'up' ? '📈' : hint.tone === 'warn' ? '⚠️' : '↔️'} ${escapeHtml(hint.text)}</span>` : ''}
              </div>`;
          }).join('')}
        </div>
      </div>`;
  };

  const renderNeckCard = () => `
    <section class="panel card neck-card" style="margin-top:var(--space-4)">
      <div class="card-title">Collo (opzionale, non conta nel volume)</div>
      <p style="font-size:var(--text-sm);color:var(--color-text-muted)">${escapeHtml(D.NECK_ROUTINE.fixedNote)}</p>
      <ul style="display:grid;gap:.3rem;margin:.5rem 0">
        ${D.NECK_ROUTINE.exercises.map((ex) => `<li style="font-size:var(--text-sm)">— ${escapeHtml(ex.name)}: ${ex.sets}×${ex.repsMin}-${ex.repsMax}${ex.unilateral ? '/lato' : ''}</li>`).join('')}
      </ul>
      <label class="switch"><input type="checkbox" id="includeNeckToggle" ${includeNeck ? 'checked' : ''} /><span>Aggiungi al workout di oggi</span></label>
    </section>`;

  const renderWeekPlanner = (state) => {
    const advice = externalBoxingAdvice(state);
    return `
    <section class="panel card" style="margin-top:var(--space-4)">
      <div class="card-title">Settimana — assegna A / B / C / D ai giorni</div>
      <div class="week-planner">
        ${D.WEEKDAY_KEYS.filter((k) => k !== 'dom').concat('dom').map((wd) => `
          <div class="week-planner-day">
            <span class="wd-label">${D.WEEKDAY_LABELS[wd].slice(0, 3)}</span>
            <select data-weekday="${wd}" aria-label="Scheda per ${D.WEEKDAY_LABELS[wd]}">
              <option value="rest" ${state.settings.weekPlan[wd] === 'rest' ? 'selected' : ''}>Riposo</option>
              ${D.DAY_ORDER.map((k) => `<option value="${k}" ${state.settings.weekPlan[wd] === k ? 'selected' : ''}>${k}</option>`).join('')}
            </select>
          </div>`).join('')}
      </div>
      ${advice ? `
        <div class="alert alert-info" style="margin-top:var(--space-3)">
          <span class="alert-icon">🥊</span>
          <div>${escapeHtml(advice)}
            ${state.settings.externalBoxing.sessionsPerWeek >= 2 ? '<div style="margin-top:.5rem"><button class="btn btn-sm" type="button" id="applyBoxingAdviceBtn">Applica: A/C pesi, B recupero, D riposo</button></div>' : ''}
          </div>
        </div>` : ''}
    </section>`;
  };

  const renderHistorySection = () => {
    const allEx = [];
    D.DAY_ORDER.forEach((k) => {
      D.DAYS[k].blocks.forEach((b) => { if (b.exercises) b.exercises.forEach((ex) => allEx.push({ id: ex.id, name: `${ex.name} (${k})` })); });
    });
    return `
      <section class="panel card" style="margin-top:var(--space-4)">
        <div class="card-title">Storico carichi</div>
        <div class="field" style="max-width:360px">
          <label for="historyExSelect">Esercizio</label>
          <select id="historyExSelect">${allEx.map((e) => `<option value="${e.id}">${escapeHtml(e.name)}</option>`).join('')}</select>
        </div>
        <canvas id="historyChart" style="margin-top:var(--space-3)"></canvas>
        <div class="history-table-wrap" style="margin-top:var(--space-3)">
          <table class="history-table" id="historyTable"><thead><tr><th>Data</th><th>Carico max (kg)</th><th>Ripetizioni max</th></tr></thead><tbody></tbody></table>
        </div>
      </section>`;
  };

  const wireHistorySection = (container) => {
    const select = container.querySelector('#historyExSelect');
    const chartCanvas = container.querySelector('#historyChart');
    const tbody = container.querySelector('#historyTable tbody');
    const draw = () => {
      const hist = allExerciseHistory(select.value);
      window.Charts.drawLineChart(chartCanvas, [{ label: 'Carico', color: '#c8502f', points: hist.map((h) => ({ date: h.date, value: h.load })) }], { heightCss: 150 });
      tbody.innerHTML = hist.length
        ? [...hist].reverse().map((h) => `<tr><td>${U.formatDateShortIt(h.date)}</td><td>${h.load || '-'}</td><td>${h.reps || '-'}</td></tr>`).join('')
        : '<tr><td colspan="3" style="color:var(--color-text-faint)">Nessuno storico ancora per questo esercizio.</td></tr>';
    };
    select.addEventListener('change', draw);
    draw();
  };

  const render = (container) => {
    const state = window.Store.getState();
    if (!selectedDayKey) {
      const wd = U.weekdayKeyOf(new Date());
      const planned = state.settings.weekPlan[wd];
      selectedDayKey = (planned && planned !== 'rest') ? planned : 'A';
    }
    const { day, deloadActive, recoveryReduced, recoveryLevel } = getEffectiveDay(selectedDayKey, state);
    const showNeckToggle = selectedDayKey === 'A' || selectedDayKey === 'C';
    if (!showNeckToggle) includeNeck = false;
    const showDeloadPrompt = shouldShowDeloadPrompt(state);
    const showsBoxingNote = selectedDayKey === 'C' && boxingTomorrowAfterC(state);

    container.innerHTML = `
      <div class="view-header"><h2>Allenamento</h2><p>Schede A/B/C/D interattive: spunta le serie, gestisci i round e traccia i carichi.</p></div>

      ${showDeloadPrompt ? renderDeloadBanner() : ''}
      ${deloadActive ? '<div class="alert alert-info"><span class="alert-icon">🛠️</span><div><strong>Settimana di scarico attiva.</strong> Serie ridotte, RIR 3-4, niente round all-out. Torna al piano pieno dalla prossima settimana.</div></div>' : ''}

      <div class="day-select-row" role="group" aria-label="Seleziona scheda">${dayButtons()}</div>

      <section class="panel">
        <div class="day-detail-head">
          <div>
            <span class="tag tag-${day.key.toLowerCase()}">${escapeHtml(day.kicker)}</span>
            <h3>${escapeHtml(day.title)}</h3>
            <p>${escapeHtml(day.description)}</p>
            ${recoveryReduced ? `<span class="tag tag-d">Versione ridotta — recupero ${escapeHtml(recoveryLevel)}: richiamo upper rimosso, sacco potenza dimezzato</span>` : ''}
            ${showsBoxingNote ? '<div class="block-note" style="margin-top:.4rem">🥊 Boxe domani: riduci i finisher di sacco e potenza.</div>' : ''}
          </div>
          <button class="btn btn-primary" type="button" id="startSessionBtn">Inizia allenamento</button>
        </div>
        ${renderTopInfoBar(day)}
        <div class="block-list">${day.blocks.map((b) => renderBlockReadOnly(b, day.key)).join('')}</div>
      </section>

      ${showNeckToggle ? renderNeckCard() : ''}
      ${renderWeekPlanner(state)}
      ${renderHistorySection()}
    `;

    container.querySelectorAll('.day-select-btn').forEach((btn) => {
      btn.addEventListener('click', () => { selectedDayKey = btn.dataset.day; render(container); });
    });
    container.querySelector('#startSessionBtn').addEventListener('click', () => startSession(selectedDayKey));

    const neckToggle = container.querySelector('#includeNeckToggle');
    if (neckToggle) neckToggle.addEventListener('change', (e) => { includeNeck = e.target.checked; });

    container.querySelectorAll('[data-weekday]').forEach((sel) => {
      sel.addEventListener('change', () => {
        window.Store.update((s) => { s.settings.weekPlan[sel.dataset.weekday] = sel.value; });
        window.UI.toast('Settimana aggiornata.', 'success');
        render(container);
      });
    });

    const applyBoxingBtn = container.querySelector('#applyBoxingAdviceBtn');
    if (applyBoxingBtn) {
      applyBoxingBtn.addEventListener('click', () => {
        window.Store.update((s) => {
          Object.keys(s.settings.weekPlan).forEach((wd) => {
            if (s.settings.weekPlan[wd] === 'B' || s.settings.weekPlan[wd] === 'D') s.settings.weekPlan[wd] = 'rest';
          });
        });
        window.UI.toast('Settimana aggiornata secondo il consiglio boxe.', 'success');
        render(container);
      });
    }

    const deloadBanner = container.querySelector('#deloadBanner');
    if (deloadBanner) {
      deloadBanner.querySelector('#deloadAccept').addEventListener('click', () => {
        window.Store.update((s) => {
          s.settings.deloadActiveWeekStart = weekStartOf(U.todayISO());
          s.settings.lastDeloadAt = U.todayISO();
        });
        window.UI.toast('Settimana di scarico attivata.', 'success');
        render(container);
      });
      deloadBanner.querySelector('#deloadSnooze').addEventListener('click', () => {
        window.Store.update((s) => { s.settings.deloadPromptSnoozedUntil = U.toISODate(new Date(Date.now() + 7 * 86400000)); });
        render(container);
      });
      deloadBanner.querySelector('#deloadDismiss').addEventListener('click', () => {
        window.Store.update((s) => { s.settings.deloadPromptSnoozedUntil = U.toISODate(new Date(Date.now() + 3 * 86400000)); });
        render(container);
      });
    }

    wireHistorySection(container);
  };

  /* ================= Session runner (overlay fullscreen) ================= */

  const overlayEl = () => document.getElementById('sessionOverlay');

  const buildInitialExerciseData = (ex, dayKey) => {
    const rec = getLastExerciseRecord(ex.id, dayKey);
    const lastSets = rec ? rec.sets || [] : [];
    return {
      sets: Array.from({ length: ex.sets }, (_, i) => {
        const prev = lastSets[i];
        return {
          load: prev ? prev.load : '',
          reps: '',
          rir: ex.rirTarget != null ? ex.rirTarget : '',
          done: false,
        };
      }),
      note: '',
      technique: null,
      speedDropped: false,
    };
  };

  const techniqueToggleHtml = (exId, current) => `
    <div class="technique-toggle" data-technique-for="${exId}">
      <span style="font-size:var(--text-xs);color:var(--color-text-faint)">Tecnica</span>
      <button type="button" class="btn btn-sm" data-technique-val="buona" data-active="${current === 'buona'}">Buona</button>
      <button type="button" class="btn btn-sm" data-technique-val="rivedere" data-active="${current === 'rivedere'}">Da rivedere</button>
    </div>`;

  const renderSessionStrengthBlock = (block, dayKey) => {
    const hasFundamental = block.exercises.some((e) => e.kind === 'fondamentale');
    return `
      <div class="panel block" data-block-id="${block.id}">
        <div class="block-head"><h4>${escapeHtml(block.title)}</h4>${block.deloadApplied ? '<span class="tag tag-d">Scarico</span>' : ''}</div>
        ${block.note ? `<div class="block-note">⚡ ${escapeHtml(block.note)}</div>` : ''}
        ${hasFundamental ? `<div class="block-note">🎯 ${escapeHtml(D.RULE_FUNDAMENTALS)}</div>` : ''}
        ${block.exercises.map((ex) => {
          const hint = progressionHint(ex, dayKey);
          const noLoad = ex.isTime || block.type === 'power';
          const unit = ex.isTime ? 'sec' : 'rip';
          const isPower = block.type === 'power';
          return `
          <div class="exercise-row" data-ex-id="${ex.id}">
            <div class="exercise-row-head">
              <span class="name">${escapeHtml(ex.name)}</span>
              <span class="meta">${ex.sets}×${ex.repsMin}-${ex.repsMax}${ex.unilateral ? '/lato' : ''}${ex.rirLabel ? ` · RIR ${ex.rirLabel}` : ''} · rec ${ex.restSec}s</span>
            </div>
            ${ex.lastSetOptionalRir ? '<span style="font-size:var(--text-xs);color:var(--color-text-faint)">Ultima serie: 0-1 RIR ok</span>' : ''}
            ${hint ? `<span class="exercise-progress-hint hint-${hint.tone}">${hint.tone === 'up' ? '📈' : hint.tone === 'warn' ? '⚠️' : '↔️'} ${escapeHtml(hint.text)}</span>` : ''}
            <div class="set-table">
              <div class="set-table-labels"><span></span><span>${noLoad ? '' : 'kg'}</span><span>${unit}</span><span>RIR</span><span>fatto</span></div>
              ${Array.from({ length: ex.sets }).map((_, i) => `
                <div class="set-row" data-set-idx="${i}">
                  <span class="set-idx">${i + 1}</span>
                  ${noLoad ? '<span></span>' : `<input type="number" inputmode="decimal" min="0" step="0.5" data-field="load" aria-label="Carico serie ${i + 1}" />`}
                  <input type="number" inputmode="numeric" min="0" data-field="reps" aria-label="${ex.isTime ? 'Secondi' : 'Ripetizioni'} serie ${i + 1}" />
                  ${ex.rirTarget != null ? `<input type="number" inputmode="numeric" min="0" max="10" data-field="rir" aria-label="RIR serie ${i + 1}" value="${ex.rirTarget}" />` : '<span></span>'}
                  <input type="checkbox" data-field="done" aria-label="Serie ${i + 1} completata" />
                </div>`).join('')}
            </div>
            ${isPower ? `
              <label class="switch" data-speed-for="${ex.id}">
                <input type="checkbox" data-field="speedDropped" />
                <span style="font-size:var(--text-xs)">Velocità calata</span>
              </label>
              <span class="speed-hint" data-speed-hint-for="${ex.id}" hidden style="font-size:var(--text-xs);color:var(--color-amber)">Fermati qui: non serve altro volume oggi.</span>
            ` : techniqueToggleHtml(ex.id, null)}
            <input type="text" class="exercise-note-input" data-field="note" placeholder="Note tecnica, sensazioni…" aria-label="Note per ${escapeHtml(ex.name)}" />
          </div>`;
        }).join('')}
      </div>`;
  };

  const renderSessionRoundsBlock = (block) => `
    <div class="panel block" data-block-id="${block.id}" data-block-type="rounds">
      <div class="block-head"><h4>${escapeHtml(block.title)}</h4><span class="tag">${block.rounds} round</span></div>
      ${block.note ? `<p style="font-size:var(--text-sm);color:var(--color-text-muted)">${escapeHtml(block.note)}</p>` : ''}
      <div class="chip-group">
        <label class="field" style="flex-direction:row;align-items:center;gap:.4rem">
          <span style="font-size:var(--text-xs)">Round (sec)</span>
          <input type="number" min="10" step="5" value="${block.roundSec}" data-timer-cfg="roundSec" style="width:70px;min-height:36px" />
        </label>
        <label class="field" style="flex-direction:row;align-items:center;gap:.4rem">
          <span style="font-size:var(--text-xs)">Recupero (sec)</span>
          <input type="number" min="5" step="5" value="${block.restSec}" data-timer-cfg="restSec" style="width:70px;min-height:36px" />
        </label>
      </div>
      <div class="timer-stage panel">
        <div class="timer-round-label" data-role="roundlabel"></div>
        <div class="timer-phase work" data-role="phase">Pronto</div>
        <div class="timer-big" data-role="display">${fmtTime(block.roundSec)}</div>
        <div class="timer-round-dots" data-role="dots">${Array.from({ length: block.rounds }).map(() => '<span></span>').join('')}</div>
        <div class="timer-controls">
          <button class="btn btn-primary" type="button" data-action="start">Avvia</button>
          <button class="btn" type="button" data-action="pauseresume" hidden>Pausa</button>
          <button class="btn" type="button" data-action="skip">Salta round</button>
          <button class="btn btn-ghost" type="button" data-action="reset">Reset</button>
        </div>
      </div>
    </div>`;

  const renderSessionInfoBlock = (block) => `
    <div class="panel block" data-block-id="${block.id}">
      <div class="block-head"><h4>${escapeHtml(block.title)}</h4>
        <label class="switch"><input type="checkbox" data-info-done /><span style="font-size:var(--text-xs)">Fatto</span></label>
      </div>
      <ul style="display:grid;gap:.35rem">${block.items.map((it) => `<li style="font-size:var(--text-sm);color:var(--color-text-muted)">— ${escapeHtml(it)}</li>`).join('')}</ul>
    </div>`;

  const renderSessionCardioBlock = (block) => `
    <div class="panel block cardio-block" data-block-id="${block.id}">
      <div class="block-head"><h4>${escapeHtml(block.title)}</h4><span class="tag">${block.minMinutes}-${block.maxMinutes} min</span></div>
      <p style="font-size:var(--text-sm);color:var(--color-text-muted)">${escapeHtml(block.note)}</p>
      <div class="field">
        <label for="cardioMode-${block.id}">Modalità</label>
        <select id="cardioMode-${block.id}" data-cardio-mode>${block.modes.map((m) => `<option value="${escapeHtml(m)}">${escapeHtml(m)}</option>`).join('')}</select>
      </div>
      <div class="timer-stage" style="padding:var(--space-3)">
        <div class="timer-big" data-role="stopwatch-display" style="font-size:clamp(2rem,10vw,3rem)">00:00</div>
        <div class="timer-controls">
          <button class="btn btn-sm btn-primary" type="button" data-action="sw-start">Avvia</button>
          <button class="btn btn-sm" type="button" data-action="sw-pause">Pausa</button>
          <button class="btn btn-sm btn-ghost" type="button" data-action="sw-reset">Reset</button>
          <button class="btn btn-sm" type="button" data-action="sw-use">Usa questo tempo</button>
        </div>
      </div>
      <div class="field">
        <label for="cardioMinutes-${block.id}">Minuti effettivi</label>
        <input type="number" id="cardioMinutes-${block.id}" min="0" data-cardio-minutes />
      </div>
    </div>`;

  // Condizioni di attivazione del round duro facoltativo (Giorno D).
  const hardRoundIsUnlocked = (block, state) => {
    const today = state.recoveryChecks.find((c) => c.date === U.todayISO());
    const eb = state.settings.externalBoxing;
    let boxingTomorrow = false;
    if (eb && eb.active && eb.days && eb.days.length) {
      const wd = U.weekdayKeyOf(new Date());
      const idx = D.WEEKDAY_KEYS.indexOf(wd);
      boxingTomorrow = eb.days.includes(D.WEEKDAY_KEYS[(idx + 1) % 7]);
    }
    return !!(today && today.sleep >= block.conditions.sleepMin && today.energy >= block.conditions.energyMin && today.pain <= block.conditions.painMax && !boxingTomorrow);
  };

  const hardRoundAsRoundsConfig = (block) => ({
    id: block.id, title: block.title, rounds: 1, roundSec: block.roundSec, restSec: block.restSec, note: block.note, roundLabels: ['Round duro'],
  });

  const renderSessionHardRoundBlock = (block, state) => {
    if (!hardRoundIsUnlocked(block, state)) {
      return `
        <div class="panel block" data-block-id="${block.id}">
          <div class="block-head"><h4>${escapeHtml(block.title)}</h4><span class="tag">Non attivo oggi</span></div>
          <p style="font-size:var(--text-sm);color:var(--color-text-muted)">Servono sonno ≥ ${block.conditions.sleepMin}/5, energia ≥ ${block.conditions.energyMin}/5, dolore ≤ ${block.conditions.painMax}/5 (check recupero in Dashboard) e nessuna boxe domani. Va benissimo restare tecnico oggi.</p>
        </div>`;
    }
    return renderSessionRoundsBlock(hardRoundAsRoundsConfig(block));
  };

  const wireRoundsBlock = (blockEl, block) => {
    const timer = createRoundTimer({ rounds: block.rounds, roundSec: block.roundSec, restSec: block.restSec });
    sessionState.timers[block.id] = timer;

    const display = blockEl.querySelector('[data-role="display"]');
    const phaseEl = blockEl.querySelector('[data-role="phase"]');
    const roundLabelEl = blockEl.querySelector('[data-role="roundlabel"]');
    const dots = [...blockEl.querySelectorAll('[data-role="dots"] span')];
    const startBtn = blockEl.querySelector('[data-action="start"]');
    const pauseBtn = blockEl.querySelector('[data-action="pauseresume"]');
    const cfgInputs = blockEl.querySelectorAll('[data-timer-cfg]');

    const update = (s) => {
      display.textContent = fmtTime(s.remaining);
      phaseEl.className = `timer-phase ${s.phase === 'rest' ? 'rest' : 'work'}`;
      phaseEl.textContent = s.phase === 'idle' ? 'Pronto' : s.phase === 'work' ? 'Lavoro' : s.phase === 'rest' ? 'Recupero' : 'Completato';
      const label = block.roundLabels && block.roundLabels[s.round - 1] ? ` — ${block.roundLabels[s.round - 1]}` : '';
      roundLabelEl.textContent = s.done ? 'Sessione round completata' : `Round ${Math.min(s.round, block.rounds)} di ${block.rounds}${label}`;
      dots.forEach((d, i) => {
        d.dataset.done = String(!!s.completed[i]);
        d.dataset.current = String(i === s.round - 1 && !s.done);
      });
      startBtn.hidden = s.phase !== 'idle';
      pauseBtn.hidden = s.phase === 'idle' || s.done;
      pauseBtn.textContent = s.running ? 'Pausa' : 'Riprendi';
      cfgInputs.forEach((inp) => { inp.disabled = s.phase !== 'idle'; });
      if (s.done) blockEl.dataset.completed = 'true';
    };

    timer.onUpdate(update);
    update(timer.getState());

    startBtn.addEventListener('click', () => timer.start());
    pauseBtn.addEventListener('click', () => { const s = timer.getState(); if (s.running) timer.pause(); else timer.resume(); });
    blockEl.querySelector('[data-action="skip"]').addEventListener('click', () => timer.skip());
    blockEl.querySelector('[data-action="reset"]').addEventListener('click', () => timer.reset());
    cfgInputs.forEach((inp) => {
      inp.addEventListener('change', () => {
        const val = Math.max(5, Number(inp.value) || 0);
        timer.updateConfig({ [inp.dataset.timerCfg]: val });
      });
    });
  };

  const wireStrengthBlock = (blockEl, block) => {
    blockEl.querySelectorAll('.exercise-row').forEach((row) => {
      const exId = row.dataset.exId;
      const data = sessionState.exercises[exId];
      row.querySelectorAll('.set-row').forEach((setRow) => {
        const idx = Number(setRow.dataset.setIdx);
        setRow.querySelectorAll('[data-field]').forEach((input) => {
          const field = input.dataset.field;
          if (field === 'done') input.checked = !!data.sets[idx].done;
          else input.value = data.sets[idx][field] != null ? data.sets[idx][field] : '';
          input.addEventListener(field === 'done' ? 'change' : 'input', () => {
            data.sets[idx][field] = field === 'done' ? input.checked : input.value;
          });
        });
      });
      const noteInput = row.querySelector('[data-field="note"]');
      if (noteInput) noteInput.addEventListener('input', () => { data.note = noteInput.value; });

      const techGroup = row.querySelector('[data-technique-for]');
      if (techGroup) {
        techGroup.querySelectorAll('[data-technique-val]').forEach((btn) => {
          btn.addEventListener('click', () => {
            data.technique = btn.dataset.techniqueVal;
            techGroup.querySelectorAll('[data-technique-val]').forEach((b) => { b.dataset.active = String(b === btn); });
          });
        });
      }
      const speedInput = row.querySelector('[data-field="speedDropped"]');
      if (speedInput) {
        speedInput.addEventListener('change', () => {
          data.speedDropped = speedInput.checked;
          const hint = row.querySelector(`[data-speed-hint-for="${exId}"]`);
          if (hint) hint.hidden = !speedInput.checked;
        });
      }
    });
  };

  const wireCardioBlock = (blockEl, block) => {
    const stopwatch = createStopwatch();
    sessionState.stopwatches[block.id] = stopwatch;
    const display = blockEl.querySelector('[data-role="stopwatch-display"]');
    stopwatch.onUpdate((s) => { display.textContent = fmtTime(s.seconds); });
    blockEl.querySelector('[data-action="sw-start"]').addEventListener('click', () => stopwatch.start());
    blockEl.querySelector('[data-action="sw-pause"]').addEventListener('click', () => stopwatch.pause());
    blockEl.querySelector('[data-action="sw-reset"]').addEventListener('click', () => stopwatch.reset());
    const minutesInput = blockEl.querySelector('[data-cardio-minutes]');
    blockEl.querySelector('[data-action="sw-use"]').addEventListener('click', () => {
      minutesInput.value = Math.round(stopwatch.getSeconds() / 60);
    });
    const modeSelect = blockEl.querySelector('[data-cardio-mode]');
    sessionState.cardio[block.id] = { mode: modeSelect.value, minutes: '' };
    modeSelect.addEventListener('change', () => { sessionState.cardio[block.id].mode = modeSelect.value; });
    minutesInput.addEventListener('input', () => { sessionState.cardio[block.id].minutes = minutesInput.value; });
  };

  const buildSessionBody = (day, state) => day.blocks.map((block) => {
    if (block.type === 'info') return renderSessionInfoBlock(block);
    if (block.type === 'cardio') return renderSessionCardioBlock(block);
    if (block.type === 'hardround') return renderSessionHardRoundBlock(block, state);
    if (block.type === 'rounds') return renderSessionRoundsBlock(block);
    return renderSessionStrengthBlock(block, day.key);
  }).join('');

  const wireSessionBlocks = (root, day, state) => {
    day.blocks.forEach((block) => {
      const blockEl = root.querySelector(`[data-block-id="${block.id}"]`);
      if (!blockEl) return;
      if (block.type === 'rounds') wireRoundsBlock(blockEl, block);
      else if (block.type === 'hardround') {
        if (blockEl.dataset.blockType === 'rounds') wireRoundsBlock(blockEl, hardRoundAsRoundsConfig(block));
      } else if (block.type === 'cardio') wireCardioBlock(blockEl, block);
      else if (block.type === 'info') {
        blockEl.querySelector('[data-info-done]').addEventListener('change', (e) => {
          sessionState.infoDone[block.id] = e.target.checked;
        });
      } else wireStrengthBlock(blockEl, block);
    });
  };

  const scaleButtonsHtml = (name, max, current) => `
    <div class="scale-buttons" data-scale="${name}" style="grid-template-columns:repeat(${max},1fr)">
      ${Array.from({ length: max }).map((_, i) => `<button type="button" data-val="${i + 1}" data-active="${current === i + 1}">${i + 1}</button>`).join('')}
    </div>`;

  const renderEndForm = () => `
    <div class="panel card" id="sessionEndForm">
      <div class="card-title">Chiudi sessione</div>
      <div class="field"><label>RPE globale (1-10)</label>${scaleButtonsHtml('rpe', 10, sessionState.rpe)}</div>
      <div class="field" style="margin-top:var(--space-3)"><label>Energia (1-5)</label>${scaleButtonsHtml('energy', 5, sessionState.energy)}</div>
      <div class="field" style="margin-top:var(--space-3)"><label>Dolore / fastidi (1-5)</label>${scaleButtonsHtml('pain', 5, sessionState.pain)}</div>
      <div class="field" style="margin-top:var(--space-3)">
        <label for="sessionNotes">Note</label>
        <textarea id="sessionNotes">${escapeHtml(sessionState.notes || '')}</textarea>
      </div>
      <button class="btn btn-primary btn-block" type="button" id="saveSessionBtn" style="margin-top:var(--space-4)">Salva e chiudi sessione</button>
    </div>`;

  const wireEndForm = (root) => {
    root.querySelectorAll('[data-scale]').forEach((group) => {
      const name = group.dataset.scale;
      group.querySelectorAll('button').forEach((btn) => {
        btn.addEventListener('click', () => {
          sessionState[name] = Number(btn.dataset.val);
          group.querySelectorAll('button').forEach((b) => { b.dataset.active = String(Number(b.dataset.val) === sessionState[name]); });
        });
      });
    });
    root.querySelector('#sessionNotes').addEventListener('input', (e) => { sessionState.notes = e.target.value; });
    root.querySelector('#saveSessionBtn').addEventListener('click', finishAndSaveSession);
  };

  const startElapsedTicker = (overlay, day) => {
    const el = overlay.querySelector('#sessionElapsed');
    if (!el) return;
    const update = () => {
      const elapsedMin = Math.floor((Date.now() - sessionState.startedAt) / 60000);
      const remaining = day.durationMin ? Math.max(0, day.durationMin.max - elapsedMin) : null;
      el.textContent = remaining != null ? `~${remaining} min rimanenti (stima)` : `${elapsedMin} min trascorsi`;
    };
    update();
    sessionState.uiTickerId = setInterval(update, 30000);
  };

  function startSession(dayKey) {
    const state = window.Store.getState();
    const { day, deloadActive, recoveryReduced, recoveryLevel } = getEffectiveDay(dayKey, state);
    if (!day) { window.UI.toast('Scheda non trovata.', 'warning'); return; }

    const blocksForSession = [...day.blocks];
    if (includeNeck && (dayKey === 'A' || dayKey === 'C')) {
      blocksForSession.push({
        id: 'neck-routine', type: 'strength', title: D.NECK_ROUTINE.title, exercises: D.NECK_ROUTINE.exercises,
      });
    }
    const dayWithNeck = { ...day, blocks: blocksForSession };

    const exercises = {};
    blocksForSession.forEach((block) => {
      if (block.exercises) block.exercises.forEach((ex) => { exercises[ex.id] = buildInitialExerciseData(ex, dayKey); });
    });

    sessionState = {
      dayKey,
      date: U.todayISO(),
      startedAt: Date.now(),
      exercises,
      infoDone: {},
      timers: {},
      stopwatches: {},
      cardio: {},
      rpe: 0,
      energy: 0,
      pain: 0,
      notes: '',
      neckIncluded: includeNeck && (dayKey === 'A' || dayKey === 'C'),
      variant: { deloadActive, recoveryReduced, recoveryLevel },
      uiTickerId: null,
    };

    const overlay = overlayEl();
    overlay.innerHTML = `
      <div class="session-header">
        <div>
          <span class="tag tag-${day.key.toLowerCase()}">${escapeHtml(day.kicker)}</span>
          <h2>${escapeHtml(day.title)}</h2>
        </div>
        <button class="btn btn-ghost" type="button" id="closeSessionBtn" aria-label="Chiudi sessione senza salvare">✕ Chiudi</button>
      </div>
      ${renderTopInfoBar(day)}
      <p id="sessionElapsed" style="text-align:center;font-size:var(--text-xs);color:var(--color-text-faint);margin:-.5rem 0 0"></p>
      ${deloadActive ? '<div class="alert alert-info" style="margin-top:var(--space-3)"><span class="alert-icon">🛠️</span><div>Settimana di scarico attiva: serie ridotte, RIR 3-4.</div></div>' : ''}
      ${recoveryReduced ? `<div class="alert alert-info" style="margin-top:var(--space-3)"><span class="alert-icon">🔋</span><div>Versione ridotta per recupero ${escapeHtml(recoveryLevel)}: richiamo upper rimosso, sacco potenza dimezzato.</div></div>` : ''}
      <div class="session-body" id="sessionBody">
        ${buildSessionBody(dayWithNeck, state)}
        <div id="sessionEndAnchor"></div>
      </div>`;
    overlay.hidden = false;
    document.body.style.overflow = 'hidden';

    wireSessionBlocks(overlay, dayWithNeck, state);
    startElapsedTicker(overlay, day);

    const endAnchor = overlay.querySelector('#sessionEndAnchor');
    endAnchor.outerHTML = renderEndForm();
    wireEndForm(overlay);

    overlay.querySelector('#closeSessionBtn').addEventListener('click', async () => {
      const ok = await window.UI.confirmDialog({
        title: 'Chiudere senza salvare?',
        message: 'I dati inseriti in questa sessione andranno persi.',
        confirmLabel: 'Chiudi senza salvare',
        danger: true,
      });
      if (ok) closeSession();
    });

    overlay.scrollTop = 0;
  }

  function closeSession() {
    if (sessionState) {
      Object.values(sessionState.timers).forEach((t) => t.destroy());
      Object.values(sessionState.stopwatches).forEach((s) => s.destroy());
      if (sessionState.uiTickerId) clearInterval(sessionState.uiTickerId);
    }
    sessionState = null;
    const overlay = overlayEl();
    overlay.hidden = true;
    overlay.innerHTML = '';
    document.body.style.overflow = '';
  }

  function finishAndSaveSession() {
    if (!sessionState.rpe) { window.UI.toast('Imposta almeno l\'RPE globale prima di salvare.', 'warning'); return; }

    const roundsSummary = {};
    Object.entries(sessionState.timers).forEach(([blockId, timer]) => {
      const s = timer.getState();
      roundsSummary[blockId] = { completedRounds: s.completed.filter(Boolean).length, totalRounds: timer.cfg.rounds };
    });

    const cardioLog = {};
    Object.entries(sessionState.cardio).forEach(([blockId, c]) => {
      if (c.minutes !== '' && c.minutes != null) cardioLog[blockId] = { mode: c.mode, minutes: Number(c.minutes) || 0 };
    });

    const cleanExercises = {};
    Object.entries(sessionState.exercises).forEach(([exId, data]) => {
      const sets = data.sets.map((s) => ({
        load: s.load === '' ? null : Number(s.load),
        reps: s.reps === '' ? null : Number(s.reps),
        rir: s.rir === '' ? null : Number(s.rir),
        done: !!s.done,
      }));
      const touched = sets.some((s) => s.done || s.load != null || s.reps != null) || (data.note && data.note.trim()) || data.technique || data.speedDropped;
      if (touched) {
        cleanExercises[exId] = {
          sets, note: data.note || '', technique: data.technique || null, speedDropped: !!data.speedDropped,
        };
      }
    });

    const workout = {
      id: U.uid('wk'),
      date: sessionState.date,
      dayKey: sessionState.dayKey,
      exercises: cleanExercises,
      rounds: roundsSummary,
      cardio: cardioLog,
      infoDone: sessionState.infoDone,
      neckIncluded: sessionState.neckIncluded,
      variant: sessionState.variant,
      rpe: sessionState.rpe,
      energy: sessionState.energy,
      pain: sessionState.pain,
      notes: sessionState.notes,
    };

    window.Store.update((s) => { s.workouts.push(workout); });
    window.UI.toast('Sessione salvata. Buon lavoro.', 'success');
    closeSession();
    const trainingView = document.getElementById('view-training');
    if (trainingView && !trainingView.hidden) render(trainingView);
  }

  window.Training = { render, startSession, getExerciseRecords, allExerciseHistory };
})();
