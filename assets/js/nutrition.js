/* ============================================================
   MODULO NUTRIZIONE
   Pasti spuntabili, macro stimate da database alimenti italiani,
   template generabili, tracker acqua/creatina/frutta/verdura.
   ============================================================ */
(() => {
  'use strict';

  const U = window.Utils;
  const D = window.APP_DATA;
  const { escapeHtml } = U;

  let selectedDate = U.todayISO();

  const DAY_TYPE_LABELS = { riposo: 'Riposo', forza: 'Forza', boxe: 'Boxe', tecnica: 'Tecnica + sacco' };

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
    const highlight = (dayType === 'forza' || dayType === 'boxe') && isPeriWorkout(meal.name);
    return `
      <div class="panel meal-card" data-meal-idx="${mealIdx}" style="${highlight ? 'border-color:var(--color-accent)' : ''}">
        <div class="meal-card-head">
          <label class="switch" style="gap:.5rem">
            <input type="checkbox" data-meal-checked ${meal.checked ? 'checked' : ''} aria-label="Pasto completato" />
            <input type="text" class="exercise-note-input" data-meal-name value="${escapeHtml(meal.name)}" style="font-weight:800;min-width:140px" aria-label="Nome pasto" />
          </label>
          <div style="display:flex;gap:.4rem;align-items:center">
            <span class="tag">${Math.round(macros.kcal)} kcal</span>
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

  const render = (container) => {
    const state = window.Store.getState();
    const entry = getDayEntry(state, selectedDate) || emptyDay();
    const totals = macrosForDay(state, entry);
    const targets = state.settings.nutritionTargets;

    const proteinMsg = totals.p >= targets.proteinMin
      ? { type: 'success', text: 'Hai raggiunto le proteine.' }
      : { type: 'warning', text: 'Ti manca una fonte proteica.' };
    const tips = [proteinMsg];
    if (entry.dayType === 'boxe' || entry.dayType === 'forza') tips.push({ type: 'info', text: 'Giorno boxe/forza: non tagliare troppo i carboidrati, servono attorno all\'allenamento.' });
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
          ${Object.entries(DAY_TYPE_LABELS).map(([k, label]) => `<button class="chip" type="button" data-day-type="${k}" data-active="${entry.dayType === k}">${label}</button>`).join('')}
        </div>
        <button class="btn" type="button" id="generateDayBtn">🔄 Genera giornata da template</button>
      </div>

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
    container.querySelector('#nutritionDate').addEventListener('change', (e) => { selectedDate = e.target.value || U.todayISO(); render(container); });

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
