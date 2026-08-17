/* ============================================================
   MODULO LIBRERIA / PIANO
   Rendering Markdown sicuro dei documenti del repository.
   Tenta un fetch live dei file .md (utile su GitHub Pages) e
   ricade in silenzio sul contenuto incorporato se il fetch non
   è disponibile (es. apertura diretta da file://).
   ============================================================ */
(() => {
  'use strict';

  const U = window.Utils;
  const { escapeHtml } = U;
  const GITHUB_BLOB_BASE = 'https://github.com/AlessioQuagliara/alessioquagliara-training/blob/main/';

  const docs = window.APP_DATA.LIBRARY_DOCS.map((d) => ({ ...d }));
  let fetched = false;
  let selectedId = docs[0].id;
  let searchQuery = '';

  const tryFetchLive = async () => {
    if (fetched) return false;
    fetched = true;
    // Sotto file:// il fetch di file locali è bloccato dal browser e logga
    // sempre un errore di rete in console, anche se lo intercettiamo: meglio
    // non tentarlo affatto e restare sul contenuto incorporato.
    if (window.location.protocol === 'file:') return false;
    let changed = false;
    await Promise.all(docs.map(async (d) => {
      try {
        const res = await fetch(d.file, { cache: 'no-store' });
        if (res.ok) {
          const text = await res.text();
          if (text && text.trim().length > 20) { d.content = text; changed = true; }
        }
      } catch (e) {
        // Atteso quando l'app gira da file:// o offline: resta il contenuto incorporato.
      }
    }));
    return changed;
  };

  const render = (container) => {
    const results = window.MarkdownUtil.search(docs, searchQuery);
    const selected = docs.find((d) => d.id === selectedId) || docs[0];

    container.innerHTML = `
      <div class="view-header"><h2>Libreria / Piano</h2><p>Consulta i documenti del piano direttamente in app, con ricerca testuale.</p></div>

      <input type="search" id="librarySearch" class="search-input" placeholder="Cerca nei documenti…" value="${escapeHtml(searchQuery)}" aria-label="Cerca nei documenti della libreria" />

      <div class="library-layout">
        <nav class="library-list" aria-label="Elenco documenti">
          ${results.length ? results.map(({ doc, snippet }) => `
            <button class="library-list-item" type="button" data-doc="${doc.id}" data-active="${doc.id === selected.id}">
              <span class="doc-title">${escapeHtml(doc.title)}</span>
              ${snippet ? `<span class="doc-snippet">…${escapeHtml(snippet)}…</span>` : ''}
            </button>`).join('') : '<p class="empty-state">Nessun documento corrisponde alla ricerca.</p>'}
        </nav>

        <article class="panel library-doc">
          <div class="library-doc-head">
            <h3>${escapeHtml(selected.title)}</h3>
            <a class="btn btn-sm" href="${GITHUB_BLOB_BASE}${selected.file}" target="_blank" rel="noopener noreferrer">Apri sorgente su GitHub ↗</a>
          </div>
          <div class="markdown-content">${window.MarkdownUtil.render(selected.content.replace(/^#\s+.*\n/, ''))}</div>
        </article>
      </div>
    `;

    container.querySelector('#librarySearch').addEventListener('input', (e) => { searchQuery = e.target.value; render(container); });
    container.querySelectorAll('[data-doc]').forEach((btn) => {
      btn.addEventListener('click', () => { selectedId = btn.dataset.doc; render(container); });
    });

    tryFetchLive().then((changed) => {
      if (changed && document.body.contains(container) && !container.closest('.view').hidden) render(container);
    });
  };

  window.Library = { render };
})();
