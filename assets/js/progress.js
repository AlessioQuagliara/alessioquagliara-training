/* ============================================================
   MODULO PROGRESSI
   Tracker manuale peso/vita/collo/BF/performance, grafici canvas
   con filtro settimana/mese/tutto, PR tracker dallo storico
   allenamenti, note di blocco e review guidata ogni 4 settimane.
   Le foto restano solo in memoria locale (preview non
   persistente), mai caricate da nessuna parte.
   ============================================================ */
(() => {
  'use strict';

  const U = window.Utils;
  const { escapeHtml } = U;

  let editingDate = null;
  let photoObjectUrl = null;
  let chartPeriod = 'tutto'; // 'settimana' | 'mese' | 'tutto'
  let editingNoteId = null;

  const performanceScore = (e) => (e.pullups || 0) + (e.pressKg || 0) / 10 + (e.floorPressKg || 0) / 10
    + (e.squatKg || 0) / 10 + (e.bulgaroKg || 0) / 10 + (e.rdlKg || 0) / 10 + (e.rounds || 0);

  const recompositionStatus = (progress) => {
    if (progress.length < 2) return { level: 'neutro', text: 'Dati insufficienti: aggiungi almeno due misurazioni per vedere lo stato di ricomposizione.' };
    const latest = progress[progress.length - 1];
    const prev = progress[progress.length - 2];
    const deltaWeight = (latest.weight || 0) - (prev.weight || 0);
    const deltaWaist = (latest.waist || 0) - (prev.waist || 0);
    const perfDelta = performanceScore(latest) - performanceScore(prev);
    if (Math.abs(deltaWeight) <= 0.4 && deltaWaist < 0 && perfDelta > 0) {
      return { level: 'positivo', text: 'Peso stabile, vita in calo e almeno una prestazione in aumento: ricomposizione in corso.' };
    }
    if (deltaWeight <= -0.5 && perfDelta < 0) {
      return { level: 'rivedi', text: 'Il peso cala troppo in fretta e le prestazioni scendono: rivedi recupero e calorie, valuta più carboidrati attorno agli allenamenti.' };
    }
    return { level: 'osservazione', text: 'Trend non ancora chiaro: continua a raccogliere dati con costanza prima di cambiare qualcosa.' };
  };

  const statusStyle = { positivo: 'success', rivedi: 'warning', neutro: 'info', osservazione: 'info' };

  const formFieldsSpec = [
    { key: 'weight', label: 'Peso (kg)', step: '0.1' },
    { key: 'waist', label: 'Vita (cm)', step: '0.5' },
    { key: 'neck', label: 'Collo (cm)', step: '0.5' },
    { key: 'bf', label: 'BF stimata (%)', step: '0.1' },
    { key: 'sleep', label: 'Sonno (1-5)', step: '1', min: 1, max: 5 },
    { key: 'energy', label: 'Energia (1-5)', step: '1', min: 1, max: 5 },
    { key: 'pain', label: 'Dolore/fastidi (1-5)', step: '1', min: 1, max: 5 },
    { key: 'pullups', label: 'Trazioni (reps)', step: '1' },
    { key: 'pressKg', label: 'Chest press (kg)', step: '0.5' },
    { key: 'floorPressKg', label: 'Floor press (kg)', step: '0.5' },
    { key: 'squatKg', label: 'Goblet/squat (kg)', step: '0.5' },
    { key: 'bulgaroKg', label: 'Bulgarian split squat (kg)', step: '0.5' },
    { key: 'rdlKg', label: 'RDL (kg)', step: '0.5' },
    { key: 'rounds', label: 'Round completati', step: '1' },
  ];

  const PERF_SELECT_OPTIONS = [
    { key: 'pullups', label: 'Trazioni' },
    { key: 'pressKg', label: 'Chest press' },
    { key: 'floorPressKg', label: 'Floor press' },
    { key: 'squatKg', label: 'Goblet/squat' },
    { key: 'bulgaroKg', label: 'Bulgarian split squat' },
    { key: 'rdlKg', label: 'RDL' },
    { key: 'rounds', label: 'Round completati' },
  ];

  // Esercizi tracciati automaticamente dallo storico sessioni per il PR tracker.
  const PR_EXERCISES = [
    { id: 'a-chest-press', label: 'Chest press' },
    { id: 'a-floor-press', label: 'Floor press' },
    { id: 'a-trazioni', label: 'Trazioni' },
    { id: 'c-squat', label: 'Goblet squat / squat' },
    { id: 'c-rdl', label: 'Romanian deadlift' },
    { id: 'c-bulgaro', label: 'Bulgarian split squat' },
  ];

  const filterByPeriod = (progress, period) => {
    if (period === 'tutto') return progress;
    const days = period === 'settimana' ? 7 : 30;
    return progress.filter((p) => (Date.now() - new Date(p.date).getTime()) / 86400000 <= days);
  };

  /* ---------------- PR tracker (dallo storico allenamenti reali) ---------------- */
  const computePRs = () => {
    if (!window.Training || !window.Training.getExerciseRecords) return [];
    return PR_EXERCISES.map((spec) => {
      const records = window.Training.getExerciseRecords(spec.id);
      let best = null;
      records.forEach((r) => { if (r.maxLoad > 0 && (!best || r.maxLoad > best.maxLoad)) best = r; });
      return { ...spec, best };
    });
  };

  /* ---------------- Review guidata ogni 4 settimane ---------------- */
  const weeklyBuckets = (progress) => {
    const buckets = {};
    progress.forEach((p) => {
      const ws = U.currentWeekRange(new Date(p.date))[0];
      if (!buckets[ws]) buckets[ws] = { weight: [], waist: [] };
      if (p.weight != null) buckets[ws].weight.push(p.weight);
      if (p.waist != null) buckets[ws].waist.push(p.waist);
    });
    return Object.entries(buckets).sort(([a], [b]) => a.localeCompare(b)).map(([ws, v]) => ({
      weekStart: ws,
      avgWeight: v.weight.length ? v.weight.reduce((s, x) => s + x, 0) / v.weight.length : null,
      avgWaist: v.waist.length ? v.waist.reduce((s, x) => s + x, 0) / v.waist.length : null,
    }));
  };

  const guidedReview = (state, progress) => {
    if (progress.length < 4) {
      return { level: 'insufficiente', text: 'Dati insufficienti per una review affidabile: continua a registrare con costanza.' };
    }
    const spanDays = (new Date(progress[progress.length - 1].date) - new Date(progress[0].date)) / 86400000;
    if (spanDays < 21) {
      return { level: 'insufficiente', text: 'Servono almeno 3 settimane di dati per una review affidabile: evita conclusioni premature.' };
    }

    const buckets = weeklyBuckets(progress);
    let minicut = false;
    if (buckets.length >= 4) {
      const last4 = buckets.slice(-4);
      const noDrops = last4.every((b, i) => i === 0 || (b.avgWeight != null && last4[i - 1].avgWeight != null && b.avgWeight >= last4[i - 1].avgWeight - 0.05)
        && (b.avgWaist != null && last4[i - 1].avgWaist != null && b.avgWaist >= last4[i - 1].avgWaist - 0.05));
      const weightRise = last4[3].avgWeight != null && last4[0].avgWeight != null && (last4[3].avgWeight - last4[0].avgWeight) > 0.5;
      const waistRise = last4[3].avgWaist != null && last4[0].avgWaist != null && (last4[3].avgWaist - last4[0].avgWaist) > 0.5;
      minicut = noDrops && weightRise && waistRise;
    }
    if (minicut) {
      return { level: 'minicut', text: 'Peso e vita salgono da almeno 3-4 settimane: valuta un mini-cut controllato, a partire dalle calorie in eccesso.' };
    }

    const avg = (arr, key) => (arr.length ? arr.reduce((s, p) => s + (p[key] || 0), 0) / arr.length : null);
    const inRange = (p, minD, maxD) => { const d = (Date.now() - new Date(p.date).getTime()) / 86400000; return d > minD && d <= maxD; };
    const recent = progress.filter((p) => inRange(p, -1, 14));
    const prior = progress.filter((p) => inRange(p, 14, 28));
    const recentPerf = recent.length ? recent.reduce((s, p) => s + performanceScore(p), 0) / recent.length : null;
    const priorPerf = prior.length ? prior.reduce((s, p) => s + performanceScore(p), 0) / prior.length : null;
    const recentW = avg(recent, 'weight');
    const priorW = avg(prior, 'weight');
    const recentWa = avg(recent, 'waist');
    const priorWa = avg(prior, 'waist');

    if (recentPerf != null && priorPerf != null && recentPerf < priorPerf) {
      return { level: 'verifica', text: 'Le prestazioni calano rispetto alle 2 settimane precedenti: verifica calorie, sonno e recupero.' };
    }
    if (recentW != null && priorW != null && Math.abs(recentW - priorW) <= 0.5
      && (recentWa == null || priorWa == null || recentWa <= priorWa + 0.1)
      && (recentPerf == null || priorPerf == null || recentPerf >= priorPerf)) {
      return { level: 'continua', text: 'Peso stabile, vita stabile o in calo, prestazioni tenute o in crescita: continua così.' };
    }
    return { level: 'osservazione', text: 'Trend misto: continua a raccogliere dati con costanza prima di cambiare qualcosa.' };
  };

  const REVIEW_STYLE = {
    continua: 'success', minicut: 'info', verifica: 'warning', insufficiente: 'info', osservazione: 'info',
  };

  const render = (container) => {
    const state = window.Store.getState();
    const progress = [...state.progress].sort((a, b) => a.date.localeCompare(b.date));
    const chartProgress = filterByPeriod(progress, chartPeriod);
    const latest = progress[progress.length - 1] || null;

    const last7 = progress.filter((p) => (Date.now() - new Date(p.date).getTime()) / 86400000 <= 7);
    const avgWeight7 = last7.length ? U.round1(last7.reduce((s, p) => s + (p.weight || 0), 0) / last7.length) : null;
    const waistHeightRatio = latest ? U.round1(latest.waist / state.profile.heightCm) : null;
    const fatMass = latest && latest.bf != null ? U.round1(latest.weight * (latest.bf / 100)) : null;
    const leanMass = latest && fatMass != null ? U.round1(latest.weight - fatMass) : null;
    const status = recompositionStatus(progress);
    const review = guidedReview(state, progress);
    const prs = computePRs();

    const trainedLast28 = state.workouts.filter((w) => (Date.now() - new Date(w.date).getTime()) / 86400000 <= 28).length;
    const recoveryLast28 = state.recoveryChecks.filter((c) => (Date.now() - new Date(c.date).getTime()) / 86400000 <= 28);
    const avgRecovery28 = recoveryLast28.length ? U.round1(recoveryLast28.reduce((s, c) => s + (c.sleep + c.energy) / 2, 0) / recoveryLast28.length) : null;

    const editingEntry = editingDate ? progress.find((p) => p.date === editingDate) : null;
    const formValues = editingEntry || {
      date: U.todayISO(), weight: '', waist: '', neck: '', bf: '', sleep: '', energy: '', pain: '', pullups: '', pressKg: '', floorPressKg: '', squatKg: '', bulgaroKg: '', rdlKg: '', rounds: '', photoNote: '',
    };

    const editingNote = editingNoteId ? state.blockNotes.find((n) => n.id === editingNoteId) : null;
    const noteDefaults = editingNote || {
      periodStart: U.toISODate(new Date(Date.now() - 28 * 86400000)), periodEnd: U.todayISO(), salito: '', calato: '', sonno: '', fastidi: '', boxeSparring: '',
    };

    container.innerHTML = `
      <div class="view-header"><h2>Progressi</h2><p>Inserimento manuale, media mobile e stato di ricomposizione. Le stime da circonferenze/BF vanno lette come trend, non come dato clinico.</p></div>

      <section class="panel card">
        <div class="card-title">${editingEntry ? `Modifica misurazione del ${U.formatDateShortIt(editingEntry.date)}` : 'Nuova misurazione'}</div>
        <form id="progressForm" class="grid-cards progress-form-grid">
          <div class="field"><label for="pDate">Data</label><input type="date" id="pDate" value="${formValues.date}" required /></div>
          ${formFieldsSpec.map((f) => `
            <div class="field"><label for="p_${f.key}">${f.label}</label>
              <input type="number" id="p_${f.key}" step="${f.step}" ${f.min != null ? `min="${f.min}" max="${f.max}"` : ''} value="${formValues[f.key] != null ? formValues[f.key] : ''}" />
            </div>`).join('')}
        </form>
        <div class="field" style="margin-top:var(--space-3)">
          <label for="pPhotoNote">Note confronto foto</label>
          <textarea id="pPhotoNote">${escapeHtml(formValues.photoNote || '')}</textarea>
        </div>
        <div class="photo-picker" style="margin-top:var(--space-3)">
          <label class="field"><span>Foto (solo anteprima locale, non viene salvata)</span><input type="file" id="pPhoto" accept="image/*" /></label>
          <img id="photoPreview" class="photo-preview" hidden alt="Anteprima foto locale" />
          <p class="photo-note">Per privacy la foto non è mai caricata da nessuna parte e non resta in memoria dopo che cambi pagina: solo il testo delle note viene salvato.</p>
        </div>
        <div style="display:flex;gap:var(--space-2);margin-top:var(--space-4)">
          <button class="btn btn-primary" type="submit" form="progressForm" id="saveProgressBtn">${editingEntry ? 'Aggiorna misurazione' : 'Salva misurazione'}</button>
          ${editingEntry ? '<button class="btn btn-ghost" type="button" id="cancelEditBtn">Annulla modifica</button>' : ''}
        </div>
      </section>

      <div class="grid-cards cols-4" style="margin-top:var(--space-4)">
        <div class="panel stat-tile"><span class="label">Media peso 7 giorni</span><span class="value">${avgWeight7 != null ? `${avgWeight7} kg` : '—'}</span></div>
        <div class="panel stat-tile"><span class="label">Rapporto vita/altezza</span><span class="value">${waistHeightRatio != null ? waistHeightRatio : '—'}</span></div>
        <div class="panel stat-tile"><span class="label">Massa grassa stimata</span><span class="value">${fatMass != null ? `${fatMass} kg` : '—'}</span></div>
        <div class="panel stat-tile"><span class="label">Massa magra stimata</span><span class="value">${leanMass != null ? `${leanMass} kg` : '—'}</span></div>
      </div>

      <section class="panel recomposition-status" style="margin-top:var(--space-4)">
        <div class="alert alert-${statusStyle[status.level]}">
          <span class="alert-icon">${status.level === 'positivo' ? '📈' : status.level === 'rivedi' ? '⚠️' : 'ℹ️'}</span>
          <div><strong>Stato ricomposizione: ${escapeHtml(status.level)}</strong>${escapeHtml(status.text)}</div>
        </div>
        <p style="font-size:var(--text-xs);color:var(--color-text-faint);margin-top:.5rem">Stima indicativa da peso, vita e prestazioni. Non è una diagnosi medica: per esigenze cliniche rivolgiti a un professionista.</p>
      </section>

      <section class="panel card" style="margin-top:var(--space-4)">
        <div class="card-title">Andamento</div>
        <div class="chip-group" role="group" aria-label="Periodo grafici">
          <button class="chip" type="button" data-period="settimana" data-active="${chartPeriod === 'settimana'}">Settimana</button>
          <button class="chip" type="button" data-period="mese" data-active="${chartPeriod === 'mese'}">Mese</button>
          <button class="chip" type="button" data-period="tutto" data-active="${chartPeriod === 'tutto'}">Tutto</button>
        </div>
      </section>

      <div class="grid-cards cols-2" style="margin-top:var(--space-4)">
        <section class="panel mini-chart-card">
          <div class="card-title">Peso e vita nel tempo</div>
          <canvas id="progressChart"></canvas>
          <div class="mini-chart-legend">
            <span class="legend-item"><span class="legend-dot" style="background:#c8502f"></span>Peso (kg)</span>
            <span class="legend-item"><span class="legend-dot" style="background:#4f8fae"></span>Vita (cm)</span>
          </div>
        </section>
        <section class="panel mini-chart-card">
          <div class="card-title">Performance</div>
          <div class="field" style="margin-bottom:var(--space-2)">
            <label for="perfSelect">Metrica</label>
            <select id="perfSelect">${PERF_SELECT_OPTIONS.map((o) => `<option value="${o.key}">${escapeHtml(o.label)}</option>`).join('')}</select>
          </div>
          <canvas id="perfChart"></canvas>
        </section>
      </div>

      <section class="panel card" style="margin-top:var(--space-4)">
        <div class="card-title">PR tracker — miglior carico registrato</div>
        <p style="font-size:var(--text-xs);color:var(--color-text-faint);margin-bottom:var(--space-3)">Preso dalle sessioni salvate in Allenamento. Non sono massimali (1RM), solo il carico più alto che hai registrato per quell'esercizio.</p>
        <div class="grid-cards cols-3 pr-grid">
          ${prs.map((pr) => `
            <div class="panel stat-tile">
              <span class="label">${escapeHtml(pr.label)}</span>
              <span class="value">${pr.best ? `${pr.best.maxLoad} kg` : '—'}</span>
              ${pr.best ? `<span class="delta">${pr.best.maxReps ? `${pr.best.maxReps} rip · ` : ''}${U.formatDateShortIt(pr.best.date)}</span>` : '<span class="delta">Nessun dato ancora</span>'}
            </div>`).join('')}
        </div>
      </section>

      <section class="panel card review-card" style="margin-top:var(--space-4)">
        <div class="card-title">Review guidata (ogni 4 settimane)</div>
        <div class="alert alert-${REVIEW_STYLE[review.level]}">
          <span class="alert-icon">${review.level === 'continua' ? '✅' : review.level === 'verifica' ? '⚠️' : review.level === 'minicut' ? '📉' : 'ℹ️'}</span>
          <div><strong>${escapeHtml(review.level)}</strong>${escapeHtml(review.text)}</div>
        </div>
        <div class="grid-cards cols-4" style="margin-top:var(--space-3)">
          <div class="panel stat-tile"><span class="label">Peso medio 14gg</span><span class="value">${avgWeight7 != null ? `${avgWeight7} kg` : '—'}</span></div>
          <div class="panel stat-tile"><span class="label">Vita più recente</span><span class="value">${latest ? `${latest.waist} cm` : '—'}</span></div>
          <div class="panel stat-tile"><span class="label">Allenamenti 28gg</span><span class="value">${trainedLast28}</span></div>
          <div class="panel stat-tile"><span class="label">Recupero medio 28gg</span><span class="value">${avgRecovery28 != null ? `${avgRecovery28}/5` : '—'}</span></div>
        </div>
        <p style="font-size:var(--text-xs);color:var(--color-text-faint);margin-top:.5rem">Suggerimento indicativo, non medico. Evita conclusioni da pochi dati: servono almeno 3 settimane registrate con costanza.</p>
      </section>

      <section class="panel card" style="margin-top:var(--space-4)">
        <div class="card-title">${editingNote ? 'Modifica nota di blocco' : 'Nuova nota di blocco (ogni 4 settimane)'}</div>
        <form id="blockNoteForm" class="grid-cards cols-2">
          <div class="field"><label for="bnStart">Dal</label><input type="date" id="bnStart" value="${noteDefaults.periodStart}" /></div>
          <div class="field"><label for="bnEnd">Al</label><input type="date" id="bnEnd" value="${noteDefaults.periodEnd}" /></div>
          <div class="field" style="grid-column:1/-1"><label for="bnUp">Cosa è salito</label><input type="text" id="bnUp" value="${escapeHtml(noteDefaults.salito)}" placeholder="Es. trazioni, RDL, round tenuti…" /></div>
          <div class="field" style="grid-column:1/-1"><label for="bnDown">Cosa è calato</label><input type="text" id="bnDown" value="${escapeHtml(noteDefaults.calato)}" placeholder="Es. squat, energia al sacco…" /></div>
          <div class="field"><label for="bnSleep">Sonno nel blocco</label><input type="text" id="bnSleep" value="${escapeHtml(noteDefaults.sonno)}" placeholder="Es. buono, irregolare…" /></div>
          <div class="field"><label for="bnPain">Fastidi</label><input type="text" id="bnPain" value="${escapeHtml(noteDefaults.fastidi)}" placeholder="Es. spalla destra leggera…" /></div>
          <div class="field" style="grid-column:1/-1"><label for="bnBoxe">Boxe/sparring effettuati</label><input type="text" id="bnBoxe" value="${escapeHtml(noteDefaults.boxeSparring)}" placeholder="Es. 6 lezioni, 2 sparring…" /></div>
        </form>
        <div style="display:flex;gap:var(--space-2);margin-top:var(--space-3)">
          <button class="btn btn-primary" type="submit" form="blockNoteForm" id="saveNoteBtn">${editingNote ? 'Aggiorna nota' : 'Salva nota di blocco'}</button>
          ${editingNote ? '<button class="btn btn-ghost" type="button" id="cancelNoteBtn">Annulla</button>' : ''}
        </div>
        ${state.blockNotes.length ? `
          <div class="block-note-list" style="margin-top:var(--space-4)">
            ${[...state.blockNotes].reverse().map((n) => `
              <div class="block-note-item" data-note-id="${n.id}">
                <strong>${U.formatDateShortIt(n.periodStart)} → ${U.formatDateShortIt(n.periodEnd)}</strong>
                ${n.salito ? `<p>📈 Salito: ${escapeHtml(n.salito)}</p>` : ''}
                ${n.calato ? `<p>📉 Calato: ${escapeHtml(n.calato)}</p>` : ''}
                ${n.sonno ? `<p>😴 Sonno: ${escapeHtml(n.sonno)}</p>` : ''}
                ${n.fastidi ? `<p>⚠️ Fastidi: ${escapeHtml(n.fastidi)}</p>` : ''}
                ${n.boxeSparring ? `<p>🥊 Boxe/sparring: ${escapeHtml(n.boxeSparring)}</p>` : ''}
                <div style="display:flex;gap:.4rem;margin-top:.4rem">
                  <button class="btn btn-sm" type="button" data-edit-note="${n.id}">Modifica</button>
                  <button class="btn btn-sm btn-danger" type="button" data-delete-note="${n.id}">Elimina</button>
                </div>
              </div>`).join('')}
          </div>` : ''}
      </section>

      <section class="panel card" style="margin-top:var(--space-4)">
        <div class="card-title">Storico misurazioni</div>
        <div class="history-table-wrap">
          <table class="history-table">
            <thead><tr><th>Data</th><th>Peso</th><th>Vita</th><th>BF</th><th></th></tr></thead>
            <tbody>
              ${[...progress].reverse().map((p) => `
                <tr>
                  <td>${U.formatDateShortIt(p.date)}</td><td>${p.weight ?? '-'}</td><td>${p.waist ?? '-'}</td><td>${p.bf ?? '-'}</td>
                  <td style="display:flex;gap:.3rem">
                    <button class="btn btn-sm" type="button" data-edit="${p.date}">Modifica</button>
                    <button class="btn btn-sm btn-danger" type="button" data-delete="${p.date}">Elimina</button>
                  </td>
                </tr>`).join('') || '<tr><td colspan="5" style="color:var(--color-text-faint)">Nessuna misurazione ancora.</td></tr>'}
            </tbody>
          </table>
        </div>
      </section>
    `;

    const chartCanvas = container.querySelector('#progressChart');
    window.Charts.drawLineChart(chartCanvas, [
      { label: 'Peso', color: '#c8502f', points: chartProgress.map((p) => ({ date: p.date, value: p.weight })).filter((p) => p.value != null && p.value !== '') },
      { label: 'Vita', color: '#4f8fae', points: chartProgress.map((p) => ({ date: p.date, value: p.waist })).filter((p) => p.value != null && p.value !== '') },
    ]);

    const perfSelect = container.querySelector('#perfSelect');
    const drawPerf = () => {
      const key = perfSelect.value;
      const pts = chartProgress.map((p) => ({ date: p.date, value: p[key] })).filter((p) => p.value != null && p.value !== '');
      window.Charts.drawLineChart(container.querySelector('#perfChart'), [{ label: key, color: '#e0a53a', points: pts }]);
    };
    perfSelect.addEventListener('change', drawPerf);
    drawPerf();

    wire(container, state);
  };

  function wire(container, state) {
    container.querySelectorAll('[data-period]').forEach((btn) => {
      btn.addEventListener('click', () => { chartPeriod = btn.dataset.period; render(container); });
    });

    const photoInput = container.querySelector('#pPhoto');
    photoInput.addEventListener('change', () => {
      const preview = container.querySelector('#photoPreview');
      if (photoObjectUrl) { URL.revokeObjectURL(photoObjectUrl); photoObjectUrl = null; }
      const file = photoInput.files && photoInput.files[0];
      if (!file) { preview.hidden = true; return; }
      photoObjectUrl = URL.createObjectURL(file);
      preview.src = photoObjectUrl;
      preview.hidden = false;
    });

    container.querySelector('#progressForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const date = container.querySelector('#pDate').value || U.todayISO();
      const entry = { date, photoNote: container.querySelector('#pPhotoNote').value };
      formFieldsSpec.forEach((f) => {
        const raw = container.querySelector(`#p_${f.key}`).value;
        entry[f.key] = raw === '' ? null : Number(raw);
      });
      window.Store.update((s) => {
        const idx = s.progress.findIndex((p) => p.date === date);
        if (idx >= 0) s.progress[idx] = { ...s.progress[idx], ...entry };
        else s.progress.push(entry);
      });
      window.UI.toast('Misurazione salvata.', 'success');
      editingDate = null;
      if (photoObjectUrl) { URL.revokeObjectURL(photoObjectUrl); photoObjectUrl = null; }
      render(container);
    });

    const cancelBtn = container.querySelector('#cancelEditBtn');
    if (cancelBtn) cancelBtn.addEventListener('click', () => { editingDate = null; render(container); });

    container.querySelectorAll('[data-edit]').forEach((btn) => {
      btn.addEventListener('click', () => { editingDate = btn.dataset.edit; render(container); window.scrollTo({ top: 0, behavior: 'smooth' }); });
    });
    container.querySelectorAll('[data-delete]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const ok = await window.UI.confirmDialog({ title: 'Eliminare la misurazione?', message: `La misurazione del ${U.formatDateShortIt(btn.dataset.delete)} verrà eliminata.`, danger: true, confirmLabel: 'Elimina' });
        if (!ok) return;
        window.Store.update((s) => { s.progress = s.progress.filter((p) => p.date !== btn.dataset.delete); });
        render(container);
      });
    });

    /* ---- Note di blocco ---- */
    container.querySelector('#blockNoteForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const note = {
        id: editingNoteId || U.uid('note'),
        periodStart: container.querySelector('#bnStart').value,
        periodEnd: container.querySelector('#bnEnd').value,
        salito: container.querySelector('#bnUp').value.trim(),
        calato: container.querySelector('#bnDown').value.trim(),
        sonno: container.querySelector('#bnSleep').value.trim(),
        fastidi: container.querySelector('#bnPain').value.trim(),
        boxeSparring: container.querySelector('#bnBoxe').value.trim(),
      };
      window.Store.update((s) => {
        const idx = s.blockNotes.findIndex((n) => n.id === note.id);
        if (idx >= 0) s.blockNotes[idx] = note;
        else s.blockNotes.push(note);
      });
      window.UI.toast('Nota di blocco salvata.', 'success');
      editingNoteId = null;
      render(container);
    });
    const cancelNoteBtn = container.querySelector('#cancelNoteBtn');
    if (cancelNoteBtn) cancelNoteBtn.addEventListener('click', () => { editingNoteId = null; render(container); });
    container.querySelectorAll('[data-edit-note]').forEach((btn) => {
      btn.addEventListener('click', () => { editingNoteId = btn.dataset.editNote; render(container); });
    });
    container.querySelectorAll('[data-delete-note]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const ok = await window.UI.confirmDialog({ title: 'Eliminare la nota?', message: 'La nota di blocco verrà eliminata.', danger: true, confirmLabel: 'Elimina' });
        if (!ok) return;
        window.Store.update((s) => { s.blockNotes = s.blockNotes.filter((n) => n.id !== btn.dataset.deleteNote); });
        render(container);
      });
    });
  }

  window.Progress = { render };
})();
