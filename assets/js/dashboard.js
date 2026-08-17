/* ============================================================
   MODULO DASHBOARD
   ============================================================ */
(() => {
  'use strict';

  const { escapeHtml, todayISO, weekdayKeyOf, formatDateLongIt, currentWeekRange, round1 } = window.Utils;
  const D = window.APP_DATA;

  let pendingRecovery = null; // check recupero non ancora salvato per oggi

  const dayLabel = (key) => {
    if (key === 'rest') return 'Riposo';
    const d = D.DAYS[key];
    return d ? `${d.kicker} — ${d.title}` : key;
  };

  const performanceScore = (e) => (e.pullups || 0) + (e.pressKg || 0) / 10 + (e.squatKg || 0) / 10 + (e.rdlKg || 0) / 10 + (e.rounds || 0);

  const computeStats = (state) => {
    const progress = [...state.progress].sort((a, b) => a.date.localeCompare(b.date));
    const latest = progress[progress.length - 1] || null;
    const last7 = progress.filter((p) => {
      const days = (Date.now() - new Date(p.date).getTime()) / 86400000;
      return days <= 7;
    });
    const avgWeight7 = last7.length ? round1(last7.reduce((s, p) => s + (p.weight || 0), 0) / last7.length) : (latest ? latest.weight : state.profile.weightStartKg);
    return { progress, latest, avgWeight7 };
  };

  const computeAlerts = (state, progress) => {
    const alerts = [];
    const checks = [...state.recoveryChecks].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 2);
    if (checks.length >= 2) {
      const bothLow = checks.every((c) => (c.sleep + c.energy) / 2 <= 2.2 || c.pain >= 4 || c.stress >= 4);
      if (bothLow) {
        alerts.push({ type: 'warning', icon: '⚠️', title: 'Recupero basso', text: 'Negli ultimi 2 check il recupero è basso: oggi valuta una sessione tecnica leggera o solo recupero attivo.' });
      }
    }
    if (progress.length >= 2) {
      const latest = progress[progress.length - 1];
      const prev = progress[progress.length - 2];
      const deltaWeight = (latest.weight || 0) - (prev.weight || 0);
      const perfDelta = performanceScore(latest) - performanceScore(prev);
      if (deltaWeight <= -0.4 && perfDelta < 0) {
        alerts.push({ type: 'warning', icon: '🍚', title: 'Peso in calo e prestazioni giù', text: 'Il peso scende rapidamente e la performance cala: valuta più carboidrati attorno agli allenamenti.' });
      } else if (Math.abs(deltaWeight) <= 0.3 && (latest.waist || 0) < (prev.waist || 0) && perfDelta > 0) {
        alerts.push({ type: 'success', icon: '📈', title: 'Ricomposizione in corso', text: 'Peso stabile, vita in calo e prestazioni in aumento: la strategia sta funzionando, continua così.' });
      }
    }
    return alerts;
  };

  const recoveryRow = (label, key, value) => `
    <div class="recovery-row" data-metric="${key}">
      <div class="recovery-row-head"><span>${label}</span><span>${value ? `${value}/5` : 'non impostato'}</span></div>
      <div class="scale-buttons">
        ${[1, 2, 3, 4, 5].map((n) => `<button type="button" data-val="${n}" data-active="${value === n}" aria-label="${label} livello ${n} su 5">${n}</button>`).join('')}
      </div>
    </div>`;

  const render = (container) => {
    const state = window.Store.getState();
    const today = new Date();
    const wKey = weekdayKeyOf(today);
    const planKey = state.settings.weekPlan[wKey] || 'rest';
    const { progress, latest, avgWeight7 } = computeStats(state);
    const alerts = computeAlerts(state, progress);
    const [weekStart, weekEnd] = currentWeekRange(today);
    const plannedCount = Object.values(state.settings.weekPlan).filter((v) => v !== 'rest').length;
    const doneCount = state.workouts.filter((w) => w.date >= weekStart && w.date <= weekEnd).length;
    const weekPct = plannedCount ? Math.min(100, Math.round((doneCount / plannedCount) * 100)) : 0;

    const todayCheck = state.recoveryChecks.find((c) => c.date === todayISO());
    if (!pendingRecovery || pendingRecovery.date !== todayISO()) {
      pendingRecovery = { date: todayISO(), ...(todayCheck || { sleep: 0, energy: 0, pain: 0, stress: 0 }) };
    }

    const bf = latest ? latest.bf : state.profile.bfStartPct;
    const waist = latest ? latest.waist : state.profile.waistStartCm;

    const focusText = planKey === 'rest'
      ? { title: 'Recupero', body: 'Giornata di riposo dai pesi: mobilità libera, cammino leggero, sonno. Mantieni le proteine, puoi tagliare una porzione di carboidrati.' }
      : D.DAYS[planKey].focus === 'forza'
        ? { title: 'Forza', body: `${D.DAYS[planKey].description} Aumenta leggermente i carboidrati pre/post allenamento.` }
        : { title: 'Tecnica', body: D.DAYS[planKey].description };

    container.innerHTML = `
      <div class="view-header"><h2>Dashboard</h2><p>Il colpo d'occhio sulla settimana: allenamento, recupero e trend.</p></div>

      <section class="panel dash-hero">
        <span class="eyebrow">${escapeHtml(formatDateLongIt(today))}</span>
        <h2>${planKey === 'rest' ? 'Oggi è giorno di riposo' : `Oggi: ${escapeHtml(dayLabel(planKey))}`}</h2>
        <p class="date-line">${planKey === 'rest' ? 'Nessuna scheda pianificata: mobilità libera o recupero attivo.' : escapeHtml(D.DAYS[planKey].description)}</p>
        <div class="dash-today-row">
          ${planKey !== 'rest' ? `<button class="btn btn-primary" type="button" id="dashStartBtn">Inizia allenamento</button>` : `<button class="btn" type="button" id="dashGoTraining">Apri Allenamento</button>`}
          ${state.settings.boxingToday ? '<span class="tag tag-a">Ho boxe oggi</span>' : ''}
        </div>
        ${state.settings.boxingToday ? '<div class="alert alert-info"><span class="alert-icon">🥊</span><div>Hai boxe oggi: riduci la seduta casa a 30-45 minuti leggeri, oppure fai solo mobilità/recupero.</div></div>' : ''}
      </section>

      <section class="panel card" style="margin-top:var(--space-4)">
        <div class="card-title">Settimana</div>
        <div class="week-progress">
          <div class="week-progress-bar"><span style="width:${weekPct}%"></span></div>
          <strong>${doneCount}/${plannedCount || 0}</strong>
        </div>
        <p class="alert-icon" style="font-size:var(--text-xs);color:var(--color-text-muted);margin-top:.4rem">Allenamenti completati su quelli pianificati questa settimana.</p>
      </section>

      <div class="grid-cards cols-4" style="margin-top:var(--space-4)">
        <div class="panel stat-tile"><span class="label">Peso più recente</span><span class="value">${latest ? `${latest.weight} kg` : `${state.profile.weightStartKg} kg`}</span></div>
        <div class="panel stat-tile"><span class="label">Media peso 7 giorni</span><span class="value">${avgWeight7} kg</span></div>
        <div class="panel stat-tile"><span class="label">Vita più recente</span><span class="value">${waist} cm</span></div>
        <div class="panel stat-tile"><span class="label">BF stimata</span><span class="value">${bf}%</span></div>
      </div>

      <div class="grid-cards cols-2" style="margin-top:var(--space-4)">
        <section class="panel mini-chart-card">
          <div class="card-title">Trend peso e vita</div>
          <canvas id="dashChart" role="img" aria-label="Grafico andamento peso e vita nel tempo"></canvas>
          <div class="mini-chart-legend">
            <span class="legend-item"><span class="legend-dot" style="background:#c8502f"></span>Peso (kg)</span>
            <span class="legend-item"><span class="legend-dot" style="background:#4f8fae"></span>Vita (cm)</span>
          </div>
        </section>

        <section class="panel card">
          <div class="card-title">Focus del giorno</div>
          <h3 style="font-size:var(--text-lg);font-weight:800;margin-bottom:.3rem">${escapeHtml(focusText.title)}</h3>
          <p style="color:var(--color-text-muted);font-size:var(--text-sm)">${escapeHtml(focusText.body)}</p>
        </section>
      </div>

      <section class="panel card" style="margin-top:var(--space-4)">
        <div class="card-title">Check recupero di oggi</div>
        <div class="recovery-grid">
          ${recoveryRow('Sonno', 'sleep', pendingRecovery.sleep)}
          ${recoveryRow('Energia', 'energy', pendingRecovery.energy)}
          ${recoveryRow('Dolore / fastidi', 'pain', pendingRecovery.pain)}
          ${recoveryRow('Stress', 'stress', pendingRecovery.stress)}
        </div>
        <button class="btn btn-primary" type="button" id="saveRecoveryBtn" style="margin-top:var(--space-3)">Salva check di oggi</button>
      </section>

      ${alerts.length ? `
      <section style="margin-top:var(--space-4);display:grid;gap:var(--space-3)">
        ${alerts.map((a) => `<div class="alert alert-${a.type}"><span class="alert-icon">${a.icon}</span><div><strong>${escapeHtml(a.title)}</strong>${escapeHtml(a.text)}</div></div>`).join('')}
        <p style="font-size:var(--text-xs);color:var(--color-text-faint)">Avvisi indicativi basati sui tuoi dati, non sono una diagnosi medica.</p>
      </section>` : ''}
    `;

    // Grafico peso/vita
    const chartCanvas = container.querySelector('#dashChart');
    if (chartCanvas) {
      const sorted = [...progress].sort((a, b) => a.date.localeCompare(b.date));
      window.Charts.drawLineChart(chartCanvas, [
        { label: 'Peso', color: '#c8502f', points: sorted.map((p) => ({ date: p.date, value: p.weight })) },
        { label: 'Vita', color: '#4f8fae', points: sorted.map((p) => ({ date: p.date, value: p.waist })) },
      ]);
    }

    // Wiring
    const startBtn = container.querySelector('#dashStartBtn');
    if (startBtn) startBtn.addEventListener('click', () => window.App.startSession(planKey));
    const goTraining = container.querySelector('#dashGoTraining');
    if (goTraining) goTraining.addEventListener('click', () => window.App.goToView('training'));

    container.querySelectorAll('.recovery-row').forEach((row) => {
      const metric = row.dataset.metric;
      row.querySelectorAll('button[data-val]').forEach((btn) => {
        btn.addEventListener('click', () => {
          pendingRecovery[metric] = Number(btn.dataset.val);
          row.querySelectorAll('button[data-val]').forEach((b) => { b.dataset.active = String(Number(b.dataset.val) === pendingRecovery[metric]); });
          row.querySelector('.recovery-row-head span:last-child').textContent = `${pendingRecovery[metric]}/5`;
        });
      });
    });

    container.querySelector('#saveRecoveryBtn').addEventListener('click', () => {
      if (!pendingRecovery.sleep || !pendingRecovery.energy || !pendingRecovery.pain || !pendingRecovery.stress) {
        window.UI.toast('Imposta tutti e 4 i valori prima di salvare.', 'warning');
        return;
      }
      window.Store.update((s) => {
        const idx = s.recoveryChecks.findIndex((c) => c.date === pendingRecovery.date);
        if (idx >= 0) s.recoveryChecks[idx] = { ...pendingRecovery };
        else s.recoveryChecks.push({ ...pendingRecovery });
      });
      window.UI.toast('Check recupero salvato.', 'success');
      render(container);
    });
  };

  window.Dashboard = { render };
})();
