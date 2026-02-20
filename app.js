(() => {
'use strict';

const RENOMEAR = {}; // opcional (se quiser renomear via código)
const FALLBACK_CATALOG = {"meta": {"title": "Calculadora de Materiais", "brand": "TROPA DA LB", "currency_symbol": "$", "k_multiplier": 1000, "materials": [{"key": "A", "label": "Molas"}, {"key": "B", "label": "Canos"}, {"key": "C", "label": "Gatilhos"}, {"key": "D", "label": "Pratas"}, {"key": "E", "label": "Bronzes"}]}, "items": [{"id": "parafal", "name": "PARAFAL", "category": "FUZIL", "value_k": 405, "recipe": {"A": 22, "B": 20, "C": 8, "D": 48, "E": 0}}, {"id": "aug", "name": "FUZIL MILITAR (AUG)", "category": "FUZIL", "value_k": 405, "recipe": {"A": 22, "B": 20, "C": 8, "D": 48, "E": 0}}, {"id": "scar", "name": "SCAR", "category": "FUZIL", "value_k": 405, "recipe": {"A": 22, "B": 20, "C": 8, "D": 48, "E": 0}}, {"id": "ak47", "name": "AK47", "category": "FUZIL", "value_k": 405, "recipe": {"A": 22, "B": 20, "C": 8, "D": 48, "E": 0}}, {"id": "nsr", "name": "NSR", "category": "FUZIL", "value_k": 420, "recipe": {"A": 24, "B": 20, "C": 8, "D": 48, "E": 0}}, {"id": "tec9", "name": "TEC9", "category": "SMG", "value_k": 270, "recipe": {"A": 12, "B": 6, "C": 8, "D": 12, "E": 0}}, {"id": "smgmk2", "name": "SMGMK2", "category": "SMG", "value_k": 270, "recipe": {"A": 16, "B": 8, "C": 6, "D": 0, "E": 16}}, {"id": "mp9", "name": "MP9", "category": "SMG", "value_k": 270, "recipe": {"A": 16, "B": 8, "C": 12, "D": 0, "E": 24}}, {"id": "mtar", "name": "MTAR", "category": "SMG", "value_k": 270, "recipe": {"A": 18, "B": 10, "C": 6, "D": 0, "E": 20}}, {"id": "scorpion", "name": "SCORPION", "category": "SMG", "value_k": 290, "recipe": {"A": 14, "B": 6, "C": 8, "D": 0, "E": 16}}, {"id": "fiveseven", "name": "FIVESEVEN", "category": "PISTOLA", "value_k": 180, "recipe": {"A": 10, "B": 6, "C": 4, "D": 12, "E": 0}}, {"id": "m9a3", "name": "M9A3", "category": "PISTOLA", "value_k": 200, "recipe": {"A": 10, "B": 6, "C": 4, "D": 24, "E": 0}}]};

const $ = (q, el=document)=>el.querySelector(q);
const $$ = (q, el=document)=>Array.from(el.querySelectorAll(q));

const state = {
  catalog: null,
  items: [],
  qty: {},
  mode: 'calc',
  search: '',
  category: 'Todas',
  onlySelected: false,
};

let toastTimer=null;
function toast(msg){
  const el=$('#toast');
  el.textContent=msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>el.classList.remove('show'),1800);
}

function safeNumber(x){ const n=Number(x); return Number.isFinite(n)?n:0; }
function formatInt(n){ return Math.round(safeNumber(n)).toLocaleString('pt-BR'); }
function moneyFromK(k){
  const mult = state.catalog?.meta?.k_multiplier ?? 1000;
  const sym = state.catalog?.meta?.currency_symbol ?? '$';
  return sym + formatInt(safeNumber(k)*mult);
}

function validateCatalog(cat){
  if(!cat||typeof cat!=='object') throw new Error('catalog inválido');
  if(!cat.meta||typeof cat.meta!=='object') throw new Error('meta ausente');
  if(!Array.isArray(cat.items)||!cat.items.length) throw new Error('items ausentes');
  for(const it of cat.items){
    if(!it.id) throw new Error('item sem id');
    if(typeof it.value_k!=='number') throw new Error('value_k inválido');
    if(!it.recipe||typeof it.recipe!=='object') throw new Error('recipe inválido');
  }
}

async function loadCatalog(){
  const candidates=['./catalog.json','catalog.json', (location.pathname.replace(/\/[^\/]*$/, '/') + 'catalog.json')];
  for(const url of candidates){
    try{
      const res=await fetch(url,{cache:'no-store'});
      if(!res.ok) throw new Error('HTTP '+res.status);
      const data=await res.json();
      validateCatalog(data);
      return {data, usedFallback:false};
    }catch(e){}
  }
  validateCatalog(FALLBACK_CATALOG);
  return {data:FALLBACK_CATALOG, usedFallback:true};
}

function getMaterialLabels(){
  const labels={A:'Material A',B:'Material B',C:'Material C',D:'Material D',E:'Material E'};
  for(const m of (state.catalog.meta.materials||[])) if(m?.key&&m?.label) labels[m.key]=m.label;
  if(RENOMEAR.materiais) for(const k in RENOMEAR.materiais) labels[k]=RENOMEAR.materiais[k];
  return labels;
}
function getDisplayName(it){ return (RENOMEAR.itens&&RENOMEAR.itens[it.id])?RENOMEAR.itens[it.id]:it.name; }
function getDisplayCategory(cat){ return (RENOMEAR.categorias&&RENOMEAR.categorias[cat])?RENOMEAR.categorias[cat]:cat; }

function filteredItems(){
  const q=state.search;
  const cat=state.category;
  const onlySel=state.onlySelected;

  // selected first, but keep original order (stable)
  const base=state.items.slice().sort((a,b)=>{
    const qa=safeNumber(state.qty[a.id]); const qb=safeNumber(state.qty[b.id]);
    const ga=qa>0?0:1; const gb=qb>0?0:1;
    if(ga!==gb) return ga-gb;
    return a._index-b._index;
  });

  return base.filter(it=>{
    const name=getDisplayName(it).toLowerCase();
    const category=getDisplayCategory(it.category);
    const okSearch=!q||name.includes(q)||category.toLowerCase().includes(q);
    const okCat=(cat==='Todas')||(getDisplayCategory(it.category)===cat);
    const okSel=!onlySel||safeNumber(state.qty[it.id])>0;
    return okSearch&&okCat&&okSel;
  });
}

function computeTotals(){
  const mats={A:0,B:0,C:0,D:0,E:0};
  let totalK=0;
  for(const it of state.items){
    const q=safeNumber(state.qty[it.id]);
    if(q<=0) continue;
    totalK += q*safeNumber(it.value_k);
    for(const k of ['A','B','C','D','E']) mats[k]+= q*safeNumber(it.recipe[k]||0);
  }
  return {mats,totalK};
}

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function selectedLines(){
  const lines=[];
  for(const it of state.items){
    const q=safeNumber(state.qty[it.id]);
    if(q>0) lines.push({it,q});
  }
  lines.sort((a,b)=>a.it._index-b.it._index);
  return lines;
}
function pad(s,w,align='l'){
  s=String(s);
  if(s.length>w) s=s.slice(0,w);
  const p=' '.repeat(Math.max(0,w-s.length));
  return align==='r'?p+s:s+p;
}

function buildValuesText(){
  const lines=selectedLines();
  if(!lines.length) return 'Nenhum item selecionado.';
  const cols={item:22,qtd:5,unit:14,parc:14};
  const top=`${pad('ITEM',cols.item)} ${pad('QTD',cols.qtd,'r')} ${pad('UNIT',cols.unit,'r')} ${pad('PARCIAL',cols.parc,'r')}`;
  const out=['ITENS (valores)\n', top, '-'.repeat(top.length)];
  let totalK=0;
  for(const {it,q} of lines){
    const unitK=safeNumber(it.value_k);
    const parcK=unitK*q;
    totalK+=parcK;
    out.push(`${pad(getDisplayName(it),cols.item)} ${pad(q,cols.qtd,'r')} ${pad(moneyFromK(unitK),cols.unit,'r')} ${pad(moneyFromK(parcK),cols.parc,'r')}`);
  }
  out.push('');
  out.push('TOTAL: '+moneyFromK(totalK));
  return out.join('\n');
}

function buildMaterialsText(){
  const lines=selectedLines();
  if(!lines.length) return 'Nenhum item selecionado.';
  const labels=getMaterialLabels();
  const {mats}=computeTotals();
  const out=['MATERIAIS (totais)\n'];
  for(const k of ['A','B','C','D','E']) out.push(`• ${labels[k]}: ${formatInt(mats[k])}`);
  return out.join('\n');
}

function buildNoteText(){
  const brand=state.catalog?.meta?.brand||'TROPA DA LB';
  const lines=selectedLines();
  const {mats,totalK}=computeTotals();
  const labels=getMaterialLabels();
  if(!lines.length) return `\`\`\`\n${brand}\n\nNenhum item selecionado.\n\`\`\``;

  const cols={item:22,qtd:5,unit:14,parc:14};
  const top=`${pad('ITEM',cols.item)} ${pad('QTD',cols.qtd,'r')} ${pad('UNIT',cols.unit,'r')} ${pad('PARCIAL',cols.parc,'r')}`;
  const out=[brand,'='.repeat(Math.min(46,brand.length+12)),'',top,'-'.repeat(top.length)];
  for(const {it,q} of lines){
    const unitK=safeNumber(it.value_k);
    const parcK=unitK*q;
    out.push(`${pad(getDisplayName(it),cols.item)} ${pad(q,cols.qtd,'r')} ${pad(moneyFromK(unitK),cols.unit,'r')} ${pad(moneyFromK(parcK),cols.parc,'r')}`);
  }
  out.push('');
  out.push('MATERIAIS');
  out.push('-'.repeat(18));
  for(const k of ['A','B','C','D','E']) out.push(`• ${labels[k]}: ${formatInt(mats[k])}`);
  out.push('');
  out.push('TOTAL: '+moneyFromK(totalK));

  return '```'+'\n'+out.join('\n')+'\n'+'```';
}

async function copyText(text){
  try{ await navigator.clipboard.writeText(text); }
  catch(e){
    const ta=document.createElement('textarea');
    ta.value=text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
}

function setMode(mode){
  state.mode=mode;
  const label=mode==='calc'?'Calculadora':(mode==='values'?'Valores':'Materiais');
  $('#modeChipLabel').textContent=label;
  $('#modeChip').setAttribute('data-mode',mode);
  $('#calcPanel').hidden=(mode!=='calc');
  $('#valuesPanel').hidden=(mode!=='values');
  $('#materialsPanel').hidden=(mode!=='materials');
  render();
}

function rr(ctx,x,y,w,h,r){
  r=Math.min(r,w/2,h/2);
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.arcTo(x+w,y,x+w,y+h,r);
  ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r);
  ctx.arcTo(x,y,x+w,y,r);
  ctx.closePath();
}

function drawBg(ctx,W,H){
  const g=ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,'#07080b'); g.addColorStop(1,'#0b0c10');
  ctx.fillStyle=g; ctx.fillRect(0,0,W,H);

  const rg=ctx.createRadialGradient(W*0.20,H*0.10,0,W*0.20,H*0.10,H*0.9);
  rg.addColorStop(0,'rgba(181,0,24,.22)');
  rg.addColorStop(1,'rgba(181,0,24,0)');
  ctx.fillStyle=rg; ctx.fillRect(0,0,W,H);

  ctx.fillStyle='rgba(255,255,255,.015)';
  for(let i=0;i<900;i++) ctx.fillRect(Math.random()*W,Math.random()*H,1,1);
}

async function exportJpg(kind){
  const brand=state.catalog?.meta?.brand||'TROPA DA LB';
  const when=new Date();
  const stamp=`${String(when.getDate()).padStart(2,'0')}/${String(when.getMonth()+1).padStart(2,'0')}/${when.getFullYear()} ${String(when.getHours()).padStart(2,'0')}:${String(when.getMinutes()).padStart(2,'0')}`;

  const lines=selectedLines();
  const {mats,totalK}=computeTotals();
  const labels=getMaterialLabels();

  const title=kind==='materials'?'Materiais':(kind==='values'?'Valores':'Orçamento / Lista');
  const showItems=(kind!=='materials');
  const showMaterials=(kind!=='values');

  const W=860;
  let H=260;
  if(showItems) H += 26 + (lines.length*26) + 34;
  if(showMaterials) H += 28 + (5*24) + 28;
  H += 70;

  const dpr=Math.min(2, window.devicePixelRatio||1);
  const c=document.createElement('canvas');
  c.width=Math.round(W*dpr); c.height=Math.round(H*dpr);
  const ctx=c.getContext('2d');
  ctx.scale(dpr,dpr);

  drawBg(ctx,W,H);

  const cardX=26, cardY=22, cardW=W-52, cardH=H-44;
  rr(ctx,cardX,cardY,cardW,cardH,22);
  ctx.fillStyle='rgba(15,17,24,.92)'; ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,.10)'; ctx.lineWidth=1; ctx.stroke();

  const img=$('#brandLogo');
  if(img && img.complete && img.naturalWidth>0){
    const ir=img.naturalWidth/img.naturalHeight;
    let dw=cardW*0.92, dh=dw/ir;
    if(dh>cardH*0.60){ dh=cardH*0.60; dw=dh*ir; }
    const dx=cardX+(cardW-dw)/2, dy=cardY+(cardH-dh)/2+18;
    ctx.save();
    ctx.globalAlpha=0.14;
    ctx.filter='none';
    ctx.drawImage(img,dx,dy,dw,dh);
    ctx.restore();
  }

  // header
  let y=cardY+32;
  const box={x:cardX+22,y:y,w:72,h:72};
  rr(ctx,box.x,box.y,box.w,box.h,20);
  ctx.fillStyle='rgba(255,255,255,.04)'; ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,.10)'; ctx.stroke();

  if(img && img.complete && img.naturalWidth>0){
    // mimic header badge: logo bigger than the badge and slightly "popping out"
    const ir=img.naturalWidth/img.naturalHeight;
    let dw=110, dh=dw/ir;
    const cx=box.x+box.w/2, cy=box.y+box.h/2;
    const dx=cx-dw/2, dy=cy-dh/2-6;
    ctx.save();
    ctx.shadowColor='rgba(0,0,0,.55)';
    ctx.shadowBlur=18;
    ctx.drawImage(img,dx,dy,dw,dh);
    ctx.restore();
  }

  const tx=box.x+box.w+18;
  ctx.fillStyle='#f1f3f8';
  ctx.font='800 30px system-ui, -apple-system, Segoe UI, Roboto, Arial';
  ctx.fillText(brand,tx,y+34);
  ctx.fillStyle='rgba(233,236,243,.72)';
  ctx.font='600 14px system-ui, -apple-system, Segoe UI, Roboto, Arial';
  ctx.fillText(title,tx,y+58);

  const pillW=260,pillH=64;
  const pillX=cardX+cardW-pillW-22, pillY=y+6;
  rr(ctx,pillX,pillY,pillW,pillH,16);
  ctx.fillStyle='rgba(181,0,24,.14)'; ctx.fill();
  ctx.strokeStyle='rgba(255,43,74,.22)'; ctx.stroke();
  ctx.fillStyle='rgba(233,236,243,.70)';
  ctx.font='700 12px system-ui, -apple-system, Segoe UI, Roboto, Arial';
  ctx.fillText('TOTAL',pillX+14,pillY+20);
  ctx.fillStyle='#fff';
  ctx.font='900 26px system-ui, -apple-system, Segoe UI, Roboto, Arial';
  ctx.fillText(moneyFromK(totalK),pillX+14,pillY+46);
  ctx.fillStyle='rgba(233,236,243,.55)';
  ctx.font='600 12px system-ui, -apple-system, Segoe UI, Roboto, Arial';
  const sw=ctx.measureText(stamp).width;
  ctx.fillText(stamp,pillX+pillW-14-sw,pillY+20);

  const divY=y+108;
  ctx.strokeStyle='rgba(255,255,255,.10)';
  ctx.beginPath(); ctx.moveTo(cardX+22,divY); ctx.lineTo(cardX+cardW-22,divY); ctx.stroke();
  y=divY+30;

  if(showItems){
    const colItem=cardX+22, colQtd=cardX+360, colUnit=cardX+480, colParc=cardX+cardW-22;
    ctx.fillStyle='rgba(233,236,243,.88)';
    ctx.font='800 14px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';
    ctx.fillText('ITEM',colItem,y);
    ctx.fillText('QTD',colQtd,y);
    ctx.fillText('UNIT',colUnit,y);
    ctx.textAlign='right'; ctx.fillText('PARCIAL',colParc,y); ctx.textAlign='left';
    y+=10;
    ctx.beginPath(); ctx.moveTo(cardX+22,y); ctx.lineTo(cardX+cardW-22,y); ctx.stroke();
    y+=22;

    ctx.font='700 14px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';
    ctx.fillStyle='rgba(233,236,243,.84)';
    for(const {it,q} of lines){
      const unitK=safeNumber(it.value_k);
      const parcK=unitK*q;
      ctx.fillText(getDisplayName(it),colItem,y);
      ctx.fillText(String(q),colQtd,y);
      ctx.fillText(moneyFromK(unitK),colUnit,y);
      ctx.textAlign='right'; ctx.fillText(moneyFromK(parcK),colParc,y); ctx.textAlign='left';
      y+=26;
    }
    y+=18;
  }

  if(showMaterials){
    ctx.fillStyle='rgba(233,236,243,.88)';
    ctx.font='900 14px system-ui, -apple-system, Segoe UI, Roboto, Arial';
    ctx.fillText('MATERIAIS',cardX+22,y);
    y+=10;
    ctx.beginPath(); ctx.moveTo(cardX+22,y); ctx.lineTo(cardX+cardW-22,y); ctx.stroke();
    y+=22;

    ctx.fillStyle='rgba(233,236,243,.82)';
    ctx.font='700 14px system-ui, -apple-system, Segoe UI, Roboto, Arial';
    for(const k of ['A','B','C','D','E']){
      ctx.fillText(`• ${labels[k]}: ${formatInt(mats[k])}`,cardX+22,y);
      y+=24;
    }
  }

  ctx.fillStyle='rgba(233,236,243,.55)';
  ctx.font='600 12px system-ui, -apple-system, Segoe UI, Roboto, Arial';
  ctx.fillText('Gerado pela calculadora',cardX+22,cardY+cardH-18);

  const blob=await new Promise(res=>c.toBlob(res,'image/jpeg',0.92));
  if(!blob){ toast('Falha ao gerar JPG.'); return; }
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;
  a.download=`tropa-da-lb_${kind}_${Date.now()}.jpg`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1500);
  toast('JPG gerado.');
}

function render(){
  const labels=getMaterialLabels();
  $('#matAHead').textContent=labels.A;
  $('#matBHead').textContent=labels.B;
  $('#matCHead').textContent=labels.C;
  $('#matDHead').textContent=labels.D;
  $('#matEHead').textContent=labels.E;

  // categories
  const cats=Array.from(new Set(state.items.map(it=>getDisplayCategory(it.category)))).sort((a,b)=>a.localeCompare(b,'pt-BR'));
  const sel=$('#qCategory');
  const current=state.category;
  sel.innerHTML='';
  sel.appendChild(new Option('Todas','Todas'));
  for(const c of cats) sel.appendChild(new Option(c,c));
  sel.value=cats.includes(current)?current:'Todas';
  state.category=sel.value;

  // rows
  const rowsEl=$('#rows');
  rowsEl.innerHTML='';
  for(const it of filteredItems()){
    const q=safeNumber(state.qty[it.id]);
    const row=document.createElement('div');
    row.className='row'+(q>0?' selected':'');
    row.innerHTML=`
      <div class="cell"><div class="item-name">${escapeHtml(getDisplayName(it))}</div></div>
      <div class="cell"><span class="badge">${escapeHtml(getDisplayCategory(it.category))}</span></div>
      <div class="cell qty">
        <button class="step" data-step="-1" type="button">−</button>
        <input inputmode="numeric" pattern="[0-9]*" value="${q}" aria-label="Quantidade" />
        <button class="step" data-step="1" type="button">+</button>
      </div>
      <div class="cell num mat">${formatInt(q*safeNumber(it.recipe.A))}</div>
      <div class="cell num mat">${formatInt(q*safeNumber(it.recipe.B))}</div>
      <div class="cell num mat">${formatInt(q*safeNumber(it.recipe.C))}</div>
      <div class="cell num mat">${formatInt(q*safeNumber(it.recipe.D))}</div>
      <div class="cell num mat">${formatInt(q*safeNumber(it.recipe.E))}</div>
      <div class="cell num">${moneyFromK(q*safeNumber(it.value_k))}</div>
    `;

    const input=row.querySelector('input');
    input.addEventListener('input',()=>{
      state.qty[it.id]=Math.max(0,safeNumber(input.value));
      render();
    });

    row.querySelectorAll('.step').forEach(btn=>{
      btn.addEventListener('click',()=>{
        const d=Number(btn.dataset.step);
        state.qty[it.id]=Math.max(0,safeNumber(state.qty[it.id])+d);
        render();
      });
    });

    rowsEl.appendChild(row);
  }

  // totals
  const {mats,totalK}=computeTotals();
  const grid=$('#totalsGrid');
  grid.innerHTML='';
  for(const k of ['A','B','C','D','E']){
    const card=document.createElement('div');
    card.className='total-card';
    card.innerHTML=`<div class="k">${escapeHtml(labels[k])}</div><div class="v">${formatInt(mats[k])}</div>`;
    grid.appendChild(card);
  }
  $('#grandTotal').textContent=moneyFromK(totalK);

  // compact text
  $('#valuesText').textContent=buildValuesText();
  $('#materialsText').textContent=buildMaterialsText();
}

function openNoteModal(){
  $('#noteText').textContent=buildNoteText();
  $('#noteModal').showModal();
}

function wire(){
  $('#qSearch').addEventListener('input',e=>{ state.search=e.target.value.trim().toLowerCase(); render(); });
  $('#qCategory').addEventListener('change',e=>{ state.category=e.target.value; render(); });
  $('#btnOnlySelected').addEventListener('click',()=>{
    state.onlySelected=!state.onlySelected;
    $('#btnOnlySelected').setAttribute('aria-pressed',String(state.onlySelected));
    render();
  });
  $('#btnReset').addEventListener('click',()=>{
    for(const it of state.items) state.qty[it.id]=0;
    render();
    toast('Zerado.');
  });
  $('#btnNote').addEventListener('click',()=>openNoteModal());

  // chip cycle + context menu
  const chip=$('#modeChip');
  const menu=$('#chipMenu');
  function closeMenu(){ menu.setAttribute('aria-hidden','true'); }
  function openMenuAt(x,y){
    const w=220, pad=14;
    const left=Math.min(window.innerWidth-w-pad, Math.max(pad, x-w+22));
    menu.style.left=left+'px';
    menu.style.top=Math.max(72,y+8)+'px';
    menu.setAttribute('aria-hidden','false');
  }
  chip.addEventListener('click',()=>{
    const order=['calc','values','materials'];
    const idx=order.indexOf(state.mode);
    setMode(order[(idx+1)%order.length]);
    closeMenu();
  });
  chip.addEventListener('contextmenu',e=>{ e.preventDefault(); openMenuAt(e.clientX,e.clientY); });
  document.addEventListener('click',e=>{
    if(menu.getAttribute('aria-hidden')==='false' && !menu.contains(e.target) && e.target!==chip) closeMenu();
  });
  window.addEventListener('resize',closeMenu);
  window.addEventListener('scroll',closeMenu,{passive:true});
  $$('#chipMenu .chip-item').forEach(b=>b.addEventListener('click',()=>{ setMode(b.dataset.mode); closeMenu(); }));

  // modal
  const modal=$('#noteModal');
  $('#btnCloseModal').addEventListener('click',()=>modal.close());
  modal.addEventListener('click',e=>{
    const card=modal.querySelector('.modal-card');
    if(!card.contains(e.target)) modal.close();
  });

  // copy/export
  $('#btnCopyNote').addEventListener('click',async()=>{ await copyText($('#noteText').textContent); toast('Nota copiada.'); });
  $('#btnExportNoteJpg').addEventListener('click',()=>exportJpg('note'));
  $('#btnCopyValues').addEventListener('click',async()=>{ await copyText($('#valuesText').textContent); toast('Copiado.'); });
  $('#btnCopyMaterials').addEventListener('click',async()=>{ await copyText($('#materialsText').textContent); toast('Copiado.'); });
  $('#btnExportValuesJpg').addEventListener('click',()=>exportJpg('values'));
  $('#btnExportMaterialsJpg').addEventListener('click',()=>exportJpg('materials'));
}

async function init(){
  wire();
  const loaded=await loadCatalog();
  state.catalog=loaded.data;
  state.items=loaded.data.items.map((it,idx)=>({...it,_index:idx}));
  for(const it of state.items) state.qty[it.id]=0;
  $('#brandName').textContent=state.catalog.meta.brand||'TROPA DA LB';
  setMode('calc');
  render();
  if(loaded.usedFallback) toast('Usando catálogo fallback.');
}

init().catch(e=>{ console.error(e); toast('Erro ao iniciar.'); });

})();