/* ============================================================
   MODULO ALLENAMENTO
   Schede A/B/C/D, pianificazione settimanale, session runner
   a schermo intero con timer round (Web Audio, no file esterni)
   e storico carichi per esercizio.
   ============================================================ */
(() => {
  'use strict';

  const U = window.Utils;
  const D = window.APP_DATA;
  const { escapeHtml } = U;

  let selectedDayKey = null;
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

  const fmtTime = (secs) => {
    const s = Math.max(0, secs);
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const r = Math.floor(s % 60).toString().padStart(2, '0');
    return `${m}:${r}`;
  };

  /* ---------------- Dati derivati: ultimo storico esercizio ---------------- */

  // Ultima sessione (qualsiasi data) che contiene dati per l'esercizio dato, sullo stesso giorno.
  const getLastExerciseRecord = (exId, dayKey) => {
    const state = window.Store.getState();
    const workouts = state.workouts
      .filter((w) => w.dayKey === dayKey && w.exercises && w.exercises[exId])
      .sort((a, b) => b.date.localeCompare(a.date));
    if (!workouts.length) return null;
    return { workout: workouts[0], data: workouts[0].exercises[exId] };
  };

  const allExerciseHistory = (exId) => {
    const state = window.Store.getState();
    return state.workouts
      .filter((w) => w.exercises && w.exercises[exId])
      .map((w) => {
        const sets = w.exercises[exId].sets || [];
        const maxLoad = sets.reduce((m, s) => Math.max(m, Number(s.load) || 0), 0);
        const maxReps = sets.reduce((m, s) => Math.max(m, Number(s.reps) || 0), 0);
        return { date: w.date, load: maxLoad, reps: maxReps };
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  };

  const progressionHint = (ex, dayKey) => {
    const rec = getLastExerciseRecord(ex.id, dayKey);
    if (!rec) return null;
    const { workout, data } = rec;
    const lowRecovery = (workout.energy != null && workout.energy <= 2) || (workout.pain != null && workout.pain >= 4);
    if (lowRecovery) return null;
    const sets = data.sets || [];
    if (!sets.length) return null;
    const allHitTarget = sets.every((s) => s.done && Number(s.reps) >= ex.repsMax && ex.rirTarget != null && Number(s.rir) === Number(ex.rirTarget));
    if (!allHitTarget) return null;
    return 'Prossima volta: aggiungi 1-2 kg oppure 1 ripetizione per serie.';
  };

  /* ================= Vista Allenamento (tab) ================= */

  const dayButtons = () => D.DAY_ORDER.map((key) => {
    const d = D.DAYS[key];
    return `<button class="day-select-btn" type="button" data-day="${key}" data-active="${key === selectedDayKey}">${d.kicker}<br><span style="font-weight:600;font-size:var(--text-xs);color:var(--color-text-muted)">${escapeHtml(d.title)}</span></button>`;
  }).join('');

  const renderBlockReadOnly = (block, dayKey) => {
    if (block.type === 'info') {
      return `
        <div class="block">
          <div class="block-head"><h4>${escapeHtml(block.title)}</h4></div>
          <ul style="display:grid;gap:.35rem">${block.items.map((it) => `<li style="font-size:var(--text-sm);color:var(--color-text-muted)">— ${escapeHtml(it)}</li>`).join('')}</ul>
        </div>`;
    }
    if (block.type === 'rounds') {
      return `
        <div class="block">
          <div class="block-head"><h4>${escapeHtml(block.title)}</h4><span class="tag">${block.rounds} × ${Math.round(block.roundSec / 60)} min</span></div>
          <div class="rounds-summary"><span class="info">Recupero ${block.restSec}s tra i round. ${block.roundLabels ? escapeHtml(block.roundLabels.join(' · ')) : ''}</span></div>
        </div>`;
    }
    // strength / power
    const hasFundamental = block.exercises.some((e) => e.kind === 'fondamentale');
    return `
      <div class="block">
        <div class="block-head"><h4>${escapeHtml(block.title)}</h4></div>
        ${block.note ? `<div class="block-note">⚡ ${escapeHtml(block.note)}</div>` : ''}
        ${hasFundamental ? `<div class="block-note">🎯 ${escapeHtml(D.RULE_FUNDAMENTALS)}</div>` : ''}
        <div style="display:grid;gap:.5rem">
          ${block.exercises.map((ex) => {
            const hint = progressionHint(ex, dayKey);
            const metaParts = [`${ex.sets}×${ex.repsMin}-${ex.repsMax}${ex.unilateral ? '/lato' : ''}${ex.isTime ? ' sec' : ''}`];
            if (ex.rirTarget != null) metaParts.push(`RIR ${ex.rirTarget}`);
            metaParts.push(`rec ${ex.restSec}s`);
            return `
              <div class="exercise-row">
                <div class="exercise-row-head"><span class="name">${escapeHtml(ex.name)}</span><span class="meta">${metaParts.join(' · ')}</span></div>
                ${hint ? `<span class="exercise-progress-hint">📈 ${escapeHtml(hint)}</span>` : ''}
              </div>`;
          }).join('')}
        </div>
      </div>`;
  };

  const renderWeekPlanner = (state) => `
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
    </section>`;

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
    const day = D.DAYS[selectedDayKey];

    container.innerHTML = `
      <div class="view-header"><h2>Allenamento</h2><p>Schede A/B/C/D interattive: spunta le serie, gestisci i round e traccia i carichi.</p></div>

      <div class="day-select-row" role="group" aria-label="Seleziona scheda">${dayButtons()}</div>

      <section class="panel">
        <div class="day-detail-head">
          <div>
            <span class="tag tag-${day.key.toLowerCase()}">${escapeHtml(day.kicker)}</span>
            <h3>${escapeHtml(day.title)}</h3>
            <p>${escapeHtml(day.description)}</p>
          </div>
          <button class="btn btn-primary" type="button" id="startSessionBtn">Inizia allenamento</button>
        </div>
        <div class="block-list">${day.blocks.map((b) => renderBlockReadOnly(b, day.key)).join('')}</div>
      </section>

      ${renderWeekPlanner(state)}
      ${renderHistorySection()}
    `;

    container.querySelectorAll('.day-select-btn').forEach((btn) => {
      btn.addEventListener('click', () => { selectedDayKey = btn.dataset.day; render(container); });
    });
    container.querySelector('#startSessionBtn').addEventListener('click', () => startSession(selectedDayKey));

    container.querySelectorAll('[data-weekday]').forEach((sel) => {
      sel.addEventListener('change', () => {
        window.Store.update((s) => { s.settings.weekPlan[sel.dataset.weekday] = sel.value; });
        window.UI.toast('Settimana aggiornata.', 'success');
      });
    });

    wireHistorySection(container);
  };

  /* ================= Session runner (overlay fullscreen) ================= */

  const overlayEl = () => document.getElementById('sessionOverlay');

  const buildInitialExerciseData = (ex, dayKey) => {
    const rec = getLastExerciseRecord(ex.id, dayKey);
    const lastSets = rec ? rec.data.sets || [] : [];
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
    };
  };

  const renderSessionStrengthBlock = (block, dayKey) => {
    const hasFundamental = block.exercises.some((e) => e.kind === 'fondamentale');
    return `
      <div class="panel block" data-block-id="${block.id}">
        <div class="block-head"><h4>${escapeHtml(block.title)}</h4></div>
        ${block.note ? `<div class="block-note">⚡ ${escapeHtml(block.note)}</div>` : ''}
        ${hasFundamental ? `<div class="block-note">🎯 ${escapeHtml(D.RULE_FUNDAMENTALS)}</div>` : ''}
        ${block.exercises.map((ex) => {
          const hint = progressionHint(ex, dayKey);
          const noLoad = ex.isTime || block.type === 'power';
          const unit = ex.isTime ? 'sec' : 'rip';
          return `
          <div class="exercise-row" data-ex-id="${ex.id}">
            <div class="exercise-row-head">
              <span class="name">${escapeHtml(ex.name)}</span>
              <span class="meta">${ex.sets}×${ex.repsMin}-${ex.repsMax}${ex.unilateral ? '/lato' : ''}${ex.rirTarget != null ? ` · RIR ${ex.rirTarget}` : ''} · rec ${ex.restSec}s</span>
            </div>
            ${hint ? `<span class="exercise-progress-hint">📈 ${escapeHtml(hint)}</span>` : ''}
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
            <input type="text" class="exercise-note-input" data-field="note" placeholder="Note tecnica, sensazioni…" aria-label="Note per ${escapeHtml(ex.name)}" />
          </div>`;
        }).join('')}
      </div>`;
  };

  const renderSessionRoundsBlock = (block) => `
    <div class="panel block" data-block-id="${block.id}" data-block-type="rounds">
      <div class="block-head"><h4>${escapeHtml(block.title)}</h4><span class="tag">${block.rounds} round</span></div>
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
    });
  };

  const buildSessionBody = (day) => day.blocks.map((block) => {
    if (block.type === 'info') return renderSessionInfoBlock(block);
    if (block.type === 'rounds') return renderSessionRoundsBlock(block);
    return renderSessionStrengthBlock(block, day.key);
  }).join('');

  const wireSessionBlocks = (root, day) => {
    day.blocks.forEach((block) => {
      const blockEl = root.querySelector(`[data-block-id="${block.id}"]`);
      if (!blockEl) return;
      if (block.type === 'rounds') wireRoundsBlock(blockEl, block);
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

  function startSession(dayKey) {
    const day = D.DAYS[dayKey];
    if (!day) { window.UI.toast('Scheda non trovata.', 'warning'); return; }

    const exercises = {};
    day.blocks.forEach((block) => {
      if (block.exercises) block.exercises.forEach((ex) => { exercises[ex.id] = buildInitialExerciseData(ex, dayKey); });
    });

    sessionState = {
      dayKey, date: U.todayISO(), startedAt: Date.now(), exercises, infoDone: {}, timers: {}, rpe: 0, energy: 0, pain: 0, notes: '',
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
      <div class="session-body" id="sessionBody">
        ${buildSessionBody(day)}
        <div id="sessionEndAnchor"></div>
      </div>`;
    overlay.hidden = false;
    document.body.style.overflow = 'hidden';

    wireSessionBlocks(overlay, day);

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
    if (sessionState) Object.values(sessionState.timers).forEach((t) => t.destroy());
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

    const cleanExercises = {};
    Object.entries(sessionState.exercises).forEach(([exId, data]) => {
      const sets = data.sets.map((s) => ({
        load: s.load === '' ? null : Number(s.load),
        reps: s.reps === '' ? null : Number(s.reps),
        rir: s.rir === '' ? null : Number(s.rir),
        done: !!s.done,
      }));
      const touched = sets.some((s) => s.done || s.load != null || s.reps != null) || (data.note && data.note.trim());
      if (touched) cleanExercises[exId] = { sets, note: data.note || '' };
    });

    const workout = {
      id: U.uid('wk'),
      date: sessionState.date,
      dayKey: sessionState.dayKey,
      exercises: cleanExercises,
      rounds: roundsSummary,
      infoDone: sessionState.infoDone,
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

  window.Training = { render, startSession };
})();
