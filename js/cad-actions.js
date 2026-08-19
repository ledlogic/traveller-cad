/* =====================
   Actions, Events & Toolbar
   Starship CAD
   ===================== */

/* ============================= events ============================= */
el.script.addEventListener('input', () => {
  syncGutter();
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(runScript, 350);
});

function updateCursorLine(){
  const pos = el.script.selectionStart;
  const text = el.script.value.slice(0, pos);
  cursorLineNum = text.split('\n').length;
  renderCanvas();
}

el.script.addEventListener('click',    updateCursorLine);
el.script.addEventListener('keyup',    updateCursorLine);
el.script.addEventListener('selectionchange', updateCursorLine);
el.script.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter'){
    e.preventDefault();
    clearTimeout(debounceTimer);
    runScript();
  }
  if (e.key === 'Tab'){
    e.preventDefault();
    const s = el.script.selectionStart, en = el.script.selectionEnd;
    el.script.value = el.script.value.slice(0,s) + '  ' + el.script.value.slice(en);
    el.script.selectionStart = el.script.selectionEnd = s + 2;
    syncGutter();
  }
});
el.btnRender.addEventListener('click', () => { clearTimeout(debounceTimer); runScript(); });

el.btnDebug.addEventListener('click', () => {
  showAnchors = !showAnchors;
  el.btnDebug.classList.toggle('active', showAnchors);
  renderCanvas();
});

el.btnStaff.addEventListener('click', () => {
  showStaff = !showStaff;
  el.btnStaff.classList.toggle('active', !showStaff); // active = hidden state
  el.btnStaff.title = showStaff ? 'Hide staff/security corridors' : 'Show staff/security corridors';
  renderCanvas();
});

el.btnInches.addEventListener('click', () => {
  showInches = !showInches;
  el.btnInches.classList.toggle('active', showInches);
  el.btnInches.textContent = showInches ? 'm' : 'in';
  el.btnInches.title = showInches ? 'Switch to metres' : 'Switch to inches (1.5m = 1in)';
  renderCanvas();
});

/* ============================= zoom ============================= */
const ZOOM_STEP = 1.25;
const ZOOM_MIN  = 0.1;
const ZOOM_MAX  = 20;

function applyZoom(factor, pivotSx, pivotSy){
  const before = zoomLevel;
  zoomLevel = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoomLevel * factor));
  if (zoomLevel === before) return;
  const ratio = zoomLevel / before;
  if (pivotSx !== undefined){
    // zoom toward a specific screen point
    panX = panX - (pivotSx - viewport.offsetX) * (ratio - 1);
    panY = panY - (pivotSy - viewport.offsetY) * (ratio - 1);
  } else {
    // zoom toward viewport centre: just scale existing pan offset
    panX *= ratio;
    panY *= ratio;
  }
  renderCanvas();
}

function resetZoom(){
  zoomLevel = 1; panX = 0; panY = 0;
  renderCanvas();
}

el.btnZoomIn.addEventListener('click',    () => applyZoom(ZOOM_STEP));
el.btnZoomOut.addEventListener('click',   () => applyZoom(1 / ZOOM_STEP));
el.btnZoomReset.addEventListener('click', () => resetZoom());

// mouse wheel zoom — pivot on viewport centre
el.canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const factor = e.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
  applyZoom(factor); // no pivot args = centre
}, { passive: false });

/* ============================= selection & interaction ============================= */
let selectedIndices = new Set();  // set of placement indices currently selected
let isPanning = false, panStartX = 0, panStartY = 0, panStartOffsetX = 0, panStartOffsetY = 0;
let dragState = null;  // { offsets: [{idx, offsetWx, offsetWy}], startWx, startWy }
const GRAB_RADIUS_PX = 22;

function screenToWorld(clientX, clientY){
  if (!viewport) return null;
  const rect = el.canvas.getBoundingClientRect();
  const sx = clientX - rect.left, sy = clientY - rect.top;
  return {
    wx: viewport.x1 + (sx - viewport.offsetX) / viewport.scale,
    wy: viewport.y2 - (sy - viewport.offsetY) / viewport.scale,
  };
}

function findNearestPlacement(clientX, clientY){
  if (!viewport || !currentDoc || !currentDoc.placements.length) return -1;
  const rect = el.canvas.getBoundingClientRect();
  const sx = clientX - rect.left, sy = clientY - rect.top;
  let best = -1, bestDist = GRAB_RADIUS_PX;
  currentDoc.placements.forEach((p, i) => {
    const px = viewport.offsetX + (p.x - viewport.x1) * viewport.scale;
    const py = viewport.offsetY + (viewport.y2 - p.y) * viewport.scale;
    const d = Math.hypot(sx - px, sy - py);
    if (d < bestDist){ bestDist = d; best = i; }
  });
  return best;
}

// Write x,y back to the nth place: line in the script
function syncPlacementXY(idx){
  const p = currentDoc.placements[idx];
  const lines = el.script.value.split('\n');
  let found = 0;
  for (let i = 0; i < lines.length; i++){
    const t = lines[i].trim().toLowerCase();
    if (t.startsWith('place:')||t.startsWith('place ')){
      if (found === idx){
        const m = lines[i].match(/^(\s*place\s*:?\s*)([A-Za-z_][A-Za-z0-9_]*)(\s*,\s*)(-?\d+(?:\.\d+)?)(\s*,\s*)(-?\d+(?:\.\d+)?)(.*)/i);
        if (m){
          lines[i] = `${m[1]}${m[2]}${m[3]}${r2(p.x)}${m[5]}${r2(p.y)}${m[7]}`;
        }
        break;
      }
      found++;
    }
  }
  el.script.value = lines.join('\n');
  syncGutter();
}

// Write angle back to the nth place: line — always writes name, x, y, scale, angle
function syncPlacementAngle(idx){
  const p = currentDoc.placements[idx];
  const angleDeg = r2(p.angle * 180 / Math.PI);
  const lines = el.script.value.split('\n');
  let found = 0;
  for (let i = 0; i < lines.length; i++){
    const t = lines[i].trim().toLowerCase();
    if (t.startsWith('place:')||t.startsWith('place ')){
      if (found === idx){
        const sc = r2(p.scale || 1);
        lines[i] = `place: ${p.name}, ${r2(p.x)}, ${r2(p.y)}, ${sc}, ${angleDeg}`;
        break;
      }
      found++;
    }
  }
  el.script.value = lines.join('\n');
  syncGutter();
}

// Insert a new place: line for a copy after the source line
function insertPlaceCopy(idx){
  const p = currentDoc.placements[idx];
  const angleDeg = r2(p.angle * 180 / Math.PI);
  const newLine = `place: ${p.name}, ${r2(p.x)}, ${r2(p.y)}, ${r2(p.scale||1)}, ${angleDeg}`;
  const lines = el.script.value.split('\n');
  let found = 0, insertAfter = -1;
  for (let i = 0; i < lines.length; i++){
    const t = lines[i].trim().toLowerCase();
    if (t.startsWith('place:')||t.startsWith('place ')){
      if (found === idx){ insertAfter = i; break; }
      found++;
    }
  }
  if (insertAfter >= 0){
    lines.splice(insertAfter + 1, 0, newLine);
    el.script.value = lines.join('\n');
    syncGutter();
    // re-parse so new placement is live; select the new one
    const { doc, errors } = parseScript(el.script.value);
    currentDoc = doc;
    selectedIndices = new Set([idx + 1]); // newly inserted placement is at idx+1
    renderCanvas();
  }
}

function r2(n){ return Math.round(n * 100) / 100; }

/* ── mouse down ─────────────────────────────────────────────────── */
// Jump editor caret to the line of the shape clicked in anchor mode
function jumpToShapeAtScreen(clientX, clientY){
  if (!viewport || !currentDoc) return false;
  const rect = el.canvas.getBoundingClientRect();
  const sx = clientX - rect.left, sy = clientY - rect.top;
  const wx = viewport.x1 + (sx - viewport.offsetX) / viewport.scale;
  const wy = viewport.y2 - (sy - viewport.offsetY) / viewport.scale;

  const SHAPE_TYPES = ['rect','oval','semicircle','door','wall','stairs','hatch','image'];
  const pad = Math.max(0.3, (currentDoc.wallWidth || 0.3));

  // Find all shapes that contain the click, then pick the smallest area
  // (smallest = most specific — a 2m corridor beats an 80m ballroom)
  const candidates = currentDoc.shapes.filter(s => {
    if (!SHAPE_TYPES.includes(s.type) || s.lineNum === undefined) return false;
    const x1 = Math.min(s.x1, s.x2), x2 = Math.max(s.x1, s.x2);
    const y1 = Math.min(s.y1, s.y2), y2 = Math.max(s.y1, s.y2);
    return wx >= x1 - pad && wx <= x2 + pad && wy >= y1 - pad && wy <= y2 + pad;
  });

  if (!candidates.length) return false;

  // Pick the smallest by area
  const hit = candidates.reduce((best, s) => {
    const area = Math.abs(s.x2 - s.x1) * Math.abs(s.y2 - s.y1);
    const bestArea = Math.abs(best.x2 - best.x1) * Math.abs(best.y2 - best.y1);
    return area < bestArea ? s : best;
  });

  // Scroll textarea to that line and place caret there
  const lines = el.script.value.split('\n');
  let charPos = 0;
  for (let i = 0; i < hit.lineNum - 1 && i < lines.length; i++){
    charPos += lines[i].length + 1;
  }
  el.script.focus();
  el.script.setSelectionRange(charPos, charPos + (lines[hit.lineNum - 1] || '').length);
  const lineHeight = el.script.scrollHeight / lines.length;
  el.script.scrollTop = Math.max(0, (hit.lineNum - 4) * lineHeight);
  cursorLineNum = hit.lineNum;
  renderCanvas();
  return true;
}

el.canvas.addEventListener('mousedown', (e) => {
  if (e.button !== 0) return;
  const idx = findNearestPlacement(e.clientX, e.clientY);

  if (e.shiftKey && idx >= 0){
    if (selectedIndices.has(idx)) selectedIndices.delete(idx);
    else selectedIndices.add(idx);
    updateInfoBar();
    renderCanvas();
    return;
  }

  if (e.shiftKey){
    isPanning = true;
    panStartX = e.clientX; panStartY = e.clientY;
    panStartOffsetX = panX; panStartOffsetY = panY;
    el.canvas.style.cursor = 'grabbing';
    return;
  }

  if (idx >= 0){
    if (!selectedIndices.has(idx)){
      selectedIndices = new Set([idx]);
    }
    const wpos = screenToWorld(e.clientX, e.clientY);
    dragState = {
      offsets: [...selectedIndices].map(i => ({
        idx: i,
        offsetWx: wpos.wx - currentDoc.placements[i].x,
        offsetWy: wpos.wy - currentDoc.placements[i].y,
      })),
    };
    el.canvas.style.cursor = 'move';
    e.preventDefault();
    updateInfoBar();
    renderCanvas();
  } else {
    selectedIndices = new Set();
    // In anchor mode, try to jump editor caret to clicked shape
    if (showAnchors && jumpToShapeAtScreen(e.clientX, e.clientY)){
      updateInfoBar();
      return;
    }
    isPanning = true;
    panStartX = e.clientX; panStartY = e.clientY;
    panStartOffsetX = panX; panStartOffsetY = panY;
    el.canvas.style.cursor = 'grabbing';
    updateInfoBar();
    renderCanvas();
  }
});

/* ── mouse move ─────────────────────────────────────────────────── */
window.addEventListener('mousemove', (e) => {
  if (isPanning){
    panX = panStartOffsetX + (e.clientX - panStartX);
    panY = panStartOffsetY + (e.clientY - panStartY);
    renderCanvas();
  } else if (dragState){
    const wpos = screenToWorld(e.clientX, e.clientY);
    if (!wpos) return;
    for (const { idx, offsetWx, offsetWy } of dragState.offsets){
      currentDoc.placements[idx].x = wpos.wx - offsetWx;
      currentDoc.placements[idx].y = wpos.wy - offsetWy;
    }
    renderCanvas();
  }
});

/* ── mouse up ───────────────────────────────────────────────────── */
window.addEventListener('mouseup', () => {
  if (isPanning){
    isPanning = false;
    el.canvas.style.cursor = '';
  }
  if (dragState){
    // Write all moved placements back to script
    for (const { idx } of dragState.offsets) syncPlacementXY(idx);
    el.script.value = el.script.value; // already updated in syncPlacementXY calls
    renderCanvas();
    dragState = null;
    el.canvas.style.cursor = '';
  }
});

/* ── keyboard: R = rotate, C = copy ────────────────────────────── */
window.addEventListener('keydown', (e) => {
  if (e.target === el.script) return;

  // Zoom shortcuts
  if (e.key === '+' || e.key === '=') { e.preventDefault(); applyZoom(ZOOM_STEP); return; }
  if (e.key === '-' || e.key === '_') { e.preventDefault(); applyZoom(1 / ZOOM_STEP); return; }
  if (e.key === '1')                  { e.preventDefault(); resetZoom(); return; }

  // Component shortcuts — need at least one selected
  if (e.key === 'r' || e.key === 'R'){
    if (e.ctrlKey || e.metaKey) return;
    if (!selectedIndices.size) return;
    e.preventDefault();
    // Get current angle of first selected (degrees)
    const firstIdx = [...selectedIndices][0];
    const currentDeg = r2(currentDoc.placements[firstIdx].angle * 180 / Math.PI);
    const input = window.prompt(
      `Rotate selected component(s)\nEnter new angle θ in degrees — mathematical convention: CCW is positive (θ=0 faces right, θ=90 faces up)\nCurrent θ: ${currentDeg}°`,
      String(currentDeg)
    );
    if (input === null) return; // cancelled
    const newDeg = parseFloat(input);
    if (Number.isNaN(newDeg)) return;
    for (const idx of selectedIndices){
      currentDoc.placements[idx].angle = newDeg * Math.PI / 180;
      syncPlacementAngle(idx);
    }
    renderCanvas();
  }

  if (e.key === 'c' || e.key === 'C'){
    if (!selectedIndices.size) return;
    e.preventDefault();
    // Copy each selected component (placed on top of original)
    // Do in reverse index order so insertions don't shift indices
    const sorted = [...selectedIndices].sort((a,b) => b - a);
    for (const idx of sorted) insertPlaceCopy(idx);
  }

  if (e.key === 'Escape'){
    selectedIndices = new Set();
    renderCanvas();
  }

  if (e.key === 'q' || e.key === 'Q'){
    if (!selectedIndices.size) return;
    e.preventDefault();
    const snap = 0.75;
    for (const idx of selectedIndices){
      const p = currentDoc.placements[idx];
      p.x = Math.round(p.x / snap) * snap;
      p.y = Math.round(p.y / snap) * snap;
      syncPlacementXY(idx);
    }
    renderCanvas();
  }
});



if (window.ResizeObserver){
  new ResizeObserver(() => { if (currentDoc) renderCanvas(); }).observe(el.canvasHost);
}

el.canvas.addEventListener('mousemove', (e) => {
  if (!viewport){ el.hud.style.display = 'none'; return; }
  const rect = el.canvas.getBoundingClientRect();
  const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
  hoverWx = viewport.x1 + (sx - viewport.offsetX) / viewport.scale;
  hoverWy = viewport.y2 - (sy - viewport.offsetY) / viewport.scale;

  // Coords — fixed width, never grows
  el.hud.style.display = '';
  if (showInches){
    el.hud.innerHTML = `x <b>${fmt(hoverWx/1.5)}"</b> · y <b>${fmt(hoverWy/1.5)}"</b>`;
  } else {
    el.hud.innerHTML = `x <b>${fmt(hoverWx)}</b> · y <b>${fmt(hoverWy)}</b>`;
  }

  // Selection info — separate upper-right element
  updateInfoBar();

  if (showAnchors || dragState) renderCanvas();
});

function updateInfoBar(){
  let info = '';
  if (selectedIndices.size && currentDoc && currentDoc.placements){
    const sel = [...selectedIndices];
    if (sel.length === 1){
      const p = currentDoc.placements[sel[0]];
      if (p){
        const shapes = currentDoc.parsedComponents && currentDoc.parsedComponents[p.name];
        if (shapes && shapes.length){
          const xs = shapes.flatMap(s => [s.x1, s.x2]);
          const ys = shapes.flatMap(s => [s.y1, s.y2]);
          const lw = fmt((Math.max(...xs) - Math.min(...xs)) * (p.scale || 1));
          const lh = fmt((Math.max(...ys) - Math.min(...ys)) * (p.scale || 1));
          info = `<b>${p.name}</b> &nbsp;${lw} × ${lh} m`;
        } else {
          info = `<b>${p.name}</b>`;
        }
      }
    } else {
      info = `<b>${sel.length}</b> selected`;
    }
  } else if (currentDoc && currentDoc.shapes && hoverWx !== null){
    const hovered = currentDoc.shapes.find(s =>
      (s.type === 'rect' || s.type === 'oval' || s.type === 'semicircle') &&
      hoverWx >= Math.min(s.x1,s.x2) && hoverWx <= Math.max(s.x1,s.x2) &&
      hoverWy >= Math.min(s.y1,s.y2) && hoverWy <= Math.max(s.y1,s.y2)
    );
    if (hovered){
      const elev = hovered.elev !== undefined ? ` · elev ${hovered.elev > 0 ? '+' : ''}${hovered.elev} m` : '';
      info = `${fmt(Math.abs(hovered.x2-hovered.x1))} × ${fmt(Math.abs(hovered.y2-hovered.y1))} m${elev}`;
    }
  }

  if (info){
    el.infoBar.style.display = '';
    el.infoBar.innerHTML = info;
  } else {
    el.infoBar.style.display = 'none';
  }
}
el.canvas.addEventListener('mouseleave', () => {
  el.hud.style.display = 'none';
  el.infoBar.style.display = 'none';
  hoverWx = null; hoverWy = null;
  if (showAnchors) renderCanvas();
});

/* ============================= toolbar: new / load / save / png ============================= */
let newArmed = false;
el.btnNew.addEventListener('click', () => {
  if (!newArmed){
    newArmed = true;
    el.btnNew.textContent = 'Confirm?';
    el.btnNew.classList.add('confirm');
    setTimeout(() => {
      newArmed = false;
      el.btnNew.textContent = 'New';
      el.btnNew.classList.remove('confirm');
    }, 3000);
    return;
  }
  newArmed = false;
  el.btnNew.textContent = 'New';
  el.btnNew.classList.remove('confirm');
  const { script: newScript } = makeUntitledScript();
  docMeta = { created: new Date(), modified: new Date() };
  el.script.value = newScript;
  zoomLevel = 1; panX = 0; panY = 0;
  selectedIndices = new Set();
  history.replaceState(null, '', window.location.pathname);
  el.drawingSelect.value = '';
  syncGutter();
  runScript();
});

el.btnLoad.addEventListener('click', () => el.fileInput.click());
el.fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try{
      let script;
      if (file.name.endsWith('.tc3')){
        script = reader.result;
      } else {
        const data = JSON.parse(reader.result);
        if (typeof data.script !== 'string') throw new Error('file has no "script" field');
        script = data.script;
      }
      el.script.value = script;
      // Accept both created/modified (new format) and legacy formats
      docMeta.created  = data.created  ? new Date(data.created)  : new Date();
      docMeta.modified = data.modified ? new Date(data.modified) : new Date();
      zoomLevel = 1; panX = 0; panY = 0;
      selectedIndices = new Set();
      syncGutter();
      runScript();
    }catch(err){
      el.statusDot.classList.add('err');
      el.log.innerHTML = `<div class="err-line"><b>load failed:</b> ${escapeHtml(err.message)}</div>`;
    }
  };
  reader.readAsText(file);
  el.fileInput.value = '';
});

el.btnSave.addEventListener('click', () => {
  clearTimeout(debounceTimer);
  runScript();
  docMeta.modified = new Date();
  const title = currentDoc ? currentDoc.title : '';
  // Save as plain .tc3 — raw script text only
  const blob = new Blob([el.script.value], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = slug(title) + '.tc3';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

el.btnPng.addEventListener('click', () => {
  if (!currentDoc || !currentDoc.world) return;

  const { x1, y1, x2, y2 } = currentDoc.world;
  const worldW = x2 - x1, worldH = y2 - y1;

  // Resolution: px per world unit (metre). Selector in toolbar sets this.
  const pxPerM = parseInt(el.exportRes ? el.exportRes.value : '15') || 15;
  const exportScale = pxPerM;

  const pad = { top:40, right:24, bottom:24, left:48 };
  const canvasW = Math.round(worldW * exportScale + pad.left + pad.right);
  const canvasH = Math.round(worldH * exportScale + pad.top  + pad.bottom);

  // Warn if very large
  if (canvasW * canvasH > 200_000_000){
    if (!confirm(`This will generate a ${canvasW}×${canvasH}px image (~${Math.round(canvasW*canvasH/1e6)}MP). Continue?`)) return;
  }

  const offscreen = document.createElement('canvas');
  offscreen.width  = canvasW;
  offscreen.height = canvasH;
  const oc = offscreen.getContext('2d');
  oc.fillStyle = '#ffffff';
  oc.fillRect(0, 0, canvasW, canvasH);

  const toScreen = (wx, wy) => [
    pad.left + (wx - x1) * exportScale,
    pad.top  + (y2 - wy) * exportScale,
  ];

  // Swap the active drawing context to the offscreen canvas
  const savedCtx = ctx;
  ctx = oc;

  drawRulers(toScreen, x1, y1, x2, y2, exportScale,
             pad.left, pad.top, worldW * exportScale, worldH * exportScale,
             currentDoc.gridSize);

  currentDoc.shapes
    .filter(s => s.type === 'image' && (showStaff || !s.staffOnly))
    .forEach(s => drawImageShape(s, toScreen));

  const visEx = s => showStaff || !s.staffOnly;
  const elevShapesEx = currentDoc.shapes.filter(s => s.elev !== undefined);
  const elevMinEx = elevShapesEx.length ? Math.min(...elevShapesEx.map(s => s.elev)) : 0;
  const elevMaxEx = elevShapesEx.length ? Math.max(...elevShapesEx.map(s => s.elev)) : 0;
  const elevRangeEx = Math.max(elevMaxEx - elevMinEx, 1);

  currentDoc.shapes
    .filter(s => ['rect','oval','semicircle'].includes(s.type) && visEx(s))
    .forEach(s => drawStructure(s, toScreen, exportScale, currentDoc.gridSize,
                                currentDoc.wallWidth, currentDoc.wallColor, elevMinEx, elevRangeEx));
  currentDoc.shapes
    .filter(s => s.type === 'wall' && visEx(s))
    .forEach(s => drawWall(s, toScreen, exportScale, currentDoc.wallWidth, currentDoc.wallColor));
  currentDoc.shapes
    .filter(s => s.type === 'door' && visEx(s))
    .forEach(s => drawDoor(s, toScreen, exportScale, currentDoc.wallWidth, currentDoc.wallColor, currentDoc.featureThickness));
  currentDoc.shapes
    .filter(s => s.type === 'stairs' && visEx(s))
    .forEach(s => drawStairs(s, toScreen, exportScale, currentDoc.wallWidth, currentDoc.wallColor));
  currentDoc.shapes
    .filter(s => s.type === 'hatch' && visEx(s))
    .forEach(s => drawHatch(s, toScreen, exportScale, currentDoc.wallWidth, currentDoc.wallColor));
  currentDoc.shapes
    .filter(s => s.type === 'label' && visEx(s))
    .forEach(s => drawLabel(s, toScreen, exportScale, null, null, currentDoc.wallColor));
  currentDoc.shapes
    .filter(s => s.type === 'icon' && visEx(s))
    .forEach(s => drawIcon(s, toScreen, exportScale, currentDoc.wallColor));

  if (currentDoc.placements.length){
    drawPlacements(currentDoc.placements, currentDoc.parsedComponents,
                   toScreen, exportScale, currentDoc.wallWidth, currentDoc.wallColor,
                   currentDoc.featureThickness, currentDoc.componentThickness);
  }

  // world border
  {
    const [bx1, by1] = toScreen(x1, y2);
    const [bx2, by2] = toScreen(x2, y1);
    ctx.save();
    ctx.strokeStyle = 'rgba(95,201,166,0.45)';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx1, by1, bx2 - bx1, by2 - by1);
    ctx.restore();
  }

  // Restore live context
  ctx = savedCtx;

  offscreen.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = slug(currentDoc.title) + '.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
});

function slug(s){
  const base = (s||'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
  return base || 'diagram';
}

// Return the next unclaimed "Untitled Drawing (N)" name using localStorage
function nextUntitledName(){
  let claimed;
  try { claimed = new Set(JSON.parse(localStorage.getItem('cad-untitled-names') || '[]')); }
  catch(e) { claimed = new Set(); }

  // 'Untitled Drawing' is the base; then (1), (2), ...
  if (!claimed.has('Untitled Drawing')) return 'Untitled Drawing';
  let n = 1;
  while (claimed.has(`Untitled Drawing (${n})`)) n++;
  return `Untitled Drawing (${n})`;
}

function claimUntitledName(name){
  let claimed;
  try { claimed = new Set(JSON.parse(localStorage.getItem('cad-untitled-names') || '[]')); }
  catch(e) { claimed = new Set(); }
  claimed.add(name);
  try { localStorage.setItem('cad-untitled-names', JSON.stringify([...claimed])); }
  catch(e) {}
}

function makeUntitledScript(){
  const name = nextUntitledName();
  claimUntitledName(name);
  return { name, script: SAMPLE_SCRIPT.replace('Untitled Drawing', name) };
}

/* ============================= init ============================= */

(async function initDrawings(){
  const sel = el.drawingSelect;
  let drawings = [];

  try {
    const res = await fetch('json/drawings.json');
    const data = await res.json();
    drawings = data.drawings || [];
  } catch(e) {
    // No drawings.json — file:// or missing, just show blank doc
  }

  // Always show a blank untitled document on load
  function loadBlank(){
    const { script } = makeUntitledScript();
    docMeta = { created: new Date(), modified: new Date() };
    el.script.value = script;
    zoomLevel = 1; panX = 0; panY = 0;
    selectedIndices = new Set();
    syncGutter();
    runScript();
  }

  if (drawings.length){
    // Populate dropdown with a placeholder first option
    sel.innerHTML = '<option value="" disabled>— Open drawing… —</option>';
    for (const d of drawings){
      const opt = document.createElement('option');
      opt.value = d.file;
      opt.dataset.id = d.id;
      opt.textContent = d.title;
      opt.title = d.description || '';
      sel.appendChild(opt);
    }
    sel.value = ''; // nothing selected

    async function loadDrawing(file, id){
      try {
        const res = await fetch(file);
        let script;
        if (file.endsWith('.tc3')){
          script = await res.text();
        } else {
          const data = await res.json();
          script = data.script || SAMPLE_SCRIPT;
        }
        docMeta = { created: new Date(), modified: new Date() };
        el.script.value = script;
        zoomLevel = 1; panX = 0; panY = 0;
        selectedIndices = new Set();
        syncGutter();
        runScript();
        if (id) history.replaceState(null, '', '#' + id);
      } catch(e) {
        el.log.innerHTML = `<div class="err-line"><b>failed to load drawing:</b> ${e.message}</div>`;
      }
    }

    sel.addEventListener('change', () => {
      if (!sel.value) return;
      const opt = sel.options[sel.selectedIndex];
      loadDrawing(sel.value, opt.dataset.id);
    });

    // Honour URL hash if it matches a known drawing
    const hashId = window.location.hash.slice(1);
    const matched = hashId && drawings.find(d => d.id === hashId);
    if (matched){
      [...sel.options].forEach(o => { if (o.dataset.id === hashId) sel.value = o.value; });
      await loadDrawing(matched.file, matched.id);
    } else {
      // No hash — start with blank untitled doc
      loadBlank();
    }
  } else {
    sel.style.display = 'none';
    loadBlank();
  }
})();
