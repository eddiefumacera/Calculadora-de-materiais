
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
      rows.push([name, String(q), fmtK(unit), fmtK(lineTotal)]);
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
    lines.push(`TOTAL: ${fmtK(t.valor)}k`);
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

function exportReceiptJPG(){
  let lines = buildReceiptLinesPlain();
  // evita repetir o nome no corpo (já está no cabeçalho)
  if (lines.length && lines[0].trim() === state.facName.trim()) lines = lines.slice(1);


  const pad = 52;
  const headerH = 150;
  const lineH = 34;

  // Limita linhas para evitar imagem gigantesca
  const maxLines = 120;
  let safeLines = lines.slice(0, maxLines);
  if (safeLines.length && /^=+$/.test(safeLines[0].trim())) safeLines = safeLines.slice(1);


  // largura proporcional ao texto (com limites para não ficar gigante)
  const measureCanvas = document.createElement("canvas");
  const mctx = measureCanvas.getContext("2d");
  mctx.font = "16px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";
  const maxLinePx = safeLines.reduce((mx, l) => Math.max(mx, mctx.measureText(l).width), 0);
  const W = Math.max(760, Math.min(920, Math.ceil(maxLinePx + pad*2)));

  const H = headerH + pad + safeLines.length * lineH + pad;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  // BG (clean premium)
  ctx.fillStyle = "#0b0c10";
  ctx.fillRect(0,0,W,H);

  // Gradientes sutis
  const g1 = ctx.createRadialGradient(220, 80, 10, 220, 80, 520);
  g1.addColorStop(0, "rgba(225,29,46,0.16)");
  g1.addColorStop(1, "rgba(225,29,46,0)");
  ctx.fillStyle = g1;
  ctx.fillRect(0,0,W,headerH+100);

  const g2 = ctx.createRadialGradient(W-220, 120, 10, W-220, 120, 560);
  g2.addColorStop(0, "rgba(255,255,255,0.06)");
  g2.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g2;
  ctx.fillRect(0,0,W,headerH+140);

  // Card principal
  const cardX = 36, cardY = 28, cardW = W-72, cardH = H-56;
  roundRect(ctx, cardX, cardY, cardW, cardH, 24);
  ctx.fillStyle = "rgba(16,16,22,0.78)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.10)";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Textura ultra discreta (noise)
  noiseOverlay(ctx, cardX, cardY, cardW, cardH, 0.04);

  // Watermark logo (se carregar)
  const logo = new Image();
  logo.crossOrigin = "anonymous";

  // Watermark logo (carrega como blob para evitar bloqueios de CORS/taint no canvas)
  const draw = () => {
    // Header line
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cardX, cardY + headerH);
    ctx.lineTo(cardX + cardW, cardY + headerH);
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.stroke();
    ctx.restore();

    // Text header
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.font = "900 32px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif";
    ctx.fillText(state.facName, cardX + pad + 112, cardY + 66);

    ctx.fillStyle = "rgba(255,255,255,0.70)";
    ctx.font = "600 16px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif";
    ctx.fillText("Orçamento / Lista", cardX + pad + 112, cardY + 92);

    // Date (optional)
    const now = new Date();
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.font = "12px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif";
    const stamp = now.toLocaleDateString("pt-BR") + " " + now.toLocaleTimeString("pt-BR", {hour:"2-digit", minute:"2-digit"});
    ctx.fillText(stamp, cardX + cardW - pad - ctx.measureText(stamp).width, cardY + 92);

    // Bloco cliente/obs (se houver)
    const client = (els.clientName && els.clientName.value ? els.clientName.value.trim() : "");
    const note = (els.clientNote && els.clientNote.value ? els.clientNote.value.trim() : "");
    let infoY = cardY + 112;

    if (client || note){
      ctx.fillStyle = "rgba(255,255,255,0.70)";
      ctx.font = "650 14px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif";
      if (client){
        ctx.fillText("Cliente:", cardX + pad + 112, infoY);
        ctx.fillStyle = "rgba(255,255,255,0.92)";
        ctx.font = "750 15px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif";
        ctx.fillText(clipLine(ctx, client, 420), cardX + pad + 175, infoY);
        infoY += 22;
      }
      if (note){
        ctx.fillStyle = "rgba(255,255,255,0.70)";
        ctx.font = "650 14px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif";
        ctx.fillText("Obs:", cardX + pad + 112, infoY);
        ctx.fillStyle = "rgba(255,255,255,0.90)";
        ctx.font = "650 14px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif";
        ctx.fillText(clipLine(ctx, note, 420), cardX + pad + 155, infoY);
      }
    }

    // Caixa de totais (direita)
    const totals = calcTotals();
    const boxW = 240;
    const boxH = 76;
    const boxX = cardX + cardW - pad - boxW;
    const boxY = cardY + 44;

    roundRect(ctx, boxX, boxY, boxW, boxH, 16);
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.10)";
    ctx.stroke();

    ctx.fillStyle = "rgba(255,255,255,0.72)";
    ctx.font = "800 11px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif";
    ctx.fillText("TOTAL", boxX + 14, boxY + 26);

    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.font = "900 22px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif";
    const totalK = Math.round(totals.valor);
    const totalMoney = totalK * 1000;
    const totalStr = `$${formatMoneyBR(totalMoney)}`;
    ctx.fillText(totalStr, boxX + 14, boxY + 54);

    ctx.fillStyle = "rgba(255,255,255,0.50)";
    ctx.font = "12px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";
    const modeLabel = (state.mode === "materials") ? "MATERIAIS" : (state.mode === "value" ? "VALORES" : "CALC");
    ctx.fillText(modeLabel, boxX + boxW - 14 - ctx.measureText(modeLabel).width, boxY + 26);

    // Pequena legenda de materiais (só no modo calculadora / materiais)
    if (state.mode !== "value"){
      const mline = `${state.materials.a}/${state.materials.b}/${state.materials.c}/${state.materials.d}/${state.materials.e}`;
      ctx.fillStyle = "rgba(255,255,255,0.40)";
      ctx.font = "11px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif";
      ctx.fillText(clipLine(ctx, mline, boxW-28), boxX + 14, boxY + 72);
    }




    // === Materiais (2 colunas) ===
    if (state.mode !== "value"){
      const mats = calcTotals();
      const materialsList = [
        ["Material A", mats.a],
        ["Material B", mats.b],
        ["Material C", mats.c],
        ["Material D", mats.d],
        ["Material E", mats.e],
      ];
      const colX1 = cardX + pad;
      const colX2 = cardX + cardW/2;
      let matY = cardY + headerH + 10;

      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.font = "700 14px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif";
      ctx.fillText("MATERIAIS", colX1, matY);
      matY += 22;

      ctx.font = "14px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif";
      materialsList.forEach((m, i) => {
        const txt = `${m[0]}: ${m[1]}`;
        const x = (i % 2 === 0) ? colX1 : colX2;
        const y = matY + Math.floor(i/2) * 24;
        ctx.fillText(txt, x, y);
      });
    }

    // Body text (mono)

    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.font = "15px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif";

    // Draw lines with safe clipping
    const maxW = cardX + cardW - pad;
    let y = cardY + headerH + 44;
    safeLines.forEach(line => {
      const clipped = clipLine(ctx, line, maxW - (cardX + pad));
      ctx.fillText(clipped, cardX + pad, y);
      y += lineH;
    });

    // Export
    canvas.toBlob((blob) => {
      if (!blob) { alert("Falha ao gerar imagem (canvas bloqueado). Tente Ctrl+F5 e confira o logo em assets/logo.png"); return; }
      
      // === FAIXA TOTAL FINAL ===
      const totalBoxH = 70;
      const totalBoxY = cardY + cardH - totalBoxH - 20;
      roundRect(ctx, cardX + pad, totalBoxY, cardW - pad*2, totalBoxH, 18);
      ctx.fillStyle = "rgba(225,29,46,0.12)";
      ctx.fill();
      ctx.strokeStyle = "rgba(225,29,46,0.35)";
      ctx.stroke();

      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.font = "900 24px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif";
      const finalStr = formatKAsMoney(calcTotals().valor);
      ctx.fillText("TOTAL GERAL: " + finalStr, cardX + pad + 20, totalBoxY + 44);

      downloadBlobUrl(blob, "orcamento_tropa_da_lb.jpg");

    }, "image/jpeg", 0.92);
  };


  const logoUrl = "assets/logo.png";
  const tryExport = async () => {
    try{
      const res = await fetch(logoUrl, { cache: "no-store" });
      if (!res.ok) throw new Error("logo fetch failed");
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);

      const img = new Image();
      img.onload = () => {
        // Logo badge
        const badgeX = cardX + pad;
        const badgeY = cardY + 36;
        const s = 84;

        roundRect(ctx, badgeX, badgeY, s+26, s+26, 18);
        ctx.fillStyle = "rgba(0,0,0,0.28)";
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.10)";
        ctx.stroke();

        drawImageContain(ctx, img, badgeX+13, badgeY+13, s, s);

        // Watermark
        const wmSize = 620;
        const wmX = Math.floor(cardX + (cardW - wmSize)/2);
        const wmY = Math.floor(cardY + 120);
        ctx.save();
        ctx.globalAlpha = 0.10;
        ctx.filter = "contrast(170%) brightness(125%) saturate(120%)";
        drawImageContain(ctx, img, wmX, wmY, wmSize, wmSize);
        ctx.restore();

        URL.revokeObjectURL(objUrl);
        draw();
      };
      img.onerror = () => { URL.revokeObjectURL(objUrl); draw(); };
      img.src = objUrl;
    }catch(e){
      draw(); // exporta mesmo sem logo
    }
  };

  tryExport();
}


function drawImageContain(ctx, img, x, y, w, h){
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih){ ctx.drawImage(img, x, y, w, h); return; }
  const s = Math.min(w/iw, h/ih);
  const dw = iw*s;
  const dh = ih*s;
  const dx = x + (w - dw)/2;
  const dy = y + (h - dh)/2;
  ctx.drawImage(img, dx, dy, dw, dh);
}
function formatMoneyBR(value){
  try{
    return new Intl.NumberFormat("pt-BR").format(Math.round(value));
  }catch(e){
    // fallback simples
    const s = String(Math.round(value));
    return s.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }
}

function clipLine(ctx, line, maxWidth){
  // corta com reticências se passar
  if (ctx.measureText(line).width <= maxWidth) return line;
  let s = line;
  while (s.length > 0 && ctx.measureText(s + "…").width > maxWidth){
    s = s.slice(0, -1);
  }
  return s.length ? (s + "…") : "";
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

function noiseOverlay(ctx, x, y, w, h, alpha){
  // ruído simples (sem libs)
  const img = ctx.getImageData(x, y, w, h);
  const d = img.data;
  for (let i=0; i<d.length; i+=4){
    const n = (Math.random()*255)|0;
    d[i] = d[i] + (n-128)*alpha;
    d[i+1] = d[i+1] + (n-128)*alpha;
    d[i+2] = d[i+2] + (n-128)*alpha;
  }
  ctx.putImageData(img, x, y);
}

/* ---------- init ---------- */
async function init(){
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
