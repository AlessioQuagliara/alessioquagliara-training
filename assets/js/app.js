/* ============================================================
   ORCHESTRATORE APP: stato iniziale, navigazione a tab,
   collegamento tra i moduli. Nessuna dipendenza esterna.
   ============================================================ */
(() => {
  'use strict';

  window.Store.load();

  const views = {
    dashboard: window.Dashboard,
    training: window.Training,
    nutrition: window.Nutrition,
    progress: window.Progress,
    library: window.Library,
    settings: window.Settings,
  };

  let currentView = 'dashboard';

  const renderView = (name) => {
    const container = document.getElementById(`view-${name}`);
    if (!container || !views[name]) return;
    try {
      views[name].render(container);
    } catch (err) {
      console.error(`Errore nel rendering della vista "${name}":`, err);
      container.innerHTML = '<div class="panel card"><p>Si è verificato un problema nel mostrare questa sezione. Prova a ricaricare la pagina.</p></div>';
    }
  };

  const goToView = (name) => {
    if (!views[name]) return;
    document.querySelectorAll('.view').forEach((v) => { v.hidden = v.dataset.view !== name; });
    document.querySelectorAll('.tab-btn').forEach((btn) => {
      btn.setAttribute('aria-selected', String(btn.dataset.view === name));
    });
    currentView = name;
    renderView(name);
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  const syncBoxingToggle = () => {
    const s = window.Store.getState();
    const toggle = document.getElementById('boxingTodayToggle');
    if (toggle) toggle.checked = !!s.settings.boxingToday;
  };

  const refreshAll = () => {
    syncBoxingToggle();
    renderView(currentView);
  };

  const startSession = (dayKey) => {
    if (!dayKey || dayKey === 'rest') {
      window.UI.toast('Oggi è giorno di riposo: nessuna scheda pianificata.', 'default');
      return;
    }
    goToView('training');
    window.Training.startSession(dayKey);
  };

  window.App = {
    goToView, refreshAll, syncBoxingToggle, startSession,
  };

  /* ---------------- Wiring navigazione ---------------- */
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => goToView(btn.dataset.view));
  });

  const tabs = [...document.querySelectorAll('.tab-btn')];
  const tabbar = document.getElementById('mainTabs');
  tabbar.addEventListener('keydown', (e) => {
    const idx = tabs.indexOf(document.activeElement);
    if (idx === -1) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); tabs[(idx + 1) % tabs.length].focus(); }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); tabs[(idx - 1 + tabs.length) % tabs.length].focus(); }
  });

  document.getElementById('openSettingsBtn').addEventListener('click', () => goToView('settings'));

  const topToggle = document.getElementById('boxingTodayToggle');
  topToggle.addEventListener('change', () => {
    window.Store.update((s) => { s.settings.boxingToday = topToggle.checked; });
    if (currentView === 'dashboard' || currentView === 'training') renderView(currentView);
  });

  syncBoxingToggle();
  goToView('dashboard');
})();
