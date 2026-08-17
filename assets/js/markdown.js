/* ============================================================
   RENDERER MARKDOWN MINIMALE E SICURO
   Supporta: intestazioni, grassetto/corsivo, link, liste,
   tabelle e blocchi di codice. Tutto il testo viene prima
   sottoposto a escape HTML, poi vengono applicate solo
   trasformazioni note: nessun innerHTML da input non controllato.
   ============================================================ */
(() => {
  'use strict';

  const esc = (s) => window.Utils.escapeHtml(s);

  const inlineFormat = (raw) => {
    let out = esc(raw);
    out = out.replace(/\[([^\]]+)\]\((https?:[^\s)]+)\)/g, (m, txt, url) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${txt}</a>`);
    out = out.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    out = out.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
    return out;
  };

  const isTableSeparator = (line) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(line || '');

  const splitTableRow = (line) => line.split('|').map((c) => c.trim()).filter((c, idx, arr) => !((idx === 0 || idx === arr.length - 1) && c === ''));

  const renderMarkdown = (md) => {
    const lines = String(md || '').replace(/\r\n/g, '\n').split('\n');
    let html = '';
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      if (!line.trim()) { i += 1; continue; }

      const heading = line.match(/^(#{1,4})\s+(.*)$/);
      if (heading) {
        const level = Math.min(heading[1].length + 1, 5);
        html += `<h${level}>${inlineFormat(heading[2])}</h${level}>`;
        i += 1; continue;
      }

      if (line.trim().startsWith('```')) {
        i += 1;
        const code = [];
        while (i < lines.length && !lines[i].trim().startsWith('```')) { code.push(lines[i]); i += 1; }
        i += 1;
        html += `<pre class="md-code">${esc(code.join('\n'))}</pre>`;
        continue;
      }

      if (line.includes('|') && isTableSeparator(lines[i + 1])) {
        const header = splitTableRow(line);
        i += 2;
        const rows = [];
        while (i < lines.length && lines[i].includes('|') && lines[i].trim()) {
          rows.push(splitTableRow(lines[i]));
          i += 1;
        }
        html += `<div class="md-table-wrap"><table class="md-table"><thead><tr>${
          header.map((c) => `<th>${inlineFormat(c)}</th>`).join('')
        }</tr></thead><tbody>${
          rows.map((r) => `<tr>${r.map((c) => `<td>${inlineFormat(c)}</td>`).join('')}</tr>`).join('')
        }</tbody></table></div>`;
        continue;
      }

      if (/^[-*]\s+/.test(line)) {
        const items = [];
        while (i < lines.length && /^[-*]\s+/.test(lines[i])) { items.push(lines[i].replace(/^[-*]\s+/, '')); i += 1; }
        html += `<ul>${items.map((it) => `<li>${inlineFormat(it)}</li>`).join('')}</ul>`;
        continue;
      }

      if (/^\d+\.\s+/.test(line)) {
        const items = [];
        while (i < lines.length && /^\d+\.\s+/.test(lines[i])) { items.push(lines[i].replace(/^\d+\.\s+/, '')); i += 1; }
        html += `<ol>${items.map((it) => `<li>${inlineFormat(it)}</li>`).join('')}</ol>`;
        continue;
      }

      const paraLines = [];
      while (
        i < lines.length && lines[i].trim()
        && !/^(#{1,4})\s+/.test(lines[i]) && !/^[-*]\s+/.test(lines[i])
        && !/^\d+\.\s+/.test(lines[i]) && !lines[i].trim().startsWith('```')
        && !(lines[i].includes('|') && isTableSeparator(lines[i + 1]))
      ) { paraLines.push(lines[i]); i += 1; }

      if (paraLines.length) html += `<p>${inlineFormat(paraLines.join(' '))}</p>`;
      else i += 1;
    }

    return html;
  };

  const searchDocs = (docs, query) => {
    const q = String(query || '').trim().toLowerCase();
    if (!q) return docs.map((doc) => ({ doc, snippet: null }));
    return docs
      .filter((doc) => doc.title.toLowerCase().includes(q) || doc.content.toLowerCase().includes(q))
      .map((doc) => {
        const idx = doc.content.toLowerCase().indexOf(q);
        let snippet = null;
        if (idx >= 0) {
          const start = Math.max(0, idx - 60);
          const end = Math.min(doc.content.length, idx + q.length + 60);
          snippet = `${start > 0 ? '…' : ''}${doc.content.slice(start, end).replace(/\n/g, ' ')}${end < doc.content.length ? '…' : ''}`;
        }
        return { doc, snippet };
      });
  };

  window.MarkdownUtil = { render: renderMarkdown, search: searchDocs };
})();
