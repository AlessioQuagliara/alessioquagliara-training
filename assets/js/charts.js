/* ============================================================
   MINI GRAFICI CANVAS VANILLA (nessuna libreria esterna)
   Grafico a linee leggero, per trend (peso, vita, ecc.).
   Ogni serie viene normalizzata sul proprio min/max cosi
   restano leggibili anche scale molto diverse tra loro.
   ============================================================ */
(() => {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';

  /**
   * Disegna un grafico a linee dentro un <canvas>.
   * @param {HTMLCanvasElement} canvas
   * @param {{label:string, color:string, points:{date:string, value:number}[]}[]} seriesList
   * @param {{heightCss?:number}} opts
   */
  const drawLineChart = (canvas, seriesList, opts = {}) => {
    const heightCss = opts.heightCss || 170;
    const dpr = window.devicePixelRatio || 1;
    const cssWidth = Math.max(canvas.parentElement ? canvas.parentElement.clientWidth : canvas.clientWidth, 220);
    canvas.style.width = '100%';
    canvas.style.height = `${heightCss}px`;
    canvas.width = Math.round(cssWidth * dpr);
    canvas.height = Math.round(heightCss * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssWidth, heightCss);

    const pad = { top: 14, right: 12, bottom: 22, left: 12 };
    const plotW = cssWidth - pad.left - pad.right;
    const plotH = heightCss - pad.top - pad.bottom;

    const usable = seriesList.filter((s) => s.points && s.points.length > 0);
    if (usable.length === 0) {
      ctx.fillStyle = 'rgba(210,205,196,0.55)';
      ctx.font = '13px system-ui, sans-serif';
      ctx.fillText('Nessun dato ancora: aggiungi una misurazione.', pad.left, heightCss / 2);
      return;
    }

    // Griglia orizzontale leggera
    ctx.strokeStyle = 'rgba(210,205,196,0.14)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 3; i += 1) {
      const y = pad.top + (plotH / 3) * i;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(cssWidth - pad.right, y);
      ctx.stroke();
    }

    usable.forEach((series) => {
      const vals = series.points.map((p) => p.value);
      const min = Math.min(...vals);
      const max = Math.max(...vals);
      const range = max - min || 1;
      const n = series.points.length;
      const stepX = n > 1 ? plotW / (n - 1) : 0;

      ctx.beginPath();
      series.points.forEach((p, i) => {
        const x = pad.left + stepX * i;
        const t = (p.value - min) / range;
        const y = pad.top + plotH - t * plotH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = series.color || '#c8502f';
      ctx.lineWidth = 2.25;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.stroke();

      // Area leggera sotto la linea
      const lastX = pad.left + stepX * (n - 1);
      ctx.lineTo(lastX, pad.top + plotH);
      ctx.lineTo(pad.left, pad.top + plotH);
      ctx.closePath();
      ctx.fillStyle = `${series.color || '#c8502f'}1a`;
      ctx.fill();

      // Punto finale evidenziato
      const lastPoint = series.points[n - 1];
      const lastT = (lastPoint.value - min) / range;
      const lastY = pad.top + plotH - lastT * plotH;
      ctx.beginPath();
      ctx.arc(lastX, lastY, 3.2, 0, Math.PI * 2);
      ctx.fillStyle = series.color || '#c8502f';
      ctx.fill();
    });

    // Etichette prima/ultima data sull'asse x, dalla prima serie disponibile
    const ref = usable[0];
    ctx.fillStyle = 'rgba(210,205,196,0.55)';
    ctx.font = '11px system-ui, sans-serif';
    const firstLabel = window.Utils.formatDateShortIt(ref.points[0].date);
    const lastLabel = window.Utils.formatDateShortIt(ref.points[ref.points.length - 1].date);
    ctx.textAlign = 'left';
    ctx.fillText(firstLabel, pad.left, heightCss - 4);
    ctx.textAlign = 'right';
    ctx.fillText(lastLabel, cssWidth - pad.right, heightCss - 4);
  };

  window.Charts = { drawLineChart };
})();
