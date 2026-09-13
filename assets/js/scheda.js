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
  let forzaSub = 'a'; // 'a' | 'b' — sotto-sessione forza selezionata

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

  // Icone minimali inline (fallback visivo quando non c'è un'immagine locale).
  // Puramente decorative: il nome dell'esercizio è già accessibile come testo,
  // ma aggiungiamo comunque un'etichetta nascosta per screen reader.
  const CATEGORY_ICONS = {
    trazione: '<path d="M12 3v12m0 0-4-4m4 4 4-4M6 19h12" />',
    spinta: '<path d="M12 21V9m0 0 4 4m-4-4-4 4M6 5h12" />',
    gambe: '<path d="M8 3v6l-3 12h3l2-8 2 8h3L12 9V3" />',
    skill: '<path d="M12 3v6m0 0L6 21m6-12 6 12M4 21h16" />',
    core: '<circle cx="12" cy="12" r="4" /><path d="M12 3v5m0 8v5m9-9h-5M8 12H3" />'
  };
  const CATEGORY_LABELS = {
    trazione: 'Pattern: trazione',
    spinta: 'Pattern: spinta',
    gambe: 'Pattern: gambe',
    skill: 'Pattern: skill/equilibrio',
    core: 'Pattern: core'
  };

  function exerciseVisual(ex) {
    if (ex.immagine && ex.immagine.src) {
      const alt = ex.immagine.alt || ex.nome;
      return `<img src="${esc(ex.immagine.src)}" alt="${esc(alt)}" loading="lazy" class="w-9 h-9 rounded-box object-cover flex-shrink-0" />`;
    }
    const cat = ex.categoria && CATEGORY_ICONS[ex.categoria] ? ex.categoria : null;
    if (!cat) return '';
    return `
      <span class="w-9 h-9 rounded-box bg-base-300/60 flex items-center justify-center flex-shrink-0" aria-hidden="true">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5 opacity-70">${CATEGORY_ICONS[cat]}</svg>
      </span>
      <span class="sr-only">${esc(CATEGORY_LABELS[cat])}</span>`;
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
    if (ex.nota_importante) extra += `<div class="alert alert-info py-2 px-3 mt-2 text-sm"><span><strong>Nota:</strong> ${esc(ex.nota_importante)}</span></div>`;
    if (ex.attenzione) extra += `<div class="alert alert-warning py-2 px-3 mt-2 text-sm"><span>⚠️ ${esc(ex.attenzione)}</span></div>`;
    if (ex.progressione) extra += `<p class="mt-2 text-sm opacity-70"><strong>Progressione:</strong> ${esc(ex.progressione)}</p>`;

    return `
      <div class="collapse collapse-arrow bg-base-200/60 border border-base-300 rounded-box">
        <input type="checkbox" aria-label="Dettagli ${esc(ex.nome)}" />
        <div class="collapse-title font-semibold flex flex-wrap items-center gap-2 pr-10">
          ${exerciseVisual(ex)}
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

  // Supporta sia il vecchio formato core.esercizi[].{recupero,tecnica} per-esercizio,
  // sia il nuovo formato con recupero/tecnica condivisi a livello di blocco (giri, recupero_esercizi, recupero_giri).
  function coreCard(core) {
    if (!core) return '';
    const giriLabel = core.giri ? `${core.giri} giri` : '';
    return `
      <div class="card bg-base-200/60 border border-base-300 mt-4">
        <div class="card-body p-4">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <h4 class="card-title text-base">${esc(core.titolo)}</h4>
            ${giriLabel ? badge(giriLabel, 'badge-primary') : ''}
          </div>
          <div class="grid gap-2 sm:grid-cols-3">
            ${core.esercizi.map((e) => `
              <div class="rounded-box bg-base-100/60 border border-base-300 p-3">
                <p class="font-semibold text-sm">${esc(e.nome)}</p>
                <p class="text-sm opacity-80">${esc(e.dettaglio)}</p>
                ${e.recupero ? `<p class="text-xs opacity-60 mt-1">Recupero: ${esc(e.recupero)}</p>` : ''}
                ${e.tecnica ? `<p class="text-xs opacity-60 mt-1">${esc(e.tecnica)}</p>` : ''}
              </div>`).join('')}
            ${core.opzione_avanzata ? `
              <div class="rounded-box bg-base-100/40 border border-dashed border-base-300 p-3">
                <p class="font-semibold text-sm">${esc(core.opzione_avanzata.nome)} <span class="opacity-60 font-normal">(opzione avanzata)</span></p>
                <p class="text-sm opacity-80">${esc(core.opzione_avanzata.dettaglio)}</p>
                <p class="text-xs opacity-60 mt-1">${esc(core.opzione_avanzata.condizione)}</p>
              </div>` : ''}
          </div>
          ${(core.recupero_esercizi || core.recupero_giri) ? `<p class="text-xs opacity-60 mt-3">Recupero: ${[core.recupero_esercizi, core.recupero_giri].filter(Boolean).map(esc).join(' · ')}</p>` : ''}
          ${core.tecnica ? `<p class="text-xs opacity-70 mt-1">${esc(core.tecnica)}</p>` : ''}
          ${core.nota_sicurezza ? `<p class="text-xs opacity-70 mt-3">⚠️ ${esc(core.nota_sicurezza)}</p>` : ''}
          ${core.regressione ? `<p class="text-xs opacity-70 mt-1">↩️ ${esc(core.regressione)}</p>` : ''}
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

  function warmupCard(w) {
    if (!w) return '';
    const items = Array.isArray(w) ? w : w.esercizi;
    const title = Array.isArray(w) ? 'Riscaldamento' : (w.titolo || 'Riscaldamento');
    const durata = Array.isArray(w) ? '' : w.durata;
    return `
      <details class="mt-2">
        <summary class="cursor-pointer text-sm font-semibold opacity-80">${esc(title)}${durata ? ` · ${esc(durata)}` : ''}</summary>
        ${noteList(items)}
      </details>`;
  }

  function subSessionCard(sub) {
    return `
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h4 class="card-title">${esc(sub.titolo)}</h4>
        <span class="badge badge-secondary">${esc((sub.giorni || []).join(' / '))} · ${esc(sub.durata)}</span>
      </div>
      <p class="opacity-70 text-sm">${esc(sub.obiettivo)}</p>
      <div class="grid gap-3 mt-4">
        ${sub.esercizi.map(exerciseCard).join('')}
      </div>
      ${coreCard(sub.core)}`;
  }

  function renderForza(data) {
    const s = data.sessioni.forza;

    // Formato legacy (singola sessione forza piatta): fallback di retrocompatibilità.
    if (!s.sessione_a && s.esercizi) {
      return `
        <div class="card bg-base-100 border border-base-300 shadow-md">
          <div class="card-body p-4 sm:p-6">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <h4 class="card-title">${esc(s.titolo)}</h4>
              <span class="badge badge-secondary">${esc((s.giorni || []).join(' / '))} · ${esc(s.durata)}</span>
            </div>
            <p class="opacity-70 text-sm">${esc(s.obiettivo)}</p>
            ${warmupCard(s.riscaldamento)}
            ${potenzaExtraCard(s.potenza_extra)}
            <div class="grid gap-3 mt-4">
              ${s.esercizi.map(exerciseCard).join('')}
            </div>
            ${coreCard(s.core)}
          </div>
        </div>`;
    }

    const activeSub = forzaSub === 'b' ? s.sessione_b : s.sessione_a;

    return `
      <div class="card bg-base-100 border border-base-300 shadow-md">
        <div class="card-body p-4 sm:p-6">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <h4 class="card-title">${esc(s.titolo)}</h4>
          </div>
          <p class="opacity-70 text-sm">${esc(s.obiettivo)}</p>
          ${warmupCard(s.riscaldamento)}
          <div class="tabs tabs-boxed justify-center my-4 flex-wrap" role="tablist" aria-label="Sessione forza">
            <button class="tab ${forzaSub === 'a' ? 'tab-active' : ''}" data-forza-sub="a" type="button" role="tab" aria-selected="${forzaSub === 'a'}">Sessione A</button>
            <button class="tab ${forzaSub === 'b' ? 'tab-active' : ''}" data-forza-sub="b" type="button" role="tab" aria-selected="${forzaSub === 'b'}">Sessione B</button>
          </div>
          ${subSessionCard(activeSub)}
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

  // Tab Sessione A/B: delegazione sull'elemento contenitore, perché il markup
  // viene rigenerato ad ogni render() (a differenza dei tab esterni, fissi nell'HTML).
  if (detailEl) {
    detailEl.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-forza-sub]');
      if (!btn) return;
      forzaSub = btn.dataset.forzaSub;
      render();
    });
  }

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
