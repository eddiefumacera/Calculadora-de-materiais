// Calculadora RP (genérica). Edite catalog.json para nomes/categorias/valores.
// Materiais são genéricos: A–E.

const state = { catalog: [], qty: {}, showMaterials: true, showCategory: true, onlyValue: false, onlyMaterials: false, onlySelected: false, itemById: {}, itemNames: {}, categoryNames: {}, materialLabels: { a:'Material A', b:'Material B', c:'Material C', d:'Material D', e:'Material E' } };

const els = {
  modeChip: document.getElementById("modeChip"),
  modeMenu: document.getElementById("modeMenu"),

  searchInput: document.getElementById("searchInput"),
  categorySelect: document.getElementById("categorySelect"),
  btnCopyLink: document.getElementById("btnCopyLink"),
  btnSaveHistory: document.getElementById("btnSaveHistory"),
  btnOpenHistory: document.getElementById("btnOpenHistory"),
  toggleOnlySelected: document.getElementById("toggleOnlySelected"),

  historyModal: document.getElementById("historyModal"),
  historyList: document.getElementById("historyList"),
  historyEmpty: document.getElementById("historyEmpty"),
  btnClearHistory: document.getElementById("btnClearHistory"),

  body: document.getElementById("itemsBody"),
  table: document.getElementById("itemsTable"),
  totals: document.getElementById("totals"),
  copyHint: document.getElementById("copyHint"),
  btnCopyTotals: document.getElementById("btnCopyTotals"),
  btnReset: document.getElementById("btnReset"),
  btnReceipt: document.getElementById("btnReceipt"),
  modal: document.getElementById("receiptModal"),
  receiptText: document.getElementById("receiptText"),
  btnCopyReceipt: document.getElementById("btnCopyReceipt"),
  btnExportPDF: document.getElementById("btnExportPDF"),
  btnExportPNG: document.getElementById("btnExportPNG"),
  btnExportJPG: document.getElementById("btnExportJPG"),
  btnPrint: document.getElementById("btnPrint"),
  clientName: document.getElementById("clientName"),
  clientNote: document.getElementById("clientNote"),
  toggleMaterials: document.getElementById("toggleMaterials"),
  toggleCategory: document.getElementById("toggleCategory"),
  toggleOnlyValue: document.getElementById("toggleOnlyValue"),
  toggleOnlyMaterials: document.getElementById("toggleOnlyMaterials"),
};

const fmt = (n) => new Intl.NumberFormat("pt-BR").format(n);
const fmtK = (n) => `${new Intl.NumberFormat("pt-BR").format(n)}k`;

const LS_KEY = 'calc_history_v1';

function setUrlFromQty(){
  const params = new URLSearchParams();
  const items = [...state.catalog].sort((a,b) => {
    const qa = Number(state.qty[a.id] || 0);
    const qb = Number(state.qty[b.id] || 0);
    if ((qb>0) !== (qa>0)) return (qb>0) - (qa>0);
    if (qb !== qa) return qb - qa;
    return getItemName(a).localeCompare(getItemName(b),'pt-BR');
  });
  for (const item of items){
    const q = Number(state.qty[item.id] || 0);
    if (q > 0) params.set(item.id, String(q));
  }
  const qs = params.toString();
  const url = qs ? `${location.pathname}?${qs}` : `${location.pathname}`;
  history.replaceState(null, '', url);
}

function applyQtyFromUrl(){
  const params = new URLSearchParams(location.search);
  if (![...params.keys()].length) return;
  const items = [...state.catalog].sort((a,b) => {
    const qa = Number(state.qty[a.id] || 0);
    const qb = Number(state.qty[b.id] || 0);
    if ((qb>0) !== (qa>0)) return (qb>0) - (qa>0);
    if (qb !== qa) return qb - qa;
    return getItemName(a).localeCompare(getItemName(b),'pt-BR');
  });
  for (const item of items){
    const v = params.get(item.id);
    if (v != null){
      const q = Math.max(0, Number(v || 0));
      state.qty[item.id] = Number.isFinite(q) ? q : 0;
    }
  }
}

function loadHistory(){
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]') || []; }
  catch { return []; }
}

function saveHistory(entries){
  localStorage.setItem(LS_KEY, JSON.stringify(entries.slice(0, 50)));
}

function snapshotCurrent(){
  const qty = {};
  const items = [...state.catalog].sort((a,b) => {
    const qa = Number(state.qty[a.id] || 0);
    const qb = Number(state.qty[b.id] || 0);
    if ((qb>0) !== (qa>0)) return (qb>0) - (qa>0);
    if (qb !== qa) return qb - qa;
    return getItemName(a).localeCompare(getItemName(b),'pt-BR');
  });
  for (const item of items){
    const q = Number(state.qty[item.id] || 0);
    if (q > 0) qty[item.id] = q;
  }
  return {
    ts: Date.now(),
    qty,
    client: (els.clientName?.value || '').trim(),
    note: (els.clientNote?.value || '').trim(),
  };
}


function getItemName(item){
  return (state.itemNames && state.itemNames[item.id]) ? state.itemNames[item.id] : (item.name || '');
}

function getCategoryName(item){
  const raw = (item.category || '').trim();
  return (state.categoryNames && state.categoryNames[raw]) ? state.categoryNames[raw] : raw;
}

function applyLabels(){
  document.querySelectorAll('[data-label]').forEach(el => {
    const k = el.getAttribute('data-label');
    if (k && state.materialLabels[k]) el.textContent = state.materialLabels[k];
  });
}


function updateModeMenuActive(){
  if (!els.modeMenu) return;
  const mode = state.onlyValue ? 'value' : (state.onlyMaterials ? 'materials' : 'normal');
  els.modeMenu.querySelectorAll('.menuitem').forEach(btn => {
    btn.classList.toggle('is-active', btn.dataset.mode === mode);
  });
}

function updateBrand(){
  if (!els.modeChip) return;

  // Reset classes
  els.modeChip.classList.remove("is-accent","is-normal","is-value","is-materials");

  updateModeMenuActive();

  if (state.onlyValue) {
    els.modeChip.textContent = "Valores";
    els.modeChip.classList.add("is-accent","is-value");
  } else if (state.onlyMaterials) {
    els.modeChip.textContent = "Materiais";
    els.modeChip.classList.add("is-accent","is-materials");
  } else {
    els.modeChip.textContent = "Calculadora";
    els.modeChip.classList.add("is-normal");
  }
}

function setMode(mode){
  if (mode === 'value') {
    state.onlyValue = true;
    state.onlyMaterials = false;
    if (els.toggleOnlyValue) els.toggleOnlyValue.checked = true;
    if (els.toggleOnlyMaterials) els.toggleOnlyMaterials.checked = false;
  } else if (mode === 'materials') {
    state.onlyValue = false;
    state.onlyMaterials = true;
    if (els.toggleOnlyValue) els.toggleOnlyValue.checked = false;
    if (els.toggleOnlyMaterials) els.toggleOnlyMaterials.checked = true;
  } else {
    state.onlyValue = false;
    state.onlyMaterials = false;
    if (els.toggleOnlyValue) els.toggleOnlyValue.checked = false;
    if (els.toggleOnlyMaterials) els.toggleOnlyMaterials.checked = false;
  }
  applyColumnVisibility();
  renderTotals();
  if (els.modal.getAttribute('aria-hidden') === 'false') renderReceipt();
}

function cycleMode(){
  // ordem: Calculadora -> Valores -> Materiais -> Calculadora
  if (!state.onlyValue && !state.onlyMaterials) {
    state.onlyValue = true;
    state.onlyMaterials = false;
    if (els.toggleOnlyValue) els.toggleOnlyValue.checked = true;
    if (els.toggleOnlyMaterials) els.toggleOnlyMaterials.checked = false;
  } else if (state.onlyValue) {
    state.onlyValue = false;
    state.onlyMaterials = true;
    if (els.toggleOnlyValue) els.toggleOnlyValue.checked = false;
    if (els.toggleOnlyMaterials) els.toggleOnlyMaterials.checked = true;
  } else {
    state.onlyValue = false;
    state.onlyMaterials = false;
    if (els.toggleOnlyValue) els.toggleOnlyValue.checked = false;
    if (els.toggleOnlyMaterials) els.toggleOnlyMaterials.checked = false;
  }
  applyColumnVisibility();
  renderTotals();
  if (els.modal.getAttribute('aria-hidden') === 'false') renderReceipt();
}

function calcTotals(){
  const t = { a:0, b:0, c:0, d:0, e:0, valor:0 };
  const items = [...state.catalog].sort((a,b) => {
    const qa = Number(state.qty[a.id] || 0);
    const qb = Number(state.qty[b.id] || 0);
    if ((qb>0) !== (qa>0)) return (qb>0) - (qa>0);
    if (qb !== qa) return qb - qa;
    return getItemName(a).localeCompare(getItemName(b),'pt-BR');
  });
  for (const item of items){
    const q = Number(state.qty[item.id] || 0);
    if (!q) continue;
    const r = item.recipe || {};
    t.a += (r.a||0) * q;
    t.b += (r.b||0) * q;
    t.c += (r.c||0) * q;
    t.d += (r.d||0) * q;
    t.e += (r.e||0) * q;
    t.valor += (item.value_k||0) * q;
  }
  return t;
}

function applyColumnVisibility(){
  const onlyValue = state.onlyValue;
  const onlyMaterials = state.onlyMaterials;

  const showMaterials = state.showMaterials && !onlyValue;
  const showCategory = state.showCategory && !(onlyValue || onlyMaterials);
  const showValueCol = !onlyMaterials;

  const ths = els.table.querySelectorAll("thead th");
  const hide = (node, yes) => node && (node.style.display = yes ? "none" : "");

  // Categoria
  hide(ths[1], !showCategory);

  // Materiais (A–E)
  for (let i=3;i<=7;i++) hide(ths[i], !showMaterials);

  // Valor (k)
  hide(ths[8], !showValueCol);

  // Linhas
  els.body.querySelectorAll("tr").forEach(tr => {
    const tds = tr.querySelectorAll("td");
    hide(tds[1], !showCategory);
    for (let i=3;i<=7;i++) hide(tds[i], !showMaterials);
    hide(tds[8], !showValueCol);
  });

  // Cards de totais
  els.totals.querySelectorAll(".total").forEach(card => {
    const label = (card.querySelector(".label")?.textContent || "").toLowerCase();
    const isValor = label.includes("valor");
    if (onlyValue) card.style.display = isValor ? "" : "none";
    else if (onlyMaterials) card.style.display = isValor ? "none" : "";
    else card.style.display = "";
  });

  // Texto do botão copiar
  if (onlyValue) els.btnCopyTotals.textContent = "Copiar valor";
  else if (onlyMaterials) els.btnCopyTotals.textContent = "Copiar materiais";
  else els.btnCopyTotals.textContent = "Copiar totais";

  updateBrand();
}

function applyFilters(){
  const q = (els.searchInput?.value || '').trim().toLowerCase();
  const cat = (els.categorySelect?.value || '').trim();
  const onlySel = !!state.onlySelected;
  els.body.querySelectorAll('tr').forEach(tr => {
    const name = (tr.dataset.name || '').toLowerCase();
    const c = tr.dataset.category || '';
    const id = tr.dataset.id || '';
    const qtty = Number(state.qty[id] || 0);
    const okName = !q || name.includes(q);
    const okCat = !cat || c === cat;
    const okSel = !onlySel || qtty > 0;
    tr.style.display = (okName && okCat && okSel) ? '' : 'none';
  });
}

function renderTotals(){
  const t = calcTotals();
  ["a","b","c","d","e"].forEach(k => {
    const el = els.totals.querySelector(`.value[data-k="${k}"]`);
    if (el) el.textContent = fmt(t[k]);
  });
  const v = els.totals.querySelector(`.value[data-k="valor"]`);
  if (v) v.textContent = fmtK(t.valor);

  const rows = els.body.querySelectorAll("tr");
  rows.forEach((tr) => {
    const id = tr.dataset.id;
    const item = state.itemById[id];
    if (!item) return;
    const q = Number(state.qty[id] || 0);
    const r = item.recipe || {};
    const map = { a:r.a||0, b:r.b||0, c:r.c||0, d:r.d||0, e:r.e||0 };
    tr.querySelectorAll("td.mat").forEach(td => td.textContent = fmt((map[td.dataset.k]||0) * q));
    tr.querySelector("td.val").textContent = fmtK((item.value_k||0) * q);
  });
}

function renderTable(){
  els.body.innerHTML = "";
  const items = [...state.catalog].sort((a,b) => {
    const qa = Number(state.qty[a.id] || 0);
    const qb = Number(state.qty[b.id] || 0);
    if ((qb>0) !== (qa>0)) return (qb>0) - (qa>0);
    if (qb !== qa) return qb - qa;
    return getItemName(a).localeCompare(getItemName(b),'pt-BR');
  });
  for (const item of items){
    const tr = document.createElement("tr");
    tr.dataset.id = item.id;
    if (Number(state.qty[item.id] || 0) > 0) tr.classList.add("has-qty");

    const tdItem = document.createElement("td");
    tdItem.className = "item";
    const dispName = getItemName(item);
    const dispCat = getCategoryName(item);
    tdItem.textContent = dispName;
    tr.dataset.name = dispName || '';
    tr.dataset.category = dispCat || '';
    tr.appendChild(tdItem);

    const tdCat = document.createElement("td");
    tdCat.textContent = dispCat || "-";
    tr.appendChild(tdCat);

    const tdQty = document.createElement("td");
    const wrap = document.createElement("div");
    wrap.className = "qtybox";

    const btnMinus = document.createElement("button");
    btnMinus.className = "qbtn";
    btnMinus.type = "button";
    btnMinus.textContent = "–";

    const input = document.createElement("input");
    input.className = "qty";
    input.type = "number";
    input.min = "0";
    input.step = "1";
    input.value = state.qty[item.id] ?? 0;

    const btnPlus = document.createElement("button");
    btnPlus.className = "qbtn";
    btnPlus.type = "button";
    btnPlus.textContent = "+";

    const commit = (newVal) => {
      state.qty[item.id] = Math.max(0, Number(newVal || 0));
      input.value = state.qty[item.id];
      // re-render para manter selecionados no topo
      renderTable();
      setUrlFromQty();
      if (els.modal.getAttribute("aria-hidden") === "false") renderReceipt();
    };

    input.addEventListener("input", () => commit(input.value));
    btnMinus.addEventListener("click", () => commit((Number(state.qty[item.id] || 0) - 1)));
    btnPlus.addEventListener("click", () => commit((Number(state.qty[item.id] || 0) + 1)));

    wrap.appendChild(btnMinus);
    wrap.appendChild(input);
    wrap.appendChild(btnPlus);

    tdQty.appendChild(wrap);
    tr.appendChild(tdQty);

    const r = item.recipe || {};
    const cols = [
      ["a", r.a||0],
      ["b", r.b||0],
      ["c", r.c||0],
      ["d", r.d||0],
      ["e", r.e||0],
    ];
    for (const [k] of cols){
      const td = document.createElement("td");
      td.className = "num mat";
      td.dataset.k = k;
      td.textContent = "0";
      tr.appendChild(td);
    }

    const tdVal = document.createElement("td");
    tdVal.className = "num val";
    tdVal.textContent = "0k";
    tr.appendChild(tdVal);

    els.body.appendChild(tr);
  }
  applyColumnVisibility();
  renderTotals();
  applyFilters();
}

function buildReceiptText(){
  const t = calcTotals();

  const lines = [];
  // Cabeçalho (cliente/fac)
  lines.push("TROPA DA LB");
  lines.push("================================");

  const client = (els.clientName?.value || "").trim();
  const note = (els.clientNote?.value || "").trim();
  if (client) lines.push(`Cliente: ${client}`);
  if (note) lines.push(`Obs: ${note}`);
  if (client || note) lines.push("");

  // Itens em colunas (Discord friendly)
  const rows = [];
  const items = [...state.catalog].sort((a,b) => {
    const qa = Number(state.qty[a.id] || 0);
    const qb = Number(state.qty[b.id] || 0);
    if ((qb>0) !== (qa>0)) return (qb>0) - (qa>0);
    if (qb !== qa) return qb - qa;
    return getItemName(a).localeCompare(getItemName(b),'pt-BR');
  });

  for (const item of items){
    const q = Number(state.qty[item.id] || 0);
    if (q <= 0) continue;

    const name = getItemName(item);
    const unit = Number(item.value_k || 0);
    const lineTotal = unit * q;

    if (state.onlyMaterials){
      rows.push([name, String(q)]);
    } else {
      rows.push([name, String(q), fmtK(unit), fmtK(lineTotal)]);
    }
  }

  lines.push("Itens:");
  if (!rows.length){
    lines.push("• (nenhum)");
    lines.push("");
  } else if (state.onlyMaterials){
    const nameW = Math.min(34, Math.max(...rows.map(r => r[0].length), 4));
    const qtyW  = Math.max(...rows.map(r => r[1].length), 3);

    const header = ["ITEM".padEnd(nameW), "QTD".padStart(qtyW)].join("  ");
    const sep = "-".repeat(header.length);
    const body = rows.map(r => [r[0].slice(0,nameW).padEnd(nameW), r[1].padStart(qtyW)].join("  ")).join("\n");

    lines.push("```");
    lines.push(header);
    lines.push(sep);
    lines.push(body);
    lines.push("```");
    lines.push("");
  } else {
    const nameW = Math.min(34, Math.max(...rows.map(r => r[0].length), 4));
    const qtyW  = Math.max(...rows.map(r => r[1].length), 3);
    const unitW = Math.max(...rows.map(r => r[2].length), 4);
    const parW  = Math.max(...rows.map(r => r[3].length), 7);

    const header = ["ITEM".padEnd(nameW), "QTD".padStart(qtyW), "UNIT".padStart(unitW), "PARCIAL".padStart(parW)].join("  ");
    const sep = "-".repeat(header.length);
    const body = rows.map(r => [
      r[0].slice(0,nameW).padEnd(nameW),
      r[1].padStart(qtyW),
      r[2].padStart(unitW),
      r[3].padStart(parW)
    ].join("  ")).join("\n");

    lines.push("```");
    lines.push(header);
    lines.push(sep);
    lines.push(body);
    lines.push("```");
    lines.push("");
  }

  // Materiais
  if (!state.onlyValue){
    lines.push("Materiais:");
    lines.push(`• ${state.materialLabels.a}: ${fmt(t.a)}`);
    lines.push(`• ${state.materialLabels.b}: ${fmt(t.b)}`);
    lines.push(`• ${state.materialLabels.c}: ${fmt(t.c)}`);
    lines.push(`• ${state.materialLabels.d}: ${fmt(t.d)}`);
    lines.push(`• ${state.materialLabels.e}: ${fmt(t.e)}`);
    lines.push("");
  }

  // Total final
  if (!state.onlyMaterials) {
    lines.push(`TOTAL: ${fmtK(t.valor)}`);
  }

  return lines.join("\n");
}


function renderReceipt(){ els.receiptText.textContent = buildReceiptText(); }

async function copyText(text){
  try { await navigator.clipboard.writeText(text); return true; }
  catch {
    const ta = document.createElement("textarea");
    ta.value = text; document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  }
}

function openModal(){ els.modal.setAttribute("aria-hidden","false"); renderReceipt(); }
function closeModal(){ els.modal.setAttribute("aria-hidden","true"); }


async function fetchCatalog(){
  // Tenta caminhos possíveis (GitHub Pages em subpasta, cache, etc.)
  const basePath = location.pathname.endsWith("/") ? location.pathname : location.pathname + "/";
  const repoPath = "/" + basePath.split("/").filter(Boolean)[0] + "/"; // primeira pasta (repo)
  const candidates = [
    "./catalog.json",
    "catalog.json",
    basePath + "catalog.json",
    repoPath + "catalog.json",
    "/catalog.json",
  ];

  let lastErr = null;
  for (const url of candidates){
    try{
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) { lastErr = new Error(`HTTP ${res.status} em ${url}`); continue; }
      const data = await res.json();
      return { data, url };
    }catch(e){
      lastErr = e;
    }
  }
  throw lastErr || new Error("Falha ao carregar catalog.json");
}

async function init(){
  const res = await fetch("catalog.json", { cache:"no-store" });
  const catalog = await res.json();
  state.catalog = catalog.items || [];
  state.itemById = Object.fromEntries(state.catalog.map(i => [i.id, i]));
  state.itemNames = catalog.item_names || {};
  state.categoryNames = catalog.category_names || {};
  if (catalog.materials) state.materialLabels = { ...state.materialLabels, ...catalog.materials };
  applyLabels();

  // Popular categorias
  const catsRaw = [...new Set(state.catalog.map(i => (i.category||'').trim()).filter(Boolean))];
  const cats = catsRaw.map(c => state.categoryNames[c] || c).sort((a,b)=>a.localeCompare(b,'pt-BR'));
  if (els.categorySelect){
    els.categorySelect.innerHTML = '<option value="">Todas</option>' + cats.map(c=>`<option value="${c.replace(/"/g,'&quot;')}">${c}</option>`).join('');
  }

  state.catalog.forEach(i => state.qty[i.id] = 0);

  els.toggleMaterials.addEventListener("change", () => { state.showMaterials = els.toggleMaterials.checked; applyColumnVisibility(); });
  els.toggleCategory.addEventListener("change", () => { state.showCategory = els.toggleCategory.checked; applyColumnVisibility(); });
  els.toggleOnlyValue.addEventListener("change", () => {
    state.onlyValue = els.toggleOnlyValue.checked;
    updateModeMenuActive();

  if (state.onlyValue) {
      state.onlyMaterials = false;
      if (els.toggleOnlyMaterials) els.toggleOnlyMaterials.checked = false;
    }
    applyColumnVisibility();
    if (els.modal.getAttribute("aria-hidden") === "false") renderReceipt();
  });

  if (els.toggleOnlyMaterials){
    els.toggleOnlyMaterials.addEventListener("change", () => {
      state.onlyMaterials = els.toggleOnlyMaterials.checked;
      if (state.onlyMaterials) {
        state.onlyValue = false;
        els.toggleOnlyValue.checked = false;
      }
      applyColumnVisibility();
      if (els.modal.getAttribute("aria-hidden") === "false") renderReceipt();
    });
  }

  els.btnReset.addEventListener("click", () => {
    state.catalog.forEach(i => state.qty[i.id] = 0);
    els.body.querySelectorAll("input.qty").forEach(inp => inp.value = 0);
    renderTotals();
    if (els.modal.getAttribute("aria-hidden") === "false") renderReceipt();
    els.copyHint.textContent = "Zerado.";
    setTimeout(()=>els.copyHint.textContent="", 1300);
  });

  els.btnCopyTotals.addEventListener("click", async () => {
    const t = calcTotals();
    let text = "";
    updateModeMenuActive();

  if (state.onlyValue) {
      text = `Valor total: ${fmtK(t.valor)}`;
    } else if (state.onlyMaterials) {
      text = `${state.materialLabels.a}: ${fmt(t.a)} | ${state.materialLabels.b}: ${fmt(t.b)} | ${state.materialLabels.c}: ${fmt(t.c)} | ${state.materialLabels.d}: ${fmt(t.d)} | ${state.materialLabels.e}: ${fmt(t.e)}`;
    } else {
      text = `${state.materialLabels.a}: ${fmt(t.a)} | ${state.materialLabels.b}: ${fmt(t.b)} | ${state.materialLabels.c}: ${fmt(t.c)} | ${state.materialLabels.d}: ${fmt(t.d)} | ${state.materialLabels.e}: ${fmt(t.e)} | Valor: ${fmtK(t.valor)}`;
    }
    const ok = await copyText(text);
    els.copyHint.textContent = ok ? "Copiado!" : "Não foi possível copiar.";
    setTimeout(()=>els.copyHint.textContent="", 1400);
  });

  if (els.searchInput) els.searchInput.addEventListener('input', applyFilters);
  if (els.categorySelect) els.categorySelect.addEventListener('change', applyFilters);

  // Chip clicável: alterna modos
  if (els.modeChip){
    els.modeChip.title = "Clique para alternar: Calculadora → Valores → Materiais";
    els.modeChip.addEventListener('click', cycleMode);
  }

  // Clique direito: abre mini menu de modos
  function openModeMenuAtRight(){
    if (!els.modeMenu) return;
    els.modeMenu.classList.add("is-open");
    els.modeMenu.setAttribute("aria-hidden","false");
    updateModeMenuActive();
  }
  function closeModeMenu(){
    if (!els.modeMenu) return;
    els.modeMenu.classList.remove("is-open");
    els.modeMenu.setAttribute("aria-hidden","true");
  }

  if (els.modeChip){
    els.modeChip.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      openModeMenuAtRight();
    });
  }

  if (els.modeMenu){
    els.modeMenu.addEventListener('click', (e) => {
      const btn = e.target.closest('.menuitem');
      if (!btn) return;
      const m = btn.dataset.mode;
      if (m === 'value') setMode('value');
      else if (m === 'materials') setMode('materials');
      else setMode('normal');
      closeModeMenu();
    });
  }

  // Fechar ao clicar fora / ESC
  document.addEventListener('click', (e) => {
    if (!els.modeMenu || els.modeMenu.getAttribute("aria-hidden")==="true") return;
    const inside = (e.target === els.modeChip) || els.modeMenu.contains(e.target);
    if (!inside) closeModeMenu();
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModeMenu();
  });

  els.btnReceipt.addEventListener("click", openModal);
  els.modal.addEventListener("click", (e) => { if (e.target?.dataset?.close) closeModal(); });
  window.addEventListener("keydown", (e) => { if (e.key==="Escape" && els.modal.getAttribute("aria-hidden")==="false") closeModal(); });

  els.clientName.addEventListener("input", renderReceipt);
  els.clientNote.addEventListener("input", renderReceipt);

  els.btnCopyReceipt.addEventListener("click", async () => {
    const ok = await copyText(buildReceiptText());
    els.btnCopyReceipt.textContent = ok ? "Copiado ✅" : "Falhou 😕";
    setTimeout(()=>els.btnCopyReceipt.textContent="Copiar nota", 1200);
  });

  els.btnPrint.addEventListener("click", () => window.print());
  if (els.btnExportPNG) els.btnExportPNG.addEventListener("click", () => exportReceiptImage("png"));
  if (els.btnExportJPG) els.btnExportJPG.addEventListener("click", () => exportReceiptImage("jpg"));
  if (els.btnExportPDF) els.btnExportPDF.addEventListener("click", exportReceiptPDF);

  // Copiar link do orçamento (com quantidades)
  if (els.btnCopyLink){
    els.btnCopyLink.addEventListener('click', async () => {
      setUrlFromQty();
      const ok = await copyText(location.href);
      els.copyHint.textContent = ok ? "Link copiado!" : "Não foi possível copiar.";
      setTimeout(()=>els.copyHint.textContent="", 1400);
    });
  }

  // Salvar no histórico
  if (els.btnSaveHistory){
    els.btnSaveHistory.addEventListener('click', () => {
      const snap = snapshotCurrent();
      const hasAny = Object.keys(snap.qty || {}).length > 0;
      if (!hasAny){
        els.copyHint.textContent = "Nada para salvar (qtd = 0).";
        setTimeout(()=>els.copyHint.textContent="", 1400);
        return;
      }
      const entries = loadHistory();
      entries.unshift(snap);
      saveHistory(entries);
      els.copyHint.textContent = "Salvo no histórico.";
      setTimeout(()=>els.copyHint.textContent="", 1400);
      renderHistory();
    });
  }

  // Abrir histórico
  function openHistory(){ if (els.historyModal) els.historyModal.setAttribute("aria-hidden","false"); renderHistory(); }
  function closeHistory(){ if (els.historyModal) els.historyModal.setAttribute("aria-hidden","true"); }

  if (els.btnOpenHistory) els.btnOpenHistory.addEventListener('click', openHistory);
  if (els.historyModal){
    els.historyModal.addEventListener("click", (e) => { if (e.target?.dataset?.close) closeHistory(); });
  }

  // Limpar histórico
  if (els.btnClearHistory){
    els.btnClearHistory.addEventListener('click', () => {
      saveHistory([]);
      renderHistory();
    });
  }

  function fmtDate(ts){
    try{ return new Date(ts).toLocaleString("pt-BR"); } catch { return String(ts); }
  }

  function renderHistory(){
    if (!els.historyList || !els.historyEmpty) return;
    const entries = loadHistory();
    els.historyList.innerHTML = "";
    els.historyEmpty.style.display = entries.length ? "none" : "";

    entries.forEach((h, idx) => {
      const div = document.createElement("div");
      div.className = "history-item";

      const top = document.createElement("div");
      top.className = "h-top";

      const left = document.createElement("div");
      const title = document.createElement("div");
      title.className = "h-title";
      title.textContent = `Orçamento #${entries.length - idx}`;
      const meta = document.createElement("div");
      meta.className = "h-meta";
      const c = (h.client || "").trim();
      const n = (h.note || "").trim();
      meta.textContent = `${fmtDate(h.ts)}${c ? " • " + c : ""}${n ? " • " + n : ""}`;
      left.appendChild(title);
      left.appendChild(meta);

      const actions = document.createElement("div");
      actions.className = "h-actions";

      const btnLoad = document.createElement("button");
      btnLoad.className = "btn btn-ghost btn-sm";
      btnLoad.textContent = "Carregar";
      btnLoad.addEventListener("click", () => {
        // zerar e aplicar
        state.catalog.forEach(i => state.qty[i.id] = 0);
        for (const [id, q] of Object.entries(h.qty || {})){
          if (state.qty.hasOwnProperty(id)) state.qty[id] = Math.max(0, Number(q||0));
        }
        // UI
        els.body.querySelectorAll('tr').forEach((tr, rIdx) => {
          const item = state.catalog[rIdx];
          const inp = tr.querySelector('input.qty');
          if (inp && item) inp.value = state.qty[item.id] || 0;
        });
        if (els.clientName) els.clientName.value = h.client || "";
        if (els.clientNote) els.clientNote.value = h.note || "";
        renderTotals();
        applyFilters();
        setUrlFromQty();
        closeHistory();
      });

      const btnCopy = document.createElement("button");
      btnCopy.className = "btn btn-ghost btn-sm";
      btnCopy.textContent = "Copiar nota";
      btnCopy.addEventListener("click", async () => {
        // carregar e copiar nota sem fechar
        state.catalog.forEach(i => state.qty[i.id] = 0);
        for (const [id, q] of Object.entries(h.qty || {})){
          if (state.qty.hasOwnProperty(id)) state.qty[id] = Math.max(0, Number(q||0));
        }
        if (els.clientName) els.clientName.value = h.client || "";
        if (els.clientNote) els.clientNote.value = h.note || "";
        const ok = await copyText(buildReceiptText());
        els.copyHint.textContent = ok ? "Nota copiada!" : "Falhou 😕";
        setTimeout(()=>els.copyHint.textContent="", 1400);
      });

      const btnDel = document.createElement("button");
      btnDel.className = "btn btn-ghost btn-sm";
      btnDel.textContent = "Excluir";
      btnDel.addEventListener("click", () => {
        const arr = loadHistory();
        arr.splice(idx, 1);
        saveHistory(arr);
        renderHistory();
      });

      actions.appendChild(btnLoad);
      actions.appendChild(btnCopy);
      actions.appendChild(btnDel);

      top.appendChild(left);
      top.appendChild(actions);

      div.appendChild(top);
      els.historyList.appendChild(div);
    });
  }


  // Aplicar quantidades vindas do link (se houver)
  applyQtyFromUrl();
  renderTable();
    updateBrand();
}

init().catch(err => {
  console.error(err);
  alert("Erro ao carregar catalog.json.

1) Confirme que catalog.json está na RAIZ do repositório (mesmo nível do index.html).
2) Confira se o link do site corresponde ao repositório publicado.
   Ex.: se o repo é teste-321, o site deve ser /teste-321/

Se quiser, abra o DevTools (F12) > Console para ver o detalhe do erro.");
});
