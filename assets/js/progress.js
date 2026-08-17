/* ============================================================
   MODULO PROGRESSI
   Tracker manuale peso/vita/collo/BF/performance, grafici canvas,
   stato di ricomposizione. Le foto restano solo in memoria locale
   (preview non persistente), mai caricate da nessuna parte.
   ============================================================ */
(() => {
  'use strict';

  const U = window.Utils;
  const { escapeHtml } = U;

  let editingDate = null;
  let photoObjectUrl = null;

  const performanceScore = (e) => (e.pullups || 0) + (e.pressKg || 0) / 10 + (e.squatKg || 0) / 10 + (e.rdlKg || 0) / 10 + (e.rounds || 0);

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
    { key: 'pressKg', label: 'Chest/floor press (kg)', step: '0.5' },
    { key: 'squatKg', label: 'Goblet/squat (kg)', step: '0.5' },
    { key: 'rdlKg', label: 'RDL (kg)', step: '0.5' },
    { key: 'rounds', label: 'Round completati', step: '1' },
  ];

  const render = (container) => {
    const state = window.Store.getState();
    const progress = [...state.progress].sort((a, b) => a.date.localeCompare(b.date));
    const latest = progress[progress.length - 1] || null;

    const last7 = progress.filter((p) => (Date.now() - new Date(p.date).getTime()) / 86400000 <= 7);
    const avgWeight7 = last7.length ? U.round1(last7.reduce((s, p) => s + (p.weight || 0), 0) / last7.length) : null;
    const waistHeightRatio = latest ? U.round1(latest.waist / state.profile.heightCm) : null;
    const fatMass = latest && latest.bf != null ? U.round1(latest.weight * (latest.bf / 100)) : null;
    const leanMass = latest && fatMass != null ? U.round1(latest.weight - fatMass) : null;
    const status = recompositionStatus(progress);

    const editingEntry = editingDate ? progress.find((p) => p.date === editingDate) : null;
    const formValues = editingEntry || {
      date: U.todayISO(), weight: '', waist: '', neck: '', bf: '', sleep: '', energy: '', pain: '', pullups: '', pressKg: '', squatKg: '', rdlKg: '', rounds: '', photoNote: '',
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
            <select id="perfSelect">
              <option value="pullups">Trazioni</option>
              <option value="pressKg">Chest/floor press</option>
              <option value="squatKg">Goblet/squat</option>
              <option value="rdlKg">RDL</option>
              <option value="rounds">Round completati</option>
            </select>
          </div>
          <canvas id="perfChart"></canvas>
        </section>
      </div>

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
      { label: 'Peso', color: '#c8502f', points: progress.map((p) => ({ date: p.date, value: p.weight })).filter((p) => p.value != null && p.value !== '') },
      { label: 'Vita', color: '#4f8fae', points: progress.map((p) => ({ date: p.date, value: p.waist })).filter((p) => p.value != null && p.value !== '') },
    ]);

    const perfSelect = container.querySelector('#perfSelect');
    const drawPerf = () => {
      const key = perfSelect.value;
      const pts = progress.map((p) => ({ date: p.date, value: p[key] })).filter((p) => p.value != null && p.value !== '');
      window.Charts.drawLineChart(container.querySelector('#perfChart'), [{ label: key, color: '#e0a53a', points: pts }]);
    };
    perfSelect.addEventListener('change', drawPerf);
    drawPerf();

    wire(container, state);
  };

  function wire(container, state) {
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
  }

  window.Progress = { render };
})();
