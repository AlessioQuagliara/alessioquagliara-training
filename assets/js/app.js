(() => {
  'use strict';

  /* ---------- Helpers ---------- */

  // Escape del testo per inserimento sicuro in innerHTML.
  const escapeHtml = (str) => String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Testo delle note: escape + supporto per **grassetto**.
  const formatNotes = (text) => escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Link "Esempio" verso la ricerca immagini, generato dal nome esercizio.
  const exampleUrl = (name) => {
    const q = encodeURIComponent(name + ' esercizio esecuzione').replace(/%20/g, '+');
    return `https://www.google.com/search?udm=2&q=${q}`;
  };

  /* ---------- Rendering ---------- */

  const renderExercise = (ex) => {
    const actions = [];
    if (ex.rest != null) {
      const label = ex.restLabel || `${ex.rest} sec`;
      actions.push(`<button class="mini-btn" type="button" data-rest="${ex.rest}">Avvia ${escapeHtml(label)}</button>`);
    }
    if (ex.example) {
      actions.push(`<a class="mini-btn mini-link" href="${exampleUrl(ex.name)}" target="_blank" rel="noopener">📷 Esempio</a>`);
    }
    return `
      <li class="exercise">
        <div class="exercise-top">
          <div class="exercise-name">${escapeHtml(ex.name)}</div>
          <div class="exercise-meta">${escapeHtml(ex.meta)}</div>
        </div>
        <div class="exercise-notes">${formatNotes(ex.notes)}</div>
        <div class="mini-actions">${actions.join('')}</div>
      </li>`;
  };

  const renderBlock = (block) => `
    <div class="block">
      <h4><span class="block-dot"></span> ${escapeHtml(block.title)}</h4>
      <ul>${block.exercises.map(renderExercise).join('')}</ul>
    </div>`;

  const renderDay = (day) => `
    <section class="day-card panel day-${escapeHtml(day.variant)}">
      <div class="day-head">
        <div class="day-title-wrap">
          <span class="day-kicker">${escapeHtml(day.kicker)}</span>
          <h3>${escapeHtml(day.title)}</h3>
          <p>${escapeHtml(day.description)}</p>
        </div>
        <div class="day-tags">${day.tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</div>
      </div>
      <div class="day-body">
        <div class="block-grid">${day.blocks.map(renderBlock).join('')}</div>
      </div>
    </section>`;

  const renderHero = (hero) => {
    const cards = hero.summary
      .map((c) => `<div class="summary-card"><strong>${escapeHtml(c.value)}</strong><span>${escapeHtml(c.label)}</span></div>`)
      .join('');
    return `
      <div class="eyebrow">${escapeHtml(hero.eyebrow)}</div>
      <h2>${escapeHtml(hero.heading)}</h2>
      <p>${escapeHtml(hero.description)}</p>
      <div class="summary-grid">${cards}</div>`;
  };

  const renderNotes = (notes) => notes
    .map((n) => `
      <article class="note-box panel">
        <h4>${escapeHtml(n.title)}</h4>
        <ul>${n.items.map((i) => `<li>${escapeHtml(i)}</li>`).join('')}</ul>
      </article>`)
    .join('');

  const renderContent = (data) => {
    if (data.meta && data.meta.pageTitle) document.title = data.meta.pageTitle;
    document.getElementById('heroMain').innerHTML = renderHero(data.hero);
    document.getElementById('days').innerHTML = data.days.map(renderDay).join('');
    document.getElementById('notes').innerHTML = renderNotes(data.notes);
    document.getElementById('footerNote').textContent = data.footerNote;
  };

  /* ---------- Tema (chiaro/scuro) ---------- */

  const initTheme = () => {
    const root = document.documentElement;
    const themeToggle = document.querySelector('[data-theme-toggle]');
    let theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    root.setAttribute('data-theme', theme);

    const renderThemeIcon = () => {
      const dark = root.getAttribute('data-theme') === 'dark';
      themeToggle.innerHTML = dark
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="5"></circle><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"></path></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>';
      themeToggle.setAttribute('aria-label', dark ? 'Passa alla modalità chiara' : 'Passa alla modalità scura');
    };

    renderThemeIcon();
    themeToggle.addEventListener('click', () => {
      theme = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', theme);
      renderThemeIcon();
    });
  };

  /* ---------- Timer recupero ---------- */

  // Ritorna una funzione runRest(secs) usata dai pulsanti dentro gli esercizi.
  const initTimer = () => {
    const timerDisplay = document.getElementById('timerDisplay');
    const timerHint = document.getElementById('timerHint');
    const timerStatus = document.getElementById('timerStatus');
    const startPauseBtn = document.getElementById('startPauseBtn');
    const resetBtn = document.getElementById('resetBtn');
    const presetButtons = [...document.querySelectorAll('[data-preset]')];

    let selectedSeconds = 60;
    let remainingSeconds = selectedSeconds;
    let intervalId = null;
    let isRunning = false;

    const formatTime = (secs) => {
      const min = Math.floor(secs / 60).toString().padStart(2, '0');
      const sec = (secs % 60).toString().padStart(2, '0');
      return `${min}:${sec}`;
    };

    const beep = () => {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 880;
        gain.gain.value = 0.06;
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      } catch (e) {}
    };

    const updateTimerUI = () => {
      timerDisplay.textContent = formatTime(remainingSeconds);
      timerHint.textContent = `Preset attuale: ${selectedSeconds} secondi`;
      startPauseBtn.textContent = isRunning ? 'Pausa' : 'Avvia';
    };

    const clearTimer = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
      isRunning = false;
    };

    const resetTimer = (toSelected = true) => {
      clearTimer();
      remainingSeconds = toSelected ? selectedSeconds : remainingSeconds;
      timerStatus.textContent = 'Pronto al recupero.';
      updateTimerUI();
    };

    const startTimer = () => {
      if (isRunning) return;
      isRunning = true;
      timerStatus.textContent = 'Recupero in corso…';
      updateTimerUI();
      intervalId = setInterval(() => {
        remainingSeconds -= 1;
        updateTimerUI();
        if (remainingSeconds <= 0) {
          clearTimer();
          remainingSeconds = 0;
          updateTimerUI();
          timerStatus.textContent = 'Recupero finito. Riparti.';
          beep();
        }
      }, 1000);
    };

    const pauseTimer = () => {
      clearTimer();
      timerStatus.textContent = 'Timer in pausa.';
      updateTimerUI();
    };

    presetButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        presetButtons.forEach((b) => b.removeAttribute('data-active'));
        btn.setAttribute('data-active', 'true');
        selectedSeconds = Number(btn.dataset.preset);
        remainingSeconds = selectedSeconds;
        clearTimer();
        timerStatus.textContent = `Preset impostato su ${selectedSeconds} secondi.`;
        updateTimerUI();
      });
    });

    startPauseBtn.addEventListener('click', () => {
      if (isRunning) pauseTimer();
      else startTimer();
    });

    resetBtn.addEventListener('click', () => {
      resetTimer(true);
    });

    updateTimerUI();

    // Avvia un recupero rapido dai pulsanti degli esercizi.
    return (secs) => {
      selectedSeconds = secs;
      remainingSeconds = secs;
      presetButtons.forEach((b) => {
        if (Number(b.dataset.preset) === secs) b.setAttribute('data-active', 'true');
        else b.removeAttribute('data-active');
      });
      timerStatus.textContent = `Recupero rapido impostato su ${secs} secondi.`;
      updateTimerUI();
      startTimer();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
  };

  /* ---------- Interazioni sui contenuti generati ---------- */

  const wireContentInteractions = (runRest) => {
    // Pulsanti "Avvia X" dentro gli esercizi.
    document.querySelectorAll('[data-rest]').forEach((btn) => {
      btn.addEventListener('click', () => runRest(Number(btn.dataset.rest)));
    });

    // Apri tutto / chiudi blocchi.
    const blocks = [...document.querySelectorAll('.block')];
    document.getElementById('collapseAllBtn').addEventListener('click', () => {
      blocks.forEach((block) => {
        const list = block.querySelector('ul');
        if (list) list.style.display = 'none';
      });
    });
    document.getElementById('expandAllBtn').addEventListener('click', () => {
      blocks.forEach((block) => {
        const list = block.querySelector('ul');
        if (list) list.style.display = 'grid';
      });
    });

    // Toggle del singolo blocco cliccando sul titolo.
    document.querySelectorAll('.block h4').forEach((title) => {
      title.style.cursor = 'pointer';
      title.setAttribute('tabindex', '0');
      title.setAttribute('role', 'button');
      const toggle = () => {
        const list = title.parentElement.querySelector('ul');
        if (!list) return;
        list.style.display = list.style.display === 'none' ? 'grid' : 'none';
      };
      title.addEventListener('click', toggle);
      title.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggle();
        }
      });
    });
  };

  const showError = () => {
    const target = document.getElementById('days');
    if (target) {
      target.innerHTML = `
        <div class="day-card panel data-error">
          <h3>Impossibile caricare la scheda</h3>
          <p>Controlla la connessione e riprova. Se apri il file direttamente dal disco, avvia un server locale (vedi README).</p>
        </div>`;
    }
  };

  /* ---------- Avvio ---------- */

  initTheme();
  const runRest = initTimer();

  fetch('assets/data/training-plan.json')
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then((data) => {
      renderContent(data);
      wireContentInteractions(runRest);
    })
    .catch((err) => {
      console.error('Errore nel caricamento di training-plan.json:', err);
      showError();
    });
})();
