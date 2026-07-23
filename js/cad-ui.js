/* =====================
   UI Utilities
   Starship CAD
   ===================== */

/* ============================= UI: editor gutter ============================= */
function syncGutter(){
  const text = el.script.value;
  const n = text.split('\n').length;
  let html = '';
  for (let i = 1; i <= n; i++) html += `<div>${i}</div>`;
  el.gutter.innerHTML = html;
  el.lineCount.textContent = `${n} line${n===1?'':'s'}`;
}
el.script.addEventListener('scroll', () => { el.gutter.scrollTop = el.script.scrollTop; });

/* ============================= run pipeline ============================= */
function runScript(){
  const { doc, errors } = parseScript(el.script.value);
  currentDoc = doc;

  // header
  el.titleDisplay.textContent = doc.title || 'Untitled Drawing';
  docMeta.modified = new Date();
  if (!docMeta.created) docMeta.created = docMeta.modified;
  el.createdDisplay.textContent = fmtDate(docMeta.created);
  el.modifiedDisplay.textContent = fmtDate(docMeta.modified);

  // log
  if (errors.length){
    el.statusDot.classList.add('err');
    el.log.innerHTML = errors
      .sort((a,b)=>a.lineNum-b.lineNum)
      .map(e => `<div class="err-line"><b>line ${e.lineNum}:</b> ${escapeHtml(e.msg)}</div>`)
      .join('');
  } else {
    el.statusDot.classList.remove('err');
    const shapeCount = doc.shapes.length;
    el.log.innerHTML = `<div class="ok">parsed clean — ${shapeCount} shape${shapeCount===1?'':'s'}${doc.world ? '' : ' · no world defined yet'}</div>`;
  }

  syncGutter();
  renderCanvas();
}

function escapeHtml(s){
  return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function fmtDate(d){
  if (!d) return '—';
  const dt = (d instanceof Date) ? d : new Date(d);
  if (isNaN(dt.getTime())) return '—';
  const pad = n => String(n).padStart(2,'0');
  return `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())} ${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}
