
"use strict";

/**
 * Calculadora de materiais (site estático, sem dependências)
 * - Catálogo em catalog.json
 * - URL share com quantidades: ?q=item_01:2,item_02:1
 * - Histórico (localStorage)
 * - Modos: calculadora / valores / materiais
 * - Ordena itens selecionados (qtd>0) no topo
 * - Toggle "somente selecionados"
 */

const els = {
  facName: document.getElementById("facName"),
  modeChip: document.getElementById("modeChip"),
  modeMenu: document.getElementById("modeMenu"),
  btnReset: document.getElementById("btnReset"),
  btnReceipt: document.getElementById("btnReceipt"),

  searchInput: document.getElementById("searchInput"),
  categorySelect: document.getElementById("categorySelect"),
  toggleOnlySelected: document.getElementById("toggleOnlySelected"),

  tbody: document.getElementById("tbody"),

  labA: document.getElementById("labA"),
  labB: document.getElementById("labB"),
  labC: document.getElementById("labC"),
  labD: document.getElementById("labD"),
  labE: document.getElementById("labE"),

  totA: document.getElementById("totA"),
  totB: document.getElementById("totB"),
  totC: document.getElementById("totC"),
  totD: document.getElementById("totD"),
  totE: document.getElementById("totE"),
  totV: document.getElementById("totV"),

  modal: document.getElementById("modal"),
  modalBackdrop: document.getElementById("modalBackdrop"),
  btnClose: document.getElementById("btnClose"),
  clientName: document.getElementById("clientName"),
  clientNote: document.getElementById("clientNote"),
  receiptText: document.getElementById("receiptText"),
  btnCopy: document.getElementById("btnCopy"),
  btnCopyLink: document.getElementById("btnCopyLink"),
  btnExportJPG: document.getElementById("btnExportJPG"),

  btnSaveHistory: document.getElementById("btnSaveHistory"),
  btnClearHistory: document.getElementById("btnClearHistory"),
  historyList: document.getElementById("historyList"),
};

const state = {
  facName: "TROPA DA LB",
  materials: { a: "Material A", b: "Material B", c: "Material C", d: "Material D", e: "Material E" },
  itemNames: {},
  categoryNames: {},
  catalog: [],
  itemById: {},
  qty: {},

  mode: "normal", // normal | value | materials
  onlySelected: false,
};

const LS_HISTORY = "calc_rp_history_v1";

/* ---------- helpers ---------- */
function fmt(n){
  const v = Number(n || 0);
  return String(Math.round(v));
}
function fmtK(n){
  const v = Number(n || 0);
  return String(Math.round(v));
}
function getItemName(item){
  return (state.itemNames && state.itemNames[item.id]) ? state.itemNames[item.id] : (item.name || "");
}
function getCategoryName(item){
  const raw = (item.category || "").trim();
  return (state.categoryNames && state.categoryNames[raw]) ? state.categoryNames[raw] : raw;
}
function currentModeLabel(){
  if (state.mode === "value") return "Valores";
  if (state.mode === "materials") return "Materiais";
  return "Calculadora";
}
function setMode(mode){
  state.mode = mode;
  // update chip classes/text
  els.modeChip.textContent = currentModeLabel();
  els.modeChip.classList.remove("is-normal","is-value","is-materials");
  if (mode === "value") els.modeChip.classList.add("is-value");
  else if (mode === "materials") els.modeChip.classList.add("is-materials");
  else els.modeChip.classList.add("is-normal");

  updateModeMenuActive();
  applyColumnVisibility();
  renderTotals();
  renderReceipt();
}
function updateModeMenuActive(){
  if (!els.modeMenu) return;
  els.modeMenu.querySelectorAll(".menuitem").forEach(btn => {
    btn.classList.toggle("is-active", btn.dataset.mode === state.mode);
  });
}

/* Robust fetch for GitHub Pages (repo path / subpath) */
async function fetchCatalog(){
  const basePath = location.pathname.endsWith("/") ? location.pathname : (location.pathname + "/");
  const repo = basePath.split("/").filter(Boolean)[0] || "";
  const repoPath = repo ? `/${repo}/` : "/";

  const candidates = [
    "./catalog.json",
    "catalog.json",
    basePath + "catalog.json",
    repoPath + "catalog.json",
  ];

  let lastErr = null;
  for (const url of candidates){
    try{
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) { lastErr = new Error(`HTTP ${res.status} em ${url}`); continue; }
      const data = await res.json();
      return data;
    }catch(e){
      lastErr = e;
    }
  }
  throw lastErr || new Error("Falha ao carregar catalog.json");
}

/* ---------- URL share ---------- */
function parseQtyFromUrl(){
  const p = new URLSearchParams(location.search);
  const q = (p.get("q") || "").trim();
  const out = {};
  if (!q) return out;
  // q=item_01:2,item_02:1
  q.split(",").forEach(part => {
    const [id, val] = part.split(":");
    const v = Number(val || 0);
    if (id && Number.isFinite(v) && v > 0) out[id] = Math.floor(v);
  });
  return out;
}
function setUrlFromQty(){
  const parts = [];
  for (const [id, q] of Object.entries(state.qty)){
    const v = Number(q || 0);
    if (v > 0) parts.push(`${id}:${Math.floor(v)}`);
  }
  const p = new URLSearchParams(location.search);
  if (parts.length) p.set("q", parts.join(","));
  else p.delete("q");
  const url = `${location.pathname}${p.toString() ? "?" + p.toString() : ""}${location.hash || ""}`;
  history.replaceState({}, "", url);
}
async function copyText(text){
  await navigator.clipboard.writeText(text);
}

/* ---------- calculations ---------- */
function calcTotals(){
  const t = { a:0,b:0,c:0,d:0,e:0, valor:0 };
  for (const item of state.catalog){
    const q = Number(state.qty[item.id] || 0);
    if (q <= 0) continue;

    const r = item.recipe || {};
    t.a += (Number(r.a||0) * q);
    t.b += (Number(r.b||0) * q);
    t.c += (Number(r.c||0) * q);
    t.d += (Number(r.d||0) * q);
    t.e += (Number(r.e||0) * q);
    t.valor += (Number(item.value_k||0) * q);
  }
  return t;
}

/* ---------- rendering ---------- */
function applyColumnVisibility(){
  const showCats = true;
  const showQty = (state.mode !== "value"); // valores: ainda mostra qtd? sim, mantém. Vamos manter sempre.
  const showMats = (state.mode !== "value"); // no modo valores, esconder materiais
  const showVal = (state.mode !== "materials"); // no modo materiais, esconder valor

  document.querySelectorAll(".col-cat").forEach(el => el.style.display = showCats ? "" : "none");
  document.querySelectorAll(".col-qty").forEach(el => el.style.display = showQty ? "" : "");
  document.querySelectorAll(".col-mat").forEach(el => el.style.display = showMats ? "" : "none");
  document.querySelectorAll(".col-val, .col-value").forEach(el => el.style.display = showVal ? "" : "none");
}

function renderCategorySelect(){
  const rawCats = [...new Set(state.catalog.map(i => (i.category||"").trim()).filter(Boolean))];
  const cats = rawCats
    .map(c => state.categoryNames[c] || c)
    .sort((a,b)=>a.localeCompare(b,"pt-BR"));

  const sel = els.categorySelect;
  sel.innerHTML = `<option value="">Todas</option>` + cats.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");
}

function rowMatchesFilters(tr){
  const q = (els.searchInput.value || "").trim().toLowerCase();
  const cat = (els.categorySelect.value || "").trim();
  const id = tr.dataset.id || "";
  const name = (tr.dataset.name || "").toLowerCase();
  const rowCat = (tr.dataset.category || "");
  const qty = Number(state.qty[id] || 0);

  const okName = !q || name.includes(q);
  const okCat = !cat || rowCat === cat;
  const okSel = !state.onlySelected || qty > 0;
  return okName && okCat && okSel;
}

function applyFilters(){
  els.tbody.querySelectorAll("tr").forEach(tr => {
    tr.style.display = rowMatchesFilters(tr) ? "" : "none";
  });
}

function renderTable(){
  // Sort selected to top, then by qty desc, then name
  const items = [...state.catalog].sort((a,b) => {
    const qa = Number(state.qty[a.id] || 0);
    const qb = Number(state.qty[b.id] || 0);
    if ((qb>0) !== (qa>0)) return (qb>0) - (qa>0);
    return (a.__idx ?? 0) - (b.__idx ?? 0);
  });

  const rowsHtml = items.map(item => {
    const id = item.id;
    const name = getItemName(item);
    const cat = getCategoryName(item);
    const q = Number(state.qty[id] || 0);
    const r = item.recipe || {};
    const a = Number(r.a||0) * q;
    const b = Number(r.b||0) * q;
    const c = Number(r.c||0) * q;
    const d = Number(r.d||0) * q;
    const e = Number(r.e||0) * q;
    const val = Number(item.value_k||0) * q;

    return `
      <tr data-id="${escapeHtml(id)}" data-name="${escapeHtml(name)}" data-category="${escapeHtml(cat)}" class="${q>0 ? "has-qty" : ""}">
        <td class="item">${escapeHtml(name)}</td>
        <td class="cat col-cat">${escapeHtml(cat || "-")}</td>
        <td class="qty col-qty">
          <div class="qtybox">
            <button class="qbtn" data-act="dec" data-id="${escapeHtml(id)}" type="button">−</button>
            <input class="qtyinput" data-act="set" data-id="${escapeHtml(id)}" inputmode="numeric" value="${fmt(q)}" />
            <button class="qbtn" data-act="inc" data-id="${escapeHtml(id)}" type="button">+</button>
          </div>
        </td>
        <td class="mat col-mat col-a" data-mat="a">${fmt(a)}</td>
        <td class="mat col-mat col-b" data-mat="b">${fmt(b)}</td>
        <td class="mat col-mat col-c" data-mat="c">${fmt(c)}</td>
        <td class="mat col-mat col-d" data-mat="d">${fmt(d)}</td>
        <td class="mat col-mat col-e" data-mat="e">${fmt(e)}</td>
        <td class="val col-val col-value">${fmtK(val)}</td>
      </tr>
    `;
  }).join("");

  els.tbody.innerHTML = rowsHtml;
  applyColumnVisibility();
  applyFilters();
  renderTotals();
}

function renderTotals(){
  const t = calcTotals();

  els.labA.textContent = state.materials.a;
  els.labB.textContent = state.materials.b;
  els.labC.textContent = state.materials.c;
  els.labD.textContent = state.materials.d;
  els.labE.textContent = state.materials.e;

  // header labels too
  document.querySelectorAll('[data-mat="a"]').forEach(el => el.tagName === "TH" && (el.textContent = state.materials.a));
  document.querySelectorAll('[data-mat="b"]').forEach(el => el.tagName === "TH" && (el.textContent = state.materials.b));
  document.querySelectorAll('[data-mat="c"]').forEach(el => el.tagName === "TH" && (el.textContent = state.materials.c));
  document.querySelectorAll('[data-mat="d"]').forEach(el => el.tagName === "TH" && (el.textContent = state.materials.d));
  document.querySelectorAll('[data-mat="e"]').forEach(el => el.tagName === "TH" && (el.textContent = state.materials.e));

  els.totA.textContent = fmt(t.a);
  els.totB.textContent = fmt(t.b);
  els.totC.textContent = fmt(t.c);
  els.totD.textContent = fmt(t.d);
  els.totE.textContent = fmt(t.e);
  els.totV.textContent = fmtK(t.valor);
}

/* ---------- Receipt (Discord-friendly columns) ---------- */
function buildReceiptText(){
  const t = calcTotals();

  const lines = [];
  lines.push(state.facName);
  lines.push("================================");

  const client = (els.clientName.value || "").trim();
  const note = (els.clientNote.value || "").trim();
  if (client) lines.push(`Cliente: ${client}`);
  if (note) lines.push(`Obs: ${note}`);
  if (client || note) lines.push("");

  // rows
  const rows = [];
  const items = [...state.catalog].sort((a,b) => {
    const qa = Number(state.qty[a.id] || 0);
    const qb = Number(state.qty[b.id] || 0);
    if ((qb>0) !== (qa>0)) return (qb>0) - (qa>0);
    return (a.__idx ?? 0) - (b.__idx ?? 0);
  });

  for (const item of items){
    const q = Number(state.qty[item.id] || 0);
    if (q <= 0) continue;

    const name = getItemName(item);
    const unit = Number(item.value_k || 0);
    const lineTotal = unit * q;

    if (state.mode === "materials"){
      rows.push([name, String(q)]);
    } else {
      // calculadora e valores: mostrar unit e parcial
      rows.push([name, String(q), formatKAsMoney(unit), formatKAsMoney(lineTotal)]);
    }
  }

  lines.push("Itens:");
  if (!rows.length){
    lines.push("• (nenhum)");
    lines.push("");
  } else if (state.mode === "materials"){
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

  // materiais no modo calculadora e materiais
  if (state.mode !== "value"){
    lines.push("Materiais:");
    lines.push(`• ${state.materials.a}: ${fmt(t.a)}`);
    lines.push(`• ${state.materials.b}: ${fmt(t.b)}`);
    lines.push(`• ${state.materials.c}: ${fmt(t.c)}`);
    lines.push(`• ${state.materials.d}: ${fmt(t.d)}`);
    lines.push(`• ${state.materials.e}: ${fmt(t.e)}`);
    lines.push("");
  }

  // total no modo calculadora e valores
  if (state.mode !== "materials"){
    lines.push(`TOTAL: ${formatKAsMoney(t.valor)}`);
  }

  return lines.join("\n");
}

function renderReceipt(){
  if (els.modal.getAttribute("aria-hidden") === "true") return;
  els.receiptText.textContent = buildReceiptText();
}

/* ---------- History ---------- */
function loadHistory(){
  try{
    const raw = localStorage.getItem(LS_HISTORY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  }catch{
    return [];
  }
}
function saveHistory(arr){
  localStorage.setItem(LS_HISTORY, JSON.stringify(arr.slice(0, 50)));
}
function buildSnapshot(){
  const now = new Date();
  const t = calcTotals();
  const qty = {};
  Object.keys(state.qty).forEach(k => {
    const v = Number(state.qty[k] || 0);
    if (v > 0) qty[k] = Math.floor(v);
  });
  return {
    id: String(Date.now()),
    at: now.toISOString(),
    client: (els.clientName.value || "").trim(),
    note: (els.clientNote.value || "").trim(),
    qty,
    total_k: Math.round(t.valor),
  };
}
function applySnapshot(snap){
  state.qty = {};
  for (const [id, q] of Object.entries(snap.qty || {})){
    const v = Number(q || 0);
    if (v > 0) state.qty[id] = Math.floor(v);
  }
  els.clientName.value = snap.client || "";
  els.clientNote.value = snap.note || "";
  setUrlFromQty();
  renderTable();
  renderReceipt();
}
function renderHistory(){
  const arr = loadHistory();
  if (!arr.length){
    els.historyList.innerHTML = `<div class="hitem"><div><b>Vazio</b><small>Nenhuma nota salva ainda.</small></div></div>`;
    return;
  }
  const html = arr.map(s => {
    const dt = new Date(s.at);
    const label = `${dt.toLocaleDateString("pt-BR")} ${dt.toLocaleTimeString("pt-BR", {hour:"2-digit", minute:"2-digit"})}`;
    const who = s.client ? ` • ${escapeHtml(s.client)}` : "";
    return `
      <div class="hitem">
        <div>
          <b>${fmtK(s.total_k)}k${who}</b>
          <small>${escapeHtml(label)}</small>
        </div>
        <div class="hbtns">
          <button class="btn" data-hact="load" data-hid="${escapeHtml(s.id)}" type="button">Carregar</button>
          <button class="btn" data-hact="copy" data-hid="${escapeHtml(s.id)}" type="button">Copiar</button>
          <button class="btn" data-hact="del" data-hid="${escapeHtml(s.id)}" type="button">Excluir</button>
        </div>
      </div>
    `;
  }).join("");
  els.historyList.innerHTML = html;
}

/* ---------- events ---------- */
function openModal(){
  els.modal.setAttribute("aria-hidden","false");
  renderReceipt();
  renderHistory();
}
function closeModal(){
  els.modal.setAttribute("aria-hidden","true");
}

function cycleMode(){
  if (state.mode === "normal") setMode("value");
  else if (state.mode === "value") setMode("materials");
  else setMode("normal");
}

function openModeMenu(){
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

function setQty(id, newVal){
  if (!state.itemById[id]) return;
  const v = Math.max(0, Math.floor(Number(newVal || 0)));
  if (v === 0) delete state.qty[id];
  else state.qty[id] = v;

  setUrlFromQty();
  renderTable(); // keep selected on top
  if (els.modal.getAttribute("aria-hidden") === "false") renderReceipt();
}

function handleTableClick(e){
  const btn = e.target.closest("button.qbtn");
  if (!btn) return;
  const id = btn.dataset.id;
  const act = btn.dataset.act;
  const cur = Number(state.qty[id] || 0);

  if (act === "inc") setQty(id, cur + 1);
  if (act === "dec") setQty(id, Math.max(0, cur - 1));
}

function handleTableInput(e){
  const input = e.target;
  if (!input.classList.contains("qtyinput")) return;
  const id = input.dataset.id;
  const v = Number(String(input.value).replace(/[^\d]/g,"") || 0);
  // don't rerender every keystroke; commit on blur or enter
  input.dataset.pending = String(v);
}
function handleTableCommit(e){
  const input = e.target;
  if (!input.classList.contains("qtyinput")) return;
  const id = input.dataset.id;
  const pending = Number(input.dataset.pending || input.value || 0);
  setQty(id, pending);
}
function handleQtyKeydown(e){
  const input = e.target;
  if (!input.classList.contains("qtyinput")) return;
  if (e.key === "Enter"){
    input.blur();
  }
}

/* ---------- sanitize ---------- */
function escapeHtml(str){
  return String(str)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}



/* ---------- Formatação de dinheiro (k = mil) ---------- */
function moneyFromK(k){
  const n = Math.round(Number(k) || 0) * 1000;
  return n;
}
function formatMoney(n){
  try{ return "$" + new Intl.NumberFormat("pt-BR").format(Math.round(Number(n)||0)); }
  catch(e){
    const s = String(Math.round(Number(n)||0));
    return "$" + s.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }
}

function formatInt(n){
  const v = Math.round(Number(n) || 0);
  try{
    return new Intl.NumberFormat('pt-BR').format(v);
  }catch(_){
    return String(v).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }
}



function formatInt(n){
  const v = Math.round(Number(n) || 0);
  try{
    return new Intl.NumberFormat('pt-BR').format(v);
  }catch(_){
    // Fallback: dot as thousands separator
    return String(v).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }
}

function formatKAsMoney(k){
  return formatMoney(moneyFromK(k));
}

/* ---------- Export (JPG) — layout B (clean, identidade visual) ---------- */
function buildReceiptLinesPlain(){
  // Texto sem blocos ``` para export de imagem
  const text = buildReceiptText();
  const lines = text.split("\n").filter(l => l !== "```");
  return lines;
}

function downloadBlobUrl(blob, filename){
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}



function roundRect(ctx, x, y, w, h, r){
  const min = Math.min(w,h);
  if (r > min/2) r = min/2;
  ctx.beginPath();
  ctx.moveTo(x+r, y);
  ctx.arcTo(x+w, y, x+w, y+h, r);
  ctx.arcTo(x+w, y+h, x, y+h, r);
  ctx.arcTo(x, y+h, x, y, r);
  ctx.arcTo(x, y, x+w, y, r);
  ctx.closePath();
}

async function exportReceiptJPG(){
  try{
  let lines = buildReceiptLinesPlain();

  // remove repetição do nome no corpo
  if (lines.length && lines[0].trim() === state.facName.trim()) lines = lines.slice(1);

  const pad = 60;
  const lineH = 30;
  const headerH = 170;

  const maxLines = 120;
  const safeLines = lines.slice(0, maxLines);

  const measureCanvas = document.createElement("canvas");
  const mctx = measureCanvas.getContext("2d");
  mctx.font = "15px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif";
  const maxLinePx = safeLines.reduce((mx, l) => Math.max(mx, mctx.measureText(l).width), 0);

  const W = Math.max(820, Math.min(960, Math.ceil(maxLinePx + pad*2)));
  const H = headerH + pad + safeLines.length * lineH + 140;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  // fundo
  ctx.fillStyle = "#0b0c10";
  ctx.fillRect(0,0,W,H);

  // card principal
  const cardX = 40;
  const cardY = 40;
  const cardW = W - 80;
  const cardH = H - 80;

  roundRect(ctx, cardX, cardY, cardW, cardH, 24);
  ctx.fillStyle = "rgba(18,18,24,0.92)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.10)";
  ctx.stroke();

  // LOGO (same as preview)
  const logoEl = document.querySelector('img.logo');
  let logoH = 0;
  if(logoEl){
    try{
      if(!logoEl.complete){
        await new Promise((resolve)=>{ logoEl.onload = resolve; logoEl.onerror = resolve; });
      }
      const maxW = 140;
      const maxH = 46;
      const ratio = (logoEl.naturalWidth || 1) / (logoEl.naturalHeight || 1);
      let w = Math.min(maxW, ratio * maxH);
      let h = w / ratio;
      if(h > maxH){ h = maxH; w = ratio * h; }
      const x = cardX + pad;
      const y = cardY + pad + 2;
      ctx.globalAlpha = 0.98;
      ctx.drawImage(logoEl, x, y, w, h);
      ctx.globalAlpha = 1;
      logoH = h;
    }catch(_){}
  }




  // LOGO (same as preview)
  const logoEl = document.querySelector('img.logo');
  let logoH = 0;
  if(logoEl){
    try{
      if(!logoEl.complete){
        await new Promise((resolve)=>{ logoEl.onload = resolve; logoEl.onerror = resolve; });
      }
      const maxW = 140;
      const maxH = 46;
      const ratio = (logoEl.naturalWidth || 1) / (logoEl.naturalHeight || 1);
      let w = Math.min(maxW, ratio * maxH);
      let h = w / ratio;
      if(h > maxH){ h = maxH; w = ratio * h; }
      const x = cardX + pad;
      const y = cardY + pad + 2;
      ctx.globalAlpha = 0.98;
      ctx.drawImage(logoEl, x, y, w, h);
      ctx.globalAlpha = 1;
      logoH = h;
    }catch(_){}
  }


  // HEADER
  const headerShift = logoH ? 34 : 0;
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.font = "900 32px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif";
  ctx.fillText(state.facName, cardX + pad + 100, cardY + 70 + headerShift);

  ctx.font = "600 16px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.70)";
  ctx.fillText("Orçamento / Lista", cardX + pad + 100, cardY + 100 + headerShift);

  // TOTAL BOX
  const totals = calcTotals();
  const totalBoxW = 260;
  const totalBoxH = 90;
  const totalBoxX = cardX + cardW - pad - totalBoxW;
  const totalBoxY = cardY + 50;

  roundRect(ctx, totalBoxX, totalBoxY, totalBoxW, totalBoxH, 18);
  ctx.fillStyle = "rgba(225,29,46,0.10)";
  ctx.fill();
  ctx.strokeStyle = "rgba(225,29,46,0.35)";
  ctx.stroke();

  ctx.fillStyle = "rgba(255,255,255,0.80)";
  ctx.font = "700 13px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif";
  ctx.fillText("TOTAL", totalBoxX + 18, totalBoxY + 28);

  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.font = "900 26px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif";
  ctx.fillText(formatKAsMoney(totals.valor), totalBoxX + 18, totalBoxY + 60);

  // linha separadora
  ctx.beginPath();
  ctx.moveTo(cardX + pad, cardY + headerH);
  ctx.lineTo(cardX + cardW - pad, cardY + headerH);
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.stroke();

  // CORPO
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.font = "15px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif";

  let y = cardY + headerH + 40;

  safeLines.forEach(line => {
    ctx.fillText(line, cardX + pad, y);
    y += lineH;
  });

  canvas.toBlob((blob) => {
    if (!blob){
      alert("Erro ao gerar imagem.");
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "orcamento_tropa_da_lb.jpg";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }, "image/jpeg", 0.92);
  }catch(err){
    console.error(err);
    alert('Erro ao exportar JPG. Abra o Console (F12) para ver detalhes.');
  }

}


/* ---------- init ---------- */
async function init(){
  // cache-bust do logo (evita sumir por cache após updates)
  const logoImg = document.querySelector('img.logo');
  if (logoImg && logoImg.getAttribute('data-logo')){
    logoImg.src = 'assets/logo.png?v=' + Date.now();
  }

  const catalog = await fetchCatalog();

  state.facName = catalog.fac_name || state.facName;
  state.materials = { ...state.materials, ...(catalog.materials || {}) };
  state.itemNames = catalog.item_names || {};
  state.categoryNames = catalog.category_names || {};
  state.catalog = Array.isArray(catalog.items) ? catalog.items : [];
  // índice estável para manter a ordem original
  state.catalog.forEach((it, idx) => { it.__idx = idx; });
  state.itemById = Object.fromEntries(state.catalog.map(i => [i.id, i]));

  if (els.facName) els.facName.textContent = state.facName;

  // load qty from url
  const qFromUrl = parseQtyFromUrl();
  state.qty = { ...qFromUrl };

  renderCategorySelect();
  setMode("normal");
  renderTable();

  // chip click & context menu
  els.modeChip.addEventListener("click", cycleMode);
  els.modeChip.addEventListener("contextmenu", (e) => { e.preventDefault(); openModeMenu(); });

  // menu actions
  els.modeMenu.addEventListener("click", (e) => {
    const btn = e.target.closest(".menuitem");
    if (!btn) return;
    setMode(btn.dataset.mode);
    closeModeMenu();
  });

  document.addEventListener("click", (e) => {
    const open = els.modeMenu.getAttribute("aria-hidden") === "false";
    if (!open) return;
    const inside = (e.target === els.modeChip) || els.modeMenu.contains(e.target);
    if (!inside) closeModeMenu();
  });
  window.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModeMenu(); });

  // filters
  els.searchInput.addEventListener("input", applyFilters);
  els.categorySelect.addEventListener("change", applyFilters);
  els.toggleOnlySelected.addEventListener("click", () => {
    state.onlySelected = !state.onlySelected;
    els.toggleOnlySelected.classList.toggle("is-active", state.onlySelected);
    applyFilters();
  });
// table events
  els.tbody.addEventListener("click", handleTableClick);
  els.tbody.addEventListener("input", handleTableInput);
  els.tbody.addEventListener("blur", handleTableCommit, true);
  els.tbody.addEventListener("keydown", handleQtyKeydown);

  // reset
  els.btnReset.addEventListener("click", () => {
    state.qty = {};
    setUrlFromQty();
    renderTable();
    if (els.modal.getAttribute("aria-hidden") === "false") renderReceipt();
  });

  // modal
  els.btnReceipt.addEventListener("click", openModal);
  els.modalBackdrop.addEventListener("click", closeModal);
  els.btnClose.addEventListener("click", closeModal);

  els.clientName.addEventListener("input", renderReceipt);
  els.clientNote.addEventListener("input", renderReceipt);

  // copy
  els.btnCopy.addEventListener("click", async () => {
    await copyText(buildReceiptText());
  });
  els.btnCopyLink.addEventListener("click", async () => {
    await copyText(location.href);
  });

  if (els.btnExportJPG) els.btnExportJPG.addEventListener("click", exportReceiptJPG);

  // history
  els.btnSaveHistory.addEventListener("click", () => {
    const arr = loadHistory();
    arr.unshift(buildSnapshot());
    saveHistory(arr);
    renderHistory();
  });
  els.btnClearHistory.addEventListener("click", () => {
    saveHistory([]);
    renderHistory();
  });
  els.historyList.addEventListener("click", async (e) => {
    const b = e.target.closest("button[data-hact]");
    if (!b) return;
    const act = b.dataset.hact;
    const id = b.dataset.hid;
    const arr = loadHistory();
    const snap = arr.find(x => x.id === id);
    if (!snap) return;

    if (act === "load") applySnapshot(snap);
    if (act === "copy"){
      // temporarily apply snapshot for text, without overwriting current
      const curQty = { ...state.qty };
      const curClient = els.clientName.value;
      const curNote = els.clientNote.value;

      applySnapshot(snap);
      await copyText(buildReceiptText());

      state.qty = curQty;
      els.clientName.value = curClient;
      els.clientNote.value = curNote;
      setUrlFromQty();
      renderTable();
      renderReceipt();
    }
    if (act === "del"){
      const next = arr.filter(x => x.id !== id);
      saveHistory(next);
      renderHistory();
    }
  });
}

try{
  init();
}catch(err){
  console.error(err);
  const el = document.getElementById("fatalError");
  if (el) el.setAttribute("aria-hidden","false");
}
