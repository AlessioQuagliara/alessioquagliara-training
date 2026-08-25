// ============================================================
// BOXER ENGINE - Scheda di allenamento (dati in assets/data/scheda.json)
// Legge il JSON e disegna la scheda con componenti DaisyUI.
// Nessuna dipendenza, nessuno storage, nessun tracking.
// ============================================================
(function () {
  'use strict';

  const root = document.getElementById('scheda-app');
  if (!root) return;

  const detailEl = document.getElementById('sessionDetail');
  const modeTabs = document.getElementById('modeTabs');
  const sessionTabs = document.getElementById('sessionTabs');

  let schedaData = null;
  let mode = 'base';
  let session = 'forza';

  const esc = (str) => String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  function badge(text, cls) {
    return `<span class="badge ${cls || 'badge-outline'} badge-sm">${esc(text)}</span>`;
  }

  function noteList(items) {
    if (!items || !items.length) return '';
    return `<ul class="list-disc list-inside space-y-1 opacity-80">${items.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>`;
  }

  function variantAlert(text, kind) {
    if (!text) return '';
    const label = kind === 'rientro' ? 'Rientro' : 'Potenza';
    const alertCls = kind === 'rientro' ? 'alert-info' : 'alert-warning';
    return `<div class="alert ${alertCls} py-2 px-3 mt-2 text-sm"><span><strong>${label}:</strong> ${esc(text)}</span></div>`;
  }

  function exerciseCard(ex) {
    const chips = [
      badge(ex.serie_ripetizioni, 'badge-primary'),
      ex.recupero ? badge(ex.recupero) : '',
      ex.intensita ? badge(ex.intensita) : '',
    ].join(' ');

    let extra = '';
    if (mode === 'rientro' && ex.rientro) extra += variantAlert(ex.rientro, 'rientro');
    if (mode === 'potenza' && ex.potenza) extra += variantAlert(ex.potenza, 'potenza');
    if (ex.alternativa) extra += `<p class="mt-2 text-sm opacity-70"><strong>Alternativa:</strong> ${esc(ex.alternativa)}</p>`;
    if (ex.attenzione) extra += `<div class="alert alert-warning py-2 px-3 mt-2 text-sm"><span>⚠️ ${esc(ex.attenzione)}</span></div>`;

    return `
      <div class="collapse collapse-arrow bg-base-200/60 border border-base-300 rounded-box">
        <input type="checkbox" aria-label="Dettagli ${esc(ex.nome)}" />
        <div class="collapse-title font-semibold flex flex-wrap items-center gap-2 pr-10">
          <span>${esc(ex.nome)}</span>
          <span class="flex flex-wrap gap-1">${chips}</span>
        </div>
        <div class="collapse-content text-sm">
          ${noteList(ex.note)}
          ${extra}
        </div>
      </div>`;
  }

  function roundList(rounds) {
    if (!rounds || !rounds.length) return '';
    return `<div class="grid gap-2 mt-2">${rounds.map((r) => `
      <div class="rounded-box bg-base-100/60 border border-base-300 p-3">
        <p class="font-semibold text-sm">Round ${r.numero} — ${esc(r.titolo)}</p>
        <p class="text-sm opacity-70 mt-1">${esc(r.descrizione)}</p>
      </div>`).join('')}</div>`;
  }

  function blockCard(block) {
    let extra = '';
    if (mode === 'rientro' && block.rientro) extra += variantAlert(block.rientro, 'rientro');
    if (block.nota) extra += `<p class="mt-2 text-sm opacity-70">${esc(block.nota)}</p>`;

    return `
      <div class="collapse collapse-arrow bg-base-200/60 border border-base-300 rounded-box">
        <input type="checkbox" aria-label="Dettagli ${esc(block.nome)}" />
        <div class="collapse-title font-semibold flex flex-wrap items-center gap-2 pr-10">
          <span>${esc(block.nome)}</span>
          <span class="flex flex-wrap gap-1">${badge(block.struttura, 'badge-primary')}${block.recupero ? ' ' + badge(block.recupero) : ''}${block.intensita ? ' ' + badge(block.intensita) : ''}</span>
        </div>
        <div class="collapse-content text-sm">
          ${roundList(block.round)}
          ${extra}
        </div>
      </div>`;
  }

  function coreCard(core) {
    if (!core) return '';
    return `
      <div class="card bg-base-200/60 border border-base-300 mt-4">
        <div class="card-body p-4">
          <h4 class="card-title text-base">${esc(core.titolo)}</h4>
          <div class="grid gap-2 sm:grid-cols-3">
            ${core.esercizi.map((e) => `
              <div class="rounded-box bg-base-100/60 border border-base-300 p-3">
                <p class="font-semibold text-sm">${esc(e.nome)}</p>
                <p class="text-sm opacity-80">${esc(e.dettaglio)}</p>
                <p class="text-xs opacity-60 mt-1">Recupero: ${esc(e.recupero)}</p>
                <p class="text-xs opacity-60 mt-1">${esc(e.tecnica)}</p>
              </div>`).join('')}
          </div>
          ${core.nota_sicurezza ? `<p class="text-xs opacity-70 mt-3">⚠️ ${esc(core.nota_sicurezza)}</p>` : ''}
        </div>
      </div>`;
  }

  function potenzaExtraCard(pe) {
    if (!pe || mode !== 'potenza') return '';
    return `
      <div class="alert alert-warning items-start mt-4">
        <span>
          <strong>POTENZA — ${esc(pe.titolo)}</strong><br/>
          <span class="text-sm">${pe.posizione ? esc(pe.posizione) + '<br/>' : ''}
          ${pe.serie_ripetizioni ? `${badge(pe.serie_ripetizioni, 'badge-neutral')} ${pe.recupero ? badge(pe.recupero, 'badge-neutral') : ''}<br/>` : ''}
          ${pe.struttura ? `${badge(pe.struttura, 'badge-neutral')} ${pe.recupero ? badge(pe.recupero, 'badge-neutral') : ''}<br/>` : ''}
          ${pe.tecnica ? esc(pe.tecnica) + '<br/>' : ''}
          ${pe.stop ? '<em>' + esc(pe.stop) + '</em><br/>' : ''}
          ${pe.alternativa_base ? `<strong>Se non in POTENZA:</strong> ${esc(pe.alternativa_base)}` : ''}</span>
        </span>
      </div>`;
  }

  function renderForza(data) {
    const s = data.sessioni.forza;
    return `
      <div class="card bg-base-100 border border-base-300 shadow-md">
        <div class="card-body p-4 sm:p-6">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <h4 class="card-title">${esc(s.titolo)}</h4>
            <span class="badge badge-secondary">${esc(s.giorni.join(' / '))} · ${esc(s.durata)}</span>
          </div>
          <p class="opacity-70 text-sm">${esc(s.obiettivo)}</p>
          <details class="mt-2">
            <summary class="cursor-pointer text-sm font-semibold opacity-80">Riscaldamento</summary>
            ${noteList(s.riscaldamento)}
          </details>
          ${potenzaExtraCard(s.potenza_extra)}
          <div class="grid gap-3 mt-4">
            ${s.esercizi.map(exerciseCard).join('')}
          </div>
          ${coreCard(s.core)}
        </div>
      </div>`;
  }

  function renderTecnica(data) {
    const s = data.sessioni.tecnica;
    return `
      <div class="card bg-base-100 border border-base-300 shadow-md">
        <div class="card-body p-4 sm:p-6">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <h4 class="card-title">${esc(s.titolo)}</h4>
            <span class="badge badge-secondary">${esc(s.giorni.join(' / '))} · ${esc(s.durata)}</span>
          </div>
          <p class="opacity-70 text-sm">${esc(s.obiettivo)}</p>
          <details class="mt-2">
            <summary class="cursor-pointer text-sm font-semibold opacity-80">Riscaldamento</summary>
            ${noteList(s.riscaldamento)}
          </details>
          <div class="grid gap-3 mt-4">
            ${s.blocchi.map(blockCard).join('')}
          </div>
          ${potenzaExtraCard(s.potenza_extra)}
          <div class="rounded-box bg-base-200/60 border border-base-300 p-3 mt-4 text-sm">
            <p class="font-semibold">Condizionamento opzionale</p>
            <p class="opacity-70">${esc(s.condizionamento_opzionale.descrizione)}</p>
            <p class="opacity-60 text-xs mt-1">${esc(s.condizionamento_opzionale.nota)}</p>
          </div>
        </div>
      </div>`;
  }

  function render() {
    if (!schedaData || !detailEl) return;
    detailEl.innerHTML = session === 'forza' ? renderForza(schedaData) : renderTecnica(schedaData);
  }

  function wireTabs(container, attr, onChange) {
    if (!container) return;
    container.querySelectorAll('[data-' + attr + ']').forEach((btn) => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.tab').forEach((t) => t.classList.remove('tab-active'));
        btn.classList.add('tab-active');
        onChange(btn.dataset[attr]);
        render();
      });
    });
  }

  wireTabs(modeTabs, 'mode', (v) => { mode = v; });
  wireTabs(sessionTabs, 'session', (v) => { session = v; });

  fetch('assets/data/scheda.json')
    .then((r) => {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then((data) => {
      schedaData = data;
      root.dataset.loading = 'false';
      render();
    })
    .catch(() => {
      if (detailEl) {
        detailEl.innerHTML = `<div class="alert alert-error"><span>Non è stato possibile caricare la scheda (assets/data/scheda.json). Consulta <a class="link" href="schede_allenamento_fighter.md">la versione Markdown</a>.</span></div>`;
      }
    });
})();
