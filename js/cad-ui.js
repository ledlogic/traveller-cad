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
function formatScript(text){
  const SHAPE_CMDS = new Set(['rect','oval','semicircle','wall','door','image','label','text','place']);

  function isShapeLine(line){
    const t = line.trim().toLowerCase();
    return SHAPE_CMDS.has(t.split(/[\s:]/)[0]);
  }

  const lines = text.split('\n');
  const out = [];

  for (let i = 0; i < lines.length; i++){
    const line = lines[i];
    const trimmed = line.trim();
    const isSectionComment = /^#\s*──/.test(trimmed);

    // Ensure exactly one blank line before # ── section comments
    if (isSectionComment && out.length > 0 && out[out.length - 1].trim() !== ''){
      out.push('');
    }

    // Ensure blank line between consecutive shape-starting lines
    // (i.e. when current line starts a shape and previous non-blank output line also started a shape)
    if (isShapeLine(line) && out.length > 0){
      // find previous non-empty line in out
      let prevIdx = out.length - 1;
      while (prevIdx >= 0 && out[prevIdx].trim() === '') prevIdx--;
      if (prevIdx >= 0 && isShapeLine(out[prevIdx]) && out[out.length - 1].trim() !== ''){
        out.push('');
      }
    }

    out.push(line);
  }

  // Collapse 2+ consecutive blank lines down to 1
  const collapsed = [];
  let blankCount = 0;
  for (const line of out){
    if (line.trim() === ''){
      blankCount++;
      if (blankCount <= 1) collapsed.push(line);
    } else {
      blankCount = 0;
      collapsed.push(line);
    }
  }
  return collapsed.join('\n');
}

function runScript(){
  // Auto-format before parsing — updates editor if content changed
  const formatted = formatScript(el.script.value);
  if (formatted !== el.script.value){
    const sel = [el.script.selectionStart, el.script.selectionEnd];
    el.script.value = formatted;
    el.script.selectionStart = sel[0];
    el.script.selectionEnd = sel[1];
  }

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
