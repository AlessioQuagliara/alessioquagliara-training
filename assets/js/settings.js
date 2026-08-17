/* ============================================================
   MODULO IMPOSTAZIONI E BACKUP
   Profilo, preferenze, target nutrizionali, export/import JSON,
   ripristino demo, cancellazione dati. Tutto locale al browser.
   ============================================================ */
(() => {
  'use strict';

  const U = window.Utils;
  const { escapeHtml } = U;

  const render = (container) => {
    const state = window.Store.getState();
    const p = state.profile;
    const t = state.settings.nutritionTargets;

    container.innerHTML = `
      <div class="view-header"><h2>Impostazioni e backup</h2><p>Profilo, preferenze e gestione dei dati salvati su questo browser.</p></div>

      <section class="panel card">
        <div class="card-title">Profilo</div>
        <form id="profileForm" class="grid-cards cols-3">
          <div class="field"><label for="s_height">Altezza (cm)</label><input id="s_height" type="number" step="0.1" value="${p.heightCm}" /></div>
          <div class="field"><label for="s_weight">Peso iniziale (kg)</label><input id="s_weight" type="number" step="0.1" value="${p.weightStartKg}" /></div>
          <div class="field"><label for="s_bf">BF iniziale (%)</label><input id="s_bf" type="number" step="0.1" value="${p.bfStartPct}" /></div>
          <div class="field"><label for="s_waist">Vita iniziale (cm)</label><input id="s_waist" type="number" step="0.5" value="${p.waistStartCm}" /></div>
          <div class="field"><label for="s_neck">Collo iniziale (cm)</label><input id="s_neck" type="number" step="0.5" value="${p.neckStartCm}" /></div>
          <div class="field"><label for="s_goalMin">Obiettivo BF min (%)</label><input id="s_goalMin" type="number" step="0.5" value="${p.goalBfMinPct}" /></div>
          <div class="field"><label for="s_goalMax">Obiettivo BF max (%)</label><input id="s_goalMax" type="number" step="0.5" value="${p.goalBfMaxPct}" /></div>
        </form>
        <button class="btn btn-primary" type="submit" form="profileForm" style="margin-top:var(--space-3)">Salva profilo</button>
      </section>

      <section class="panel card" style="margin-top:var(--space-4)">
        <div class="card-title">Preferenze</div>
        <label class="switch" style="margin-bottom:var(--space-3)">
          <input type="checkbox" id="soundToggle" ${state.settings.soundEnabled !== false ? 'checked' : ''} />
          <span>Segnale sonoro timer (Web Audio, nessun file esterno)</span>
        </label>
        <label class="switch">
          <input type="checkbox" id="boxingTodayToggleSettings" ${state.settings.boxingToday ? 'checked' : ''} />
          <span>Ho boxe oggi (riduce la seduta casa suggerita)</span>
        </label>
      </section>

      <section class="panel card" style="margin-top:var(--space-4)">
        <div class="card-title">Target nutrizionali</div>
        <form id="targetsForm" class="grid-cards cols-3">
          <div class="field"><label for="t_pMin">Proteine min (g)</label><input id="t_pMin" type="number" value="${t.proteinMin}" /></div>
          <div class="field"><label for="t_pMax">Proteine max (g)</label><input id="t_pMax" type="number" value="${t.proteinMax}" /></div>
          <div class="field"><label for="t_fMin">Grassi min (g)</label><input id="t_fMin" type="number" value="${t.fatMin}" /></div>
          <div class="field"><label for="t_fMax">Grassi max (g)</label><input id="t_fMax" type="number" value="${t.fatMax}" /></div>
          <div class="field"><label for="t_creatine">Creatina (g)</label><input id="t_creatine" type="number" step="0.5" value="${t.creatineG}" /></div>
          <div class="field"><label for="t_water">Acqua obiettivo (ml)</label><input id="t_water" type="number" step="50" value="${t.waterMlGoal}" /></div>
          <div class="field"><label for="t_veg">Verdura obiettivo (porz.)</label><input id="t_veg" type="number" value="${t.vegPortionsGoal}" /></div>
          <div class="field"><label for="t_fruit">Frutta obiettivo (porz.)</label><input id="t_fruit" type="number" value="${t.fruitPortionsGoal}" /></div>
        </form>
        <button class="btn btn-primary" type="submit" form="targetsForm" style="margin-top:var(--space-3)">Salva target</button>
      </section>

      <section class="panel privacy-box" style="margin-top:var(--space-4)">
        <strong>Privacy</strong>
        <p style="margin-top:.4rem">I dati restano su questo browser finché non esporti o cancelli i dati. GitHub Pages non riceve i tuoi log: non c'è backend, non c'è account, non c'è sincronizzazione automatica tra dispositivi.</p>
      </section>

      <section class="panel card" style="margin-top:var(--space-4)">
        <div class="card-title">Backup</div>
        <div class="settings-actions">
          <button class="btn" type="button" id="exportBtn">⬇️ Esporta dati (JSON)</button>
          <label class="btn" for="importInput" style="cursor:pointer">⬆️ Importa dati
            <input type="file" id="importInput" accept="application/json" style="position:absolute;width:1px;height:1px;opacity:0" />
          </label>
          <button class="btn" type="button" id="demoBtn">🧪 Ripristina demo</button>
        </div>
      </section>

      <section class="panel card danger-zone" style="margin-top:var(--space-4)">
        <div class="card-title">Zona pericolosa</div>
        <button class="btn btn-danger btn-block" type="button" id="wipeBtn">🗑️ Cancella tutti i dati locali</button>
      </section>
    `;

    wire(container);
  };

  function wire(container) {
    container.querySelector('#profileForm').addEventListener('submit', (e) => {
      e.preventDefault();
      window.Store.update((s) => {
        s.profile.heightCm = Number(container.querySelector('#s_height').value) || s.profile.heightCm;
        s.profile.weightStartKg = Number(container.querySelector('#s_weight').value) || s.profile.weightStartKg;
        s.profile.bfStartPct = Number(container.querySelector('#s_bf').value) || s.profile.bfStartPct;
        s.profile.waistStartCm = Number(container.querySelector('#s_waist').value) || s.profile.waistStartCm;
        s.profile.neckStartCm = Number(container.querySelector('#s_neck').value) || s.profile.neckStartCm;
        s.profile.goalBfMinPct = Number(container.querySelector('#s_goalMin').value) || s.profile.goalBfMinPct;
        s.profile.goalBfMaxPct = Number(container.querySelector('#s_goalMax').value) || s.profile.goalBfMaxPct;
      });
      window.UI.toast('Profilo aggiornato.', 'success');
    });

    container.querySelector('#soundToggle').addEventListener('change', (e) => {
      window.Store.update((s) => { s.settings.soundEnabled = e.target.checked; });
    });
    container.querySelector('#boxingTodayToggleSettings').addEventListener('change', (e) => {
      window.Store.update((s) => { s.settings.boxingToday = e.target.checked; });
      window.App.syncBoxingToggle();
    });

    container.querySelector('#targetsForm').addEventListener('submit', (e) => {
      e.preventDefault();
      window.Store.update((s) => {
        const t = s.settings.nutritionTargets;
        t.proteinMin = Number(container.querySelector('#t_pMin').value) || t.proteinMin;
        t.proteinMax = Number(container.querySelector('#t_pMax').value) || t.proteinMax;
        t.fatMin = Number(container.querySelector('#t_fMin').value) || t.fatMin;
        t.fatMax = Number(container.querySelector('#t_fMax').value) || t.fatMax;
        t.creatineG = Number(container.querySelector('#t_creatine').value) || t.creatineG;
        t.waterMlGoal = Number(container.querySelector('#t_water').value) || t.waterMlGoal;
        t.vegPortionsGoal = Number(container.querySelector('#t_veg').value) || t.vegPortionsGoal;
        t.fruitPortionsGoal = Number(container.querySelector('#t_fruit').value) || t.fruitPortionsGoal;
      });
      window.UI.toast('Target nutrizionali aggiornati.', 'success');
    });

    container.querySelector('#exportBtn').addEventListener('click', () => {
      const data = window.Store.exportData();
      const stamp = U.todayISO();
      U.downloadJSON(`road-to-boxing-backup-${stamp}.json`, data);
      window.UI.toast('Backup scaricato.', 'success');
    });

    container.querySelector('#importInput').addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      e.target.value = '';
      if (!file) return;
      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        const ok = await window.UI.confirmDialog({
          title: 'Importare questi dati?',
          message: 'I dati attuali salvati su questo browser verranno sostituiti da quelli del file importato.',
          confirmLabel: 'Importa e sostituisci',
          danger: true,
        });
        if (!ok) return;
        window.Store.importData(parsed);
        window.UI.toast('Dati importati correttamente.', 'success');
        window.App.refreshAll();
      } catch (err) {
        window.UI.toast('File non valido: impossibile importare.', 'warning');
      }
    });

    container.querySelector('#demoBtn').addEventListener('click', async () => {
      const ok = await window.UI.confirmDialog({
        title: 'Ripristinare i dati demo?',
        message: 'I dati attuali verranno sostituiti con dati di esempio, utili per esplorare l\'app.',
        confirmLabel: 'Ripristina demo',
        danger: true,
      });
      if (!ok) return;
      window.Store.loadDemo();
      window.UI.toast('Dati demo caricati.', 'success');
      window.App.refreshAll();
    });

    container.querySelector('#wipeBtn').addEventListener('click', async () => {
      const first = await window.UI.confirmDialog({
        title: 'Cancellare tutti i dati locali?',
        message: 'Allenamenti, nutrizione, progressi e impostazioni verranno cancellati da questo browser. L\'azione non è reversibile.',
        confirmLabel: 'Continua',
        danger: true,
      });
      if (!first) return;
      const second = await window.UI.confirmDialog({
        title: 'Sei davvero sicuro?',
        message: 'Ultima conferma: tutti i dati salvati su questo dispositivo andranno persi per sempre, a meno che tu non abbia esportato un backup.',
        confirmLabel: 'Sì, cancella tutto',
        danger: true,
      });
      if (!second) return;
      window.Store.resetAll();
      window.UI.toast('Dati locali cancellati.', 'success');
      window.App.refreshAll();
    });
  }

  window.Settings = { render };
})();
