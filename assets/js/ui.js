/* ============================================================
   HELPER UI CONDIVISI: toast e dialog di conferma nativo.
   Nessun popup invasivo: i toast si auto-chiudono, i dialog
   nativi <dialog> gestiscono focus trap e tasto Esc da soli.
   ============================================================ */
(() => {
  'use strict';

  const stack = () => document.getElementById('toastStack');

  const toast = (message, type = 'default', duration = 3200) => {
    const host = stack();
    if (!host) return;
    const el = document.createElement('div');
    el.className = `toast${type !== 'default' ? ` ${type}` : ''}`;
    el.textContent = message;
    host.appendChild(el);
    setTimeout(() => { el.remove(); }, duration);
  };

  // Ritorna una Promise<boolean> risolta con true se l'utente conferma.
  const confirmDialog = ({ title, message, confirmLabel = 'Conferma', cancelLabel = 'Annulla', danger = false }) => new Promise((resolve) => {
    const dlg = document.createElement('dialog');
    dlg.className = 'confirm-dialog';
    dlg.innerHTML = `
      <h3>${window.Utils.escapeHtml(title)}</h3>
      <p>${window.Utils.escapeHtml(message)}</p>
      <div class="dialog-actions">
        <button type="button" class="btn" data-action="cancel">${window.Utils.escapeHtml(cancelLabel)}</button>
        <button type="button" class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-action="confirm">${window.Utils.escapeHtml(confirmLabel)}</button>
      </div>`;
    document.body.appendChild(dlg);
    const cleanup = (result) => {
      dlg.close();
      dlg.remove();
      resolve(result);
    };
    dlg.querySelector('[data-action="cancel"]').addEventListener('click', () => cleanup(false));
    dlg.querySelector('[data-action="confirm"]').addEventListener('click', () => cleanup(true));
    dlg.addEventListener('cancel', () => cleanup(false));
    dlg.showModal();
  });

  window.UI = { toast, confirmDialog };
})();
