// Calculadora RP (genérica). Edite catalog.json para nomes/categorias/valores.
// Materiais são genéricos: A–E.

const state = { catalog: [], qty: {}, showMaterials: true, showCategory: true, onlyValue: false, onlyMaterials: false, materialLabels: { a:'Material A', b:'Material B', c:'Material C', d:'Material D', e:'Material E' } };

const els = {
  brandTitle: document.getElementById("brandTitle"),
  brandSubtitle: document.getElementById("brandSubtitle"),
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

function applyLabels(){
  document.querySelectorAll('[data-label]').forEach(el => {
    const k = el.getAttribute('data-label');
    if (k && state.materialLabels[k]) el.textContent = state.materialLabels[k];
  });
}


function updateBrand(){
  if (!els.brandTitle || !els.brandSubtitle) return;
  if (state.onlyValue) {
    els.brandTitle.textContent = "Nota (valor)";
    els.brandSubtitle.textContent = "Mostrando apenas valores • gere nota rápida";
  } else if (state.onlyMaterials) {
    els.brandTitle.textContent = "Materiais";
    els.brandSubtitle.textContent = "Mostrando apenas materiais e quantidades";
  } else {
    els.brandTitle.textContent = "Calculadora RP";
    els.brandSubtitle.textContent = "Preencha quantidades • veja totais • gere nota";
  }
}

function calcTotals(){
  const t = { a:0, b:0, c:0, d:0, e:0, valor:0 };
  for (const item of state.catalog){
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

function renderTotals(){
  const t = calcTotals();
  ["a","b","c","d","e"].forEach(k => {
    const el = els.totals.querySelector(`.value[data-k="${k}"]`);
    if (el) el.textContent = fmt(t[k]);
  });
  const v = els.totals.querySelector(`.value[data-k="valor"]`);
  if (v) v.textContent = fmtK(t.valor);

  const rows = els.body.querySelectorAll("tr");
  rows.forEach((tr, idx) => {
    const item = state.catalog[idx];
    const q = Number(state.qty[item.id] || 0);
    const r = item.recipe || {};
    const map = { a:r.a||0, b:r.b||0, c:r.c||0, d:r.d||0, e:r.e||0 };
    tr.querySelectorAll("td.mat").forEach(td => td.textContent = fmt((map[td.dataset.k]||0) * q));
    tr.querySelector("td.val").textContent = fmtK((item.value_k||0) * q);
  });
}

function renderTable(){
  els.body.innerHTML = "";
  for (const item of state.catalog){
    const tr = document.createElement("tr");

    const tdItem = document.createElement("td");
    tdItem.className = "item";
    tdItem.textContent = item.name;
    tr.appendChild(tdItem);

    const tdCat = document.createElement("td");
    tdCat.textContent = item.category || "-";
    tr.appendChild(tdCat);

    const tdQty = document.createElement("td");
    const input = document.createElement("input");
    input.className = "qty";
    input.type = "number";
    input.min = "0";
    input.step = "1";
    input.value = state.qty[item.id] ?? 0;
    input.addEventListener("input", () => {
      state.qty[item.id] = Math.max(0, Number(input.value || 0));
      renderTotals();
      if (els.modal.getAttribute("aria-hidden") === "false") renderReceipt();
    });
    tdQty.appendChild(input);
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
}

function buildReceiptText(){
  const t = calcTotals();
  const now = new Date();
  const stamp = now.toLocaleString("pt-BR");
  const client = (els.clientName.value || "").trim();
  const note = (els.clientNote.value || "").trim();

  const lines = [];
  lines.push("📄 NOTA (RP)");
  lines.push(`🕒 ${stamp}`);
  if (client) lines.push(`👤 Cliente: ${client}`);
  if (note) lines.push(`📝 Obs: ${note}`);
  lines.push("");

  const chosen = [];
  for (const item of state.catalog){
    const q = Number(state.qty[item.id] || 0);
    if (q > 0) chosen.push(`• ${item.name} x ${q}`);
  }
  lines.push("📦 Itens:");
  lines.push(chosen.length ? chosen.join("\n") : "• (nenhum)");
  lines.push("");

  if (!state.onlyValue){
    lines.push("🧾 Totais:");
    lines.push(`• ${state.materialLabels.a}: ${fmt(t.a)}`);
    lines.push(`• ${state.materialLabels.b}: ${fmt(t.b)}`);
    lines.push(`• ${state.materialLabels.c}: ${fmt(t.c)}`);
    lines.push(`• ${state.materialLabels.d}: ${fmt(t.d)}`);
    lines.push(`• ${state.materialLabels.e}: ${fmt(t.e)}`);
    lines.push("");
  }

  if (!state.onlyMaterials) {
    lines.push(`💰 Valor total: ${fmtK(t.valor)}`);
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

async function init(){
  const res = await fetch("catalog.json", { cache:"no-store" });
  const catalog = await res.json();
  state.catalog = catalog.items || [];
  if (catalog.materials) state.materialLabels = { ...state.materialLabels, ...catalog.materials };
  applyLabels();
  state.catalog.forEach(i => state.qty[i.id] = 0);

  els.toggleMaterials.addEventListener("change", () => { state.showMaterials = els.toggleMaterials.checked; applyColumnVisibility(); });
  els.toggleCategory.addEventListener("change", () => { state.showCategory = els.toggleCategory.checked; applyColumnVisibility(); });
  els.toggleOnlyValue.addEventListener("change", () => {
    state.onlyValue = els.toggleOnlyValue.checked;
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

  renderTable();
  updateBrand();
}

init().catch(err => {
  console.error(err);
  alert("Erro ao carregar catalog.json. Hospede o site (GitHub Pages/Netlify) para o fetch funcionar.");
});
