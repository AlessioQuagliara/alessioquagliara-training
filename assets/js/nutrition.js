/* ============================================================
   MODULO NUTRIZIONE
   Pasti spuntabili, macro stimate da database alimenti italiani,
   template per 5 tipi di giornata, piano settimanale con
   duplicazione, lista della spesa aggregata, pasti preferiti,
   tracker acqua/creatina/frutta/verdura.
   ============================================================ */
(() => {
  'use strict';

  const U = window.Utils;
  const D = window.APP_DATA;
  const { escapeHtml } = U;

  let selectedDate = U.todayISO();
  let shoppingList = null; // ultima lista della spesa generata, null finche' non richiesta

  const getAllFoods = (state) => [...D.FOODS, ...state.customFoods];
  const getFoodById = (state, id) => getAllFoods(state).find((f) => f.id === id);

  const emptyDay = () => ({
    dayType: 'forza', meals: [], waterMl: 0, creatineG: 0, fruitPortions: 0, vegPortions: 0,
  });

  const getDayEntry = (state, date) => state.nutritionDays[date] || null;

  const withDayEntry = (state, date) => {
    if (!state.nutritionDays[date]) state.nutritionDays[date] = emptyDay();
    return state.nutritionDays[date];
  };

  const macrosForItem = (state, item) => {
    const food = getFoodById(state, item.foodId);
    if (!food) return { kcal: 0, p: 0, c: 0, f: 0 };
    const factor = (Number(item.qty) || 0) / 100;
    return { kcal: food.kcal * factor, p: food.p * factor, c: food.c * factor, f: food.f * factor };
  };

  const macrosForMeal = (state, meal) => meal.items.reduce((acc, it) => {
    const m = macrosForItem(state, it);
    return { kcal: acc.kcal + m.kcal, p: acc.p + m.p, c: acc.c + m.c, f: acc.f + m.f };
  }, { kcal: 0, p: 0, c: 0, f: 0 });

  const macrosForDay = (state, entry) => entry.meals.reduce((acc, meal) => {
    const m = macrosForMeal(state, meal);
    return { kcal: acc.kcal + m.kcal, p: acc.p + m.p, c: acc.c + m.c, f: acc.f + m.f };
  }, { kcal: 0, p: 0, c: 0, f: 0 });

  const isPeriWorkout = (name) => /pre-workout|post-workout/i.test(name);

  // Baseline di carboidrati del template originale (solo alimenti base, non
  // dipende dallo stato utente): serve solo per stimare se la giornata reale
  // e' molto piu' scarica del previsto, non come bersaglio esatto.
  const templateCarbBaseline = (dayType) => {
    const template = D.MEAL_TEMPLATES[dayType];
    if (!template) return null;
    let carbs = 0;
    template.forEach((meal) => meal.items.forEach((it) => {
      const food = D.FOODS.find((f) => f.id === it.id);
      if (food) carbs += food.c * (it.qty / 100);
    }));
    return carbs;
  };

  const foodOptionsHtml = (state, selected) => {
    const cats = {};
    getAllFoods(state).forEach((f) => { (cats[f.cat] = cats[f.cat] || []).push(f); });
    return Object.entries(cats).map(([cat, foods]) => `
      <optgroup label="${escapeHtml(cat)}">
        ${foods.sort((a, b) => a.name.localeCompare(b.name)).map((f) => `<option value="${f.id}" ${f.id === selected ? 'selected' : ''}>${escapeHtml(f.name)}</option>`).join('')}
      </optgroup>`).join('');
  };

  const renderMeal = (state, meal, mealIdx, dayType) => {
    const macros = macrosForMeal(state, meal);
    const highlight = (dayType === 'forza' || dayType === 'boxe' || dayType === 'gambe') && isPeriWorkout(meal.name);
    return `
      <div class="panel meal-card" data-meal-idx="${mealIdx}" style="${highlight ? 'border-color:var(--color-accent)' : ''}">
        <div class="meal-card-head">
          <label class="switch" style="gap:.5rem">
            <input type="checkbox" data-meal-checked ${meal.checked ? 'checked' : ''} aria-label="Pasto completato" />
            <input type="text" class="exercise-note-input" data-meal-name value="${escapeHtml(meal.name)}" style="font-weight:800;min-width:140px" aria-label="Nome pasto" />
          </label>
          <div style="display:flex;gap:.4rem;align-items:center;flex-wrap:wrap">
            <span class="tag">${Math.round(macros.kcal)} kcal</span>
            <button class="btn btn-sm" type="button" data-save-favorite aria-label="Salva pasto come preferito">☆ Preferito</button>
            <button class="btn btn-sm btn-danger" type="button" data-remove-meal aria-label="Rimuovi pasto">Rimuovi</button>
          </div>
        </div>
        <div class="meal-items">
          ${meal.items.map((it, itemIdx) => {
            const food = getFoodById(state, it.foodId);
            const m = macrosForItem(state, it);
            return `
            <div class="meal-item-row" data-item-idx="${itemIdx}">
              <span>${escapeHtml(food ? food.name : 'Alimento sconosciuto')} <span class="meal-item-macro">(stima)</span></span>
              <input type="number" class="qty" min="0" step="5" value="${it.qty}" data-item-qty aria-label="Quantità in grammi" />
              <button class="btn btn-sm btn-ghost" type="button" data-remove-item aria-label="Rimuovi alimento">✕</button>
            </div>
            <div class="meal-item-macro" style="margin-top:-.3rem">${Math.round(m.kcal)} kcal · P ${U.round1(m.p)}g · C ${U.round1(m.c)}g · G ${U.round1(m.f)}g</div>`;
          }).join('') || '<p class="meal-item-macro">Nessun alimento aggiunto.</p>'}
        </div>
        <div class="food-add-row">
          <select data-add-food-select aria-label="Aggiungi alimento">${foodOptionsHtml(state)}</select>
          <input type="number" data-add-food-qty min="0" step="5" value="100" aria-label="Quantità in grammi" />
          <button class="btn btn-sm" type="button" data-add-food-btn>+ Aggiungi</button>
        </div>
      </div>`;
  };

  const macroBarPct = (value, min, max) => {
    if (!max) return 0;
    return Math.min(100, Math.round((value / max) * 100));
  };

  /* ---------------- Piano settimanale: striscia giorni ---------------- */

  const renderWeekStrip = (state) => {
    const [monday] = U.currentWeekRange(new Date(selectedDate));
    const dates = Array.from({ length: 7 }, (_, i) => U.toISODate(new Date(new Date(monday).getTime() + i * 86400000)));
    return `
      <div class="week-strip" role="group" aria-label="Giorni della settimana">
        ${dates.map((d) => {
          const entry = state.nutritionDays[d];
          const has = entry && entry.meals.length > 0;
          return `<button type="button" class="week-strip-day" data-strip-date="${d}" data-active="${d === selectedDate}">
            <span>${D.WEEKDAY_LABELS[U.weekdayKeyOf(d)].slice(0, 3)}</span>
            <strong>${U.formatDateShortIt(d)}</strong>
            ${has ? '<span class="week-strip-dot"></span>' : ''}
          </button>`;
        }).join('')}
      </div>`;
  };

  /* ---------------- Lista della spesa aggregata ---------------- */

  const CATEGORY_GROUP_LABELS = {
    proteine: 'Proteine', carboidrati: 'Carboidrati', frutta: 'Verdure e frutta', verdura: 'Verdure e frutta',
    latticini: 'Latticini', grassi: 'Grassi e condimenti', integratori: 'Extra', personalizzati: 'Extra',
  };

  const buildShoppingList = (state) => {
    const [monday] = U.currentWeekRange(new Date(selectedDate));
    const dates = Array.from({ length: 7 }, (_, i) => U.toISODate(new Date(new Date(monday).getTime() + i * 86400000)));
    const totals = {}; // foodId -> qty grams
    dates.forEach((d) => {
      const entry = state.nutritionDays[d];
      if (!entry) return;
      entry.meals.forEach((meal) => meal.items.forEach((it) => {
        totals[it.foodId] = (totals[it.foodId] || 0) + (Number(it.qty) || 0);
      }));
    });
    const groups = {};
    Object.entries(totals).forEach(([foodId, qty]) => {
      const food = getFoodById(state, foodId);
      const label = CATEGORY_GROUP_LABELS[food ? food.cat : 'personalizzati'] || 'Extra';
      groups[label] = groups[label] || [];
      groups[label].push({ name: food ? food.name : foodId, qty });
    });
    return { dates, groups };
  };

  const shoppingListToText = (list) => {
    const lines = [`Lista della spesa (7 giorni, ${U.formatDateShortIt(list.dates[0])}-${U.formatDateShortIt(list.dates[6])}) — quantità stimate`];
    Object.entries(list.groups).forEach(([label, items]) => {
      lines.push('', `${label}:`);
      items.forEach((it) => lines.push(`- ${it.name}: ${Math.round(it.qty)} g`));
    });
    return lines.join('\n');
  };

  const copyToClipboard = async (text) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (e) { /* si passa al fallback sotto */ }
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      return true;
    } catch (e) { return false; }
  };

  const renderShoppingListPanel = () => {
    if (!shoppingList) return '';
    const empty = Object.keys(shoppingList.groups).length === 0;
    return `
      <div class="panel card shopping-list" style="margin-top:var(--space-3)">
        <div class="card-title">Lista della spesa — ${U.formatDateShortIt(shoppingList.dates[0])} → ${U.formatDateShortIt(shoppingList.dates[6])}</div>
        ${empty ? '<p class="empty-state">Nessun pasto pianificato in questa settimana.</p>' : Object.entries(shoppingList.groups).map(([label, items]) => `
          <div class="shopping-group">
            <h5>${escapeHtml(label)}</h5>
            <ul>${items.map((it) => `<li>${escapeHtml(it.name)} — ${Math.round(it.qty)} g <span class="meal-item-macro">(stima)</span></li>`).join('')}</ul>
          </div>`).join('')}
        ${!empty ? '<button class="btn btn-sm" type="button" id="copyShoppingListBtn">📋 Copia lista</button>' : ''}
      </div>`;
  };

  /* ---------------- Pasti preferiti ---------------- */

  const renderFavorites = (state) => `
    <section class="panel card" style="margin-top:var(--space-4)">
      <div class="card-title">Pasti preferiti</div>
      ${state.favoriteMeals.length ? `
        <div class="favorites-list">
          ${state.favoriteMeals.map((f) => `
            <div class="favorite-meal-row" data-fav-id="${f.id}">
              <span>${escapeHtml(f.name)}</span>
              <div style="display:flex;gap:.4rem">
                <button class="btn btn-sm" type="button" data-add-fav>+ Aggiungi a oggi</button>
                <button class="btn btn-sm btn-danger" type="button" data-remove-fav>✕</button>
              </div>
            </div>`).join('')}
        </div>` : '<p class="empty-state">Salva un pasto come preferito dal pulsante ☆ su ogni pasto.</p>'}
    </section>`;

  const render = (container) => {
    const state = window.Store.getState();
    const entry = getDayEntry(state, selectedDate) || emptyDay();
    const totals = macrosForDay(state, entry);
    const targets = state.settings.nutritionTargets;
    const dayTypeInfo = D.NUTRITION_DAY_TYPES.find((t) => t.key === entry.dayType);

    const tips = [];
    if (totals.p < 100) tips.push({ type: 'warning', text: 'Aggiungi una fonte proteica in uno dei pasti.' });
    else if (totals.p < targets.proteinMin) tips.push({ type: 'warning', text: 'Ti manca una fonte proteica.' });
    else tips.push({ type: 'success', text: 'Hai raggiunto le proteine.' });

    if (['forza', 'gambe', 'boxe'].includes(entry.dayType)) {
      const baseline = templateCarbBaseline(entry.dayType);
      if (baseline && totals.c > 0 && totals.c < baseline * 0.6) {
        tips.push({ type: 'info', text: 'Sessione impegnativa: valuta una porzione di carboidrati pre o post allenamento.' });
      } else {
        tips.push({ type: 'info', text: 'Giorno impegnativo: non tagliare troppo i carboidrati, servono attorno all\'allenamento.' });
      }
    }
    if (entry.dayType === 'riposo') tips.push({ type: 'info', text: 'Giorno di riposo: mantieni le proteine, riduci una sola porzione di carboidrati. Non compensare con digiuni inutili.' });

    const last7 = [];
    for (let i = 6; i >= 0; i -= 1) {
      const d = U.toISODate(new Date(Date.now() - i * 86400000));
      const e = state.nutritionDays[d];
      const t = e ? macrosForDay(state, e) : null;
      last7.push({ date: d, totals: t });
    }

    container.innerHTML = `
      <div class="view-header"><h2>Nutrizione</h2><p>Pasti stimati con alimenti italiani comuni. Le macro sono stime, non dati clinici: per esigenze mediche serve un professionista.</p></div>

      <div class="nutrition-toolbar">
        <div class="field" style="max-width:220px"><label for="nutritionDate">Giorno</label><input type="date" id="nutritionDate" value="${selectedDate}" /></div>
        <div class="day-type-select" role="group" aria-label="Tipo di giorno">
          ${D.NUTRITION_DAY_TYPES.map((t) => `<button class="chip" type="button" data-day-type="${t.key}" data-active="${entry.dayType === t.key}">${escapeHtml(t.label)}</button>`).join('')}
        </div>
        <button class="btn" type="button" id="generateDayBtn">🔄 Genera giornata da template</button>
      </div>
      ${dayTypeInfo ? `<p style="font-size:var(--text-xs);color:var(--color-text-faint);margin:-.5rem 0 var(--space-3)">${escapeHtml(dayTypeInfo.carbLevel)} — indicativo, non prescrittivo.</p>` : ''}

      <div class="macro-summary">
        <div class="panel macro-tile"><span class="num">${Math.round(totals.kcal)}</span><span class="unit">kcal stimate</span></div>
        <div class="panel macro-tile">
          <span class="num">${U.round1(totals.p)} g</span><span class="unit">proteine (target ${targets.proteinMin}-${targets.proteinMax}g)</span>
          <div class="macro-bar protein"><span style="width:${macroBarPct(totals.p, 0, targets.proteinMax)}%"></span></div>
        </div>
        <div class="panel macro-tile"><span class="num">${U.round1(totals.c)} g</span><span class="unit">carboidrati</span><div class="macro-bar carbs"><span style="width:${Math.min(100, totals.c / 3)}%"></span></div></div>
        <div class="panel macro-tile">
          <span class="num">${U.round1(totals.f)} g</span><span class="unit">grassi (target ${targets.fatMin}-${targets.fatMax}g)</span>
          <div class="macro-bar fat"><span style="width:${macroBarPct(totals.f, 0, targets.fatMax)}%"></span></div>
        </div>
      </div>

      <div style="display:grid;gap:var(--space-2);margin-bottom:var(--space-4)">
        ${tips.map((t) => `<div class="alert alert-${t.type}"><span class="alert-icon">${t.type === 'success' ? '✅' : t.type === 'warning' ? '🍗' : 'ℹ️'}</span><div>${escapeHtml(t.text)}</div></div>`).join('')}
      </div>

      <section style="display:grid;gap:var(--space-3)" id="mealsList">
        ${entry.meals.length ? entry.meals.map((m, i) => renderMeal(state, m, i, entry.dayType)).join('') : '<p class="empty-state">Nessun pasto per questo giorno. Genera dal template o aggiungine uno.</p>'}
      </section>
      <button class="btn" type="button" id="addMealBtn" style="margin-top:var(--space-3)">+ Aggiungi pasto</button>

      ${renderFavorites(state)}

      <section class="panel card" style="margin-top:var(--space-4)">
        <div class="card-title">Piano settimanale pasti</div>
        ${renderWeekStrip(state)}
        <div class="chip-group" style="margin-top:var(--space-3)">
          <button class="btn btn-sm" type="button" id="duplicateBtn">📋 Duplica pasti di oggi sugli altri giorni selezionati</button>
          <button class="btn btn-sm" type="button" id="shoppingListBtn">🛒 Genera lista della spesa (7 giorni)</button>
        </div>
        <div class="duplicate-targets" id="duplicateTargets" hidden></div>
        ${renderShoppingListPanel()}
      </section>

      <section class="panel card" style="margin-top:var(--space-5)">
        <div class="card-title">Tracker giornalieri</div>
        <div class="tracker-row" style="margin-bottom:var(--space-3)">
          <span style="min-width:120px;font-weight:700;font-size:var(--text-sm)">💧 Acqua</span>
          <div class="stepper"><button type="button" data-track="water" data-delta="-250">−</button><span class="val">${entry.waterMl} ml</span><button type="button" data-track="water" data-delta="250">+</button></div>
          <span style="font-size:var(--text-xs);color:var(--color-text-faint)">Obiettivo ${targets.waterMlGoal} ml</span>
        </div>
        <div class="tracker-row" style="margin-bottom:var(--space-3)">
          <span style="min-width:120px;font-weight:700;font-size:var(--text-sm)">💊 Creatina</span>
          <div class="stepper"><button type="button" data-track="creatine" data-delta="-1">−</button><span class="val">${entry.creatineG} g</span><button type="button" data-track="creatine" data-delta="1">+</button></div>
          <span style="font-size:var(--text-xs);color:var(--color-text-faint)">Obiettivo ${targets.creatineG} g</span>
        </div>
        <div class="tracker-row" style="margin-bottom:var(--space-3)">
          <span style="min-width:120px;font-weight:700;font-size:var(--text-sm)">🥦 Verdura</span>
          <div class="stepper"><button type="button" data-track="veg" data-delta="-1">−</button><span class="val">${entry.vegPortions} porz.</span><button type="button" data-track="veg" data-delta="1">+</button></div>
          <span style="font-size:var(--text-xs);color:var(--color-text-faint)">Obiettivo ${targets.vegPortionsGoal}</span>
        </div>
        <div class="tracker-row">
          <span style="min-width:120px;font-weight:700;font-size:var(--text-sm)">🍎 Frutta</span>
          <div class="stepper"><button type="button" data-track="fruit" data-delta="-1">−</button><span class="val">${entry.fruitPortions} porz.</span><button type="button" data-track="fruit" data-delta="1">+</button></div>
          <span style="font-size:var(--text-xs);color:var(--color-text-faint)">Obiettivo ${targets.fruitPortionsGoal}</span>
        </div>
      </section>

      <section class="panel card" style="margin-top:var(--space-4)">
        <div class="card-title">Aggiungi alimento personalizzato</div>
        <form id="customFoodForm" style="display:grid;gap:var(--space-2);grid-template-columns:2fr repeat(4,1fr) auto;align-items:end">
          <div class="field"><label for="cfName">Nome</label><input id="cfName" required /></div>
          <div class="field"><label for="cfKcal">Kcal/100g</label><input id="cfKcal" type="number" min="0" required /></div>
          <div class="field"><label for="cfP">Prot./100g</label><input id="cfP" type="number" min="0" step="0.1" required /></div>
          <div class="field"><label for="cfC">Carb./100g</label><input id="cfC" type="number" min="0" step="0.1" required /></div>
          <div class="field"><label for="cfF">Grassi/100g</label><input id="cfF" type="number" min="0" step="0.1" required /></div>
          <button class="btn btn-sm" type="submit">Salva</button>
        </form>
        <p style="font-size:var(--text-xs);color:var(--color-text-faint);margin-top:.5rem">Valori marcati come stima: usa fonti nutrizionali reali se ti servono dati precisi.</p>
      </section>

      <section class="panel card" style="margin-top:var(--space-4)">
        <div class="card-title">Ultimi 7 giorni</div>
        <div class="history-table-wrap">
          <table class="history-table"><thead><tr><th>Giorno</th><th>Kcal</th><th>Proteine</th><th>Carbo</th><th>Grassi</th></tr></thead>
          <tbody>
            ${last7.map((d) => `<tr><td>${U.formatDateShortIt(d.date)}</td><td>${d.totals ? Math.round(d.totals.kcal) : '-'}</td><td>${d.totals ? U.round1(d.totals.p) : '-'}</td><td>${d.totals ? U.round1(d.totals.c) : '-'}</td><td>${d.totals ? U.round1(d.totals.f) : '-'}</td></tr>`).join('')}
          </tbody></table>
        </div>
      </section>
    `;

    wire(container, state, entry);
  };

  function wire(container, state, entry) {
    container.querySelector('#nutritionDate').addEventListener('change', (e) => { selectedDate = e.target.value || U.todayISO(); shoppingList = null; render(container); });

    container.querySelectorAll('[data-strip-date]').forEach((btn) => {
      btn.addEventListener('click', () => { selectedDate = btn.dataset.stripDate; render(container); });
    });

    container.querySelectorAll('[data-day-type]').forEach((btn) => {
      btn.addEventListener('click', () => {
        window.Store.update((s) => { withDayEntry(s, selectedDate).dayType = btn.dataset.dayType; });
        render(container);
      });
    });

    container.querySelector('#generateDayBtn').addEventListener('click', async () => {
      const existing = getDayEntry(state, selectedDate);
      if (existing && existing.meals.length) {
        const ok = await window.UI.confirmDialog({ title: 'Sovrascrivere i pasti?', message: 'La giornata ha già dei pasti: generarla di nuovo li sostituirà.', confirmLabel: 'Genera comunque' });
        if (!ok) return;
      }
      window.Store.update((s) => {
        const d = withDayEntry(s, selectedDate);
        const template = D.MEAL_TEMPLATES[d.dayType] || D.MEAL_TEMPLATES.forza;
        d.meals = template.map((m) => ({
          id: U.uid('meal'), name: m.name, checked: false, items: m.items.map((it) => ({ foodId: it.id, qty: it.qty })),
        }));
      });
      window.UI.toast('Giornata generata dal template.', 'success');
      render(container);
    });

    container.querySelector('#addMealBtn').addEventListener('click', () => {
      window.Store.update((s) => {
        const d = withDayEntry(s, selectedDate);
        d.meals.push({ id: U.uid('meal'), name: 'Nuovo pasto', checked: false, items: [] });
      });
      render(container);
    });

    container.querySelectorAll('[data-track]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.track;
        const delta = Number(btn.dataset.delta);
        const field = { water: 'waterMl', creatine: 'creatineG', veg: 'vegPortions', fruit: 'fruitPortions' }[key];
        window.Store.update((s) => {
          const d = withDayEntry(s, selectedDate);
          d[field] = Math.max(0, (d[field] || 0) + delta);
        });
        render(container);
      });
    });

    container.querySelector('#customFoodForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const name = container.querySelector('#cfName').value.trim();
      if (!name) return;
      const food = {
        id: U.uid('custom'),
        name: `${name} (personalizzato)`,
        cat: 'personalizzati',
        kcal: Number(container.querySelector('#cfKcal').value) || 0,
        p: Number(container.querySelector('#cfP').value) || 0,
        c: Number(container.querySelector('#cfC').value) || 0,
        f: Number(container.querySelector('#cfF').value) || 0,
      };
      window.Store.update((s) => { s.customFoods.push(food); });
      window.UI.toast('Alimento personalizzato salvato.', 'success');
      render(container);
    });

    /* ---- Preferiti ---- */
    container.querySelectorAll('[data-fav-id]').forEach((row) => {
      const favId = row.dataset.favId;
      row.querySelector('[data-add-fav]').addEventListener('click', () => {
        const fav = state.favoriteMeals.find((f) => f.id === favId);
        if (!fav) return;
        window.Store.update((s) => {
          const d = withDayEntry(s, selectedDate);
          d.meals.push({ id: U.uid('meal'), name: fav.name, checked: false, items: fav.items.map((it) => ({ ...it })) });
        });
        window.UI.toast('Pasto preferito aggiunto.', 'success');
        render(container);
      });
      row.querySelector('[data-remove-fav]').addEventListener('click', () => {
        window.Store.update((s) => { s.favoriteMeals = s.favoriteMeals.filter((f) => f.id !== favId); });
        render(container);
      });
    });

    /* ---- Duplica su altri giorni ---- */
    const duplicateBtn = container.querySelector('#duplicateBtn');
    const targetsBox = container.querySelector('#duplicateTargets');
    duplicateBtn.addEventListener('click', () => {
      if (!entry.meals.length) { window.UI.toast('Genera o aggiungi almeno un pasto prima di duplicare.', 'warning'); return; }
      if (!targetsBox.hidden) { targetsBox.hidden = true; return; }
      const [monday] = U.currentWeekRange(new Date(selectedDate));
      const dates = Array.from({ length: 7 }, (_, i) => U.toISODate(new Date(new Date(monday).getTime() + i * 86400000))).filter((d) => d !== selectedDate);
      targetsBox.hidden = false;
      targetsBox.innerHTML = `
        <div class="chip-group" style="margin-top:var(--space-2)">
          ${dates.map((d) => `<label class="chip" style="cursor:pointer"><input type="checkbox" data-dup-target="${d}" style="margin-right:.35rem" />${U.formatDateShortIt(d)}</label>`).join('')}
        </div>
        <button class="btn btn-sm btn-primary" type="button" id="confirmDuplicateBtn" style="margin-top:var(--space-2)">Duplica sui giorni selezionati</button>`;
      targetsBox.querySelector('#confirmDuplicateBtn').addEventListener('click', () => {
        const targets = [...targetsBox.querySelectorAll('[data-dup-target]:checked')].map((el) => el.dataset.dupTarget);
        if (!targets.length) { window.UI.toast('Seleziona almeno un giorno.', 'warning'); return; }
        window.Store.update((s) => {
          targets.forEach((d) => {
            const dest = withDayEntry(s, d);
            dest.dayType = entry.dayType;
            dest.meals = entry.meals.map((m) => ({ id: U.uid('meal'), name: m.name, checked: false, items: m.items.map((it) => ({ ...it })) }));
          });
        });
        window.UI.toast(`Pasti duplicati su ${targets.length} giorno/i.`, 'success');
        targetsBox.hidden = true;
        render(container);
      });
    });

    /* ---- Lista della spesa ---- */
    const shoppingBtn = container.querySelector('#shoppingListBtn');
    shoppingBtn.addEventListener('click', () => {
      shoppingList = buildShoppingList(state);
      render(container);
    });
    const copyBtn = container.querySelector('#copyShoppingListBtn');
    if (copyBtn) {
      copyBtn.addEventListener('click', async () => {
        const ok = await copyToClipboard(shoppingListToText(shoppingList));
        window.UI.toast(ok ? 'Lista copiata negli appunti.' : 'Impossibile copiare: seleziona e copia manualmente.', ok ? 'success' : 'warning');
      });
    }

    /* ---- Pasti del giorno ---- */
    container.querySelectorAll('.meal-card').forEach((mealEl) => {
      const mealIdx = Number(mealEl.dataset.mealIdx);

      mealEl.querySelector('[data-meal-checked]').addEventListener('change', (e) => {
        window.Store.update((s) => { withDayEntry(s, selectedDate).meals[mealIdx].checked = e.target.checked; });
      });
      mealEl.querySelector('[data-meal-name]').addEventListener('change', (e) => {
        window.Store.update((s) => { withDayEntry(s, selectedDate).meals[mealIdx].name = e.target.value; });
      });
      mealEl.querySelector('[data-remove-meal]').addEventListener('click', () => {
        window.Store.update((s) => { withDayEntry(s, selectedDate).meals.splice(mealIdx, 1); });
        render(container);
      });
      mealEl.querySelector('[data-save-favorite]').addEventListener('click', () => {
        const meal = entry.meals[mealIdx];
        window.Store.update((s) => {
          s.favoriteMeals.push({ id: U.uid('fav'), name: meal.name, items: meal.items.map((it) => ({ ...it })) });
        });
        window.UI.toast('Pasto salvato tra i preferiti.', 'success');
        render(container);
      });

      mealEl.querySelectorAll('[data-item-idx]').forEach((row) => {
        const itemIdx = Number(row.dataset.itemIdx);
        const qtyInput = row.querySelector('[data-item-qty]');
        if (qtyInput) {
          qtyInput.addEventListener('change', () => {
            window.Store.update((s) => { withDayEntry(s, selectedDate).meals[mealIdx].items[itemIdx].qty = Number(qtyInput.value) || 0; });
            render(container);
          });
        }
        const removeBtn = row.querySelector('[data-remove-item]');
        if (removeBtn) {
          removeBtn.addEventListener('click', () => {
            window.Store.update((s) => { withDayEntry(s, selectedDate).meals[mealIdx].items.splice(itemIdx, 1); });
            render(container);
          });
        }
      });

      mealEl.querySelector('[data-add-food-btn]').addEventListener('click', () => {
        const select = mealEl.querySelector('[data-add-food-select]');
        const qty = mealEl.querySelector('[data-add-food-qty]');
        if (!select.value) return;
        window.Store.update((s) => {
          withDayEntry(s, selectedDate).meals[mealIdx].items.push({ foodId: select.value, qty: Number(qty.value) || 100 });
        });
        render(container);
      });
    });
  }

  window.Nutrition = { render };
})();
