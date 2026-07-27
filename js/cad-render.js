/* =====================
   Rendering
   Starship CAD
   ===================== */

/* ============================= image cache ============================= */
const imageCache = {}; // src → HTMLImageElement (or 'loading' / 'error')

function loadImage(src){
  if (imageCache[src]) return imageCache[src];
  imageCache[src] = 'loading';
  const img = new Image();
  img.onload  = () => { imageCache[src] = img; renderCanvas(); };
  img.onerror = () => { imageCache[src] = 'error'; renderCanvas(); };
  img.src = src;
  return 'loading';
}

function drawImageShape(s, toScreen){
  const cached = loadImage(s.src);
  const [sx1, sy1] = toScreen(s.x1, s.y1);
  const [sx2, sy2] = toScreen(s.x2, s.y2);
  const left = Math.min(sx1,sx2), top = Math.min(sy1,sy2);
  const w = Math.abs(sx2-sx1), h = Math.abs(sy2-sy1);
  if (w < 1 || h < 1) return;

  ctx.save();
  if (cached instanceof HTMLImageElement){
    ctx.drawImage(cached, left, top, w, h);
  } else if (cached === 'loading'){
    // placeholder while loading
    ctx.strokeStyle = 'rgba(95,201,166,0.4)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4,3]);
    ctx.strokeRect(left, top, w, h);
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(95,201,166,0.15)';
    ctx.fillRect(left, top, w, h);
    ctx.fillStyle = '#5f7a73';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('loading…', left + w/2, top + h/2);
  } else {
    // error
    ctx.strokeStyle = 'rgba(217,119,106,0.6)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4,3]);
    ctx.strokeRect(left, top, w, h);
    ctx.setLineDash([]);
    ctx.fillStyle = '#d9776a';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const name = s.src.split('/').pop();
    ctx.fillText(`⚠ ${name}`, left + w/2, top + h/2);
  }
  ctx.restore();
}


function niceStep(scale, gridSize){
  // Pick a ruler tick step that gives readable round numbers.
  // Prefer multiples of 5; target ~90px between ticks.
  const targetPx = 90;
  const rawStep = targetPx / scale;
  const niceSteps = [0.5,1,2,2.5,5,10,15,20,25,50,100,150,200,250,500,1000];
  let best = niceSteps[0], bestScore = Infinity;
  for (const s of niceSteps){
    const dist = Math.abs(Math.log(s / rawStep));
    const penalty = (s % 5 === 0 || s % 2.5 === 0) ? 0 : 0.3;
    if (dist + penalty < bestScore){ bestScore = dist + penalty; best = s; }
  }
  return best;
}

function fitCanvas(){
  const host = el.canvasHost;
  const dpr = window.devicePixelRatio || 1;
  const w = host.clientWidth, h = host.clientHeight;
  el.canvas.width = Math.max(1, Math.floor(w * dpr));
  el.canvas.height = Math.max(1, Math.floor(h * dpr));
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { w, h };
}

function renderCanvas(){
  const { w:cssW, h:cssH } = fitCanvas();
  ctx.clearRect(0, 0, cssW, cssH);

  if (!currentDoc || !currentDoc.world){
    viewport = null;
    ctx.save();
    ctx.fillStyle = '#3a4a46';
    ctx.font = '12px ' + getComputedStyle(document.body).fontFamily;
    ctx.textAlign = 'center';
    ctx.fillText('define a world: x1, y1, x2, y2 to begin', cssW/2, cssH/2);
    ctx.restore();
    el.worldStatus.textContent = 'world undefined';
    el.scaleStatus.textContent = '';
    return;
  }

  const { x1, y1, x2, y2 } = currentDoc.world;
  const worldW = Math.max(x2 - x1, 1e-6);
  const worldH = Math.max(y2 - y1, 1e-6);

  const pad = { top:34, right:18, bottom:18, left:40 };
  const availW = cssW - pad.left - pad.right;
  const availH = cssH - pad.top - pad.bottom;
  const fitScale = Math.max(0.0001, Math.min(availW / worldW, availH / worldH));
  const scale = fitScale * zoomLevel;
  const drawW = worldW * scale, drawH = worldH * scale;
  const offsetX = pad.left + (availW - drawW) / 2 + panX;
  const offsetY = pad.top  + (availH - drawH) / 2 + panY;

  viewport = { x1, y1, x2, y2, scale, offsetX, offsetY, cssW, cssH };

  const toScreen = (wx, wy) => [ offsetX + (wx - x1) * scale, offsetY + (y2 - wy) * scale ];

  // rulers
  drawRulers(toScreen, x1, y1, x2, y2, scale, offsetX, offsetY, drawW, drawH, currentDoc.gridSize);

  // images first (below structures)
  currentDoc.shapes
    .filter(s => s.type === 'image')
    .forEach(s => drawImageShape(s, toScreen));

  // structures first (fill + grid + outline)
  currentDoc.shapes
    .filter(s => s.type === 'rect' || s.type === 'oval' || s.type === 'semicircle')
    .forEach(s => drawStructure(s, toScreen, scale, currentDoc.gridSize, currentDoc.wallWidth, currentDoc.wallColor));

  // walls on top
  currentDoc.shapes
    .filter(s => s.type === 'wall')
    .forEach(s => drawWall(s, toScreen, scale, currentDoc.wallWidth, currentDoc.wallColor));

  // doors on top of walls
  currentDoc.shapes
    .filter(s => s.type === 'door')
    .forEach(s => drawDoor(s, toScreen, scale, currentDoc.wallWidth, currentDoc.wallColor, currentDoc.featureThickness));

  // labels on top of everything
  currentDoc.shapes
    .filter(s => s.type === 'label')
    .forEach(s => drawLabel(s, toScreen, scale, hoverWx, hoverWy, currentDoc.wallColor));

  // component placements
  if (currentDoc.placements.length){
    drawPlacements(currentDoc.placements, currentDoc.parsedComponents,
                   toScreen, scale, currentDoc.wallWidth, currentDoc.wallColor,
                   currentDoc.featureThickness, currentDoc.componentThickness);
  }

  // selection highlight rings (always visible when something is selected)
  if (selectedIndices.size && currentDoc.placements){
    ctx.save();
    for (const idx of selectedIndices){
      const p = currentDoc.placements[idx];
      if (!p) continue;
      const [sx, sy] = toScreen(p.x, p.y);
      ctx.strokeStyle = '#5fc9a6';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 3]);
      ctx.beginPath();
      ctx.arc(sx, sy, 18, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();
  }

  // debug anchors
  if (showAnchors){
    currentDoc.shapes.forEach(s => drawAnchors(s, toScreen, hoverWx, hoverWy));
    // component placement centres
    currentDoc.placements.forEach(p => {
      const [sx, sy] = toScreen(p.x, p.y);
      const HOT_DIST = 18;
      const hasHover = hoverWx !== null && viewport;
      let hot = false;
      if (hasHover){
        const [hsx, hsy] = toScreen(hoverWx, hoverWy);
        hot = Math.hypot(sx - hsx, sy - hsy) < HOT_DIST;
      }
      const SIZE = hot ? 10 : 7;
      ctx.save();
      ctx.strokeStyle = hot ? '#ff8080' : '#e05050';
      ctx.lineWidth = hot ? 2 : 1.5;
      // crosshair
      ctx.beginPath();
      ctx.moveTo(sx - SIZE, sy); ctx.lineTo(sx + SIZE, sy);
      ctx.moveTo(sx, sy - SIZE); ctx.lineTo(sx, sy + SIZE);
      ctx.stroke();
      // small circle around centre
      ctx.beginPath();
      ctx.arc(sx, sy, SIZE * 0.45, 0, Math.PI * 2);
      ctx.stroke();
      // orientation arrow — points in direction of local +X axis (angle=0 faces right)
      const arrowLen = SIZE * 2.2;
      // local +X in screen space: rotate (1,0) by angle, then flip Y for canvas
      const ax = Math.cos(p.angle);
      const ay = Math.sin(p.angle);
      // toScreen maps world, but we just need screen direction: +X is right, +Y is up (flipped)
      const ex = sx + ax * arrowLen;
      const ey = sy - ay * arrowLen; // subtract because canvas Y is flipped
      ctx.save();
      ctx.strokeStyle = hot ? '#ff8080' : '#e05050';
      ctx.lineWidth = hot ? 2 : 1.5;
      ctx.setLineDash([3, 2]);
      ctx.beginPath();
      ctx.moveTo(sx, sy); ctx.lineTo(ex, ey);
      ctx.stroke();
      ctx.setLineDash([]);
      // arrowhead
      const headLen = 5, headAngle = 0.4;
      const ang = Math.atan2(ey - sy, ex - sx);
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(ex - headLen * Math.cos(ang - headAngle), ey - headLen * Math.sin(ang - headAngle));
      ctx.moveTo(ex, ey);
      ctx.lineTo(ex - headLen * Math.cos(ang + headAngle), ey - headLen * Math.sin(ang + headAngle));
      ctx.stroke();
      ctx.restore();
      ctx.restore(); // outer save from crosshair
    });
  }

  // status line
  // world border — thin teal hairline at exact world extents
  {
    const [bx1, by1] = toScreen(x1, y2); // top-left in screen space
    const [bx2, by2] = toScreen(x2, y1); // bottom-right in screen space
    ctx.save();
    ctx.strokeStyle = 'rgba(95,201,166,0.45)';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx1, by1, bx2 - bx1, by2 - by1);
    ctx.restore();
  }

  el.worldStatus.innerHTML = `world <span>${fmt(x1)}, ${fmt(y1)}</span> to <span>${fmt(x2)}, ${fmt(y2)}</span> &nbsp;·&nbsp; units <span>${currentDoc.units || '—'}</span> &nbsp;·&nbsp; grid <span>${currentDoc.gridSize}</span>`;
  el.scaleStatus.textContent = `zoom ${Math.round(zoomLevel * 100)}% · 1 unit ≈ ${scale.toFixed(1)} px`;
}

function drawRulers(toScreen, x1, y1, x2, y2, scale, offsetX, offsetY, drawW, drawH, gridSize){
  const step = niceStep(scale, gridSize);
  ctx.save();
  ctx.strokeStyle = 'rgba(73,165,134,0.35)';
  ctx.fillStyle = '#5f7a73';
  ctx.font = '9px ' + getComputedStyle(document.body).fontFamily;
  ctx.lineWidth = 1;

  // top ruler
  ctx.textAlign = 'center';
  let start = Math.ceil(x1/step)*step;
  for (let gx = start; gx <= x2 + 1e-9; gx += step){
    const [sx] = toScreen(gx, y2);
    ctx.beginPath();
    ctx.moveTo(sx, offsetY - 6);
    ctx.lineTo(sx, offsetY);
    ctx.stroke();
    ctx.fillText(fmt(gx), sx, offsetY - 10);
  }
  // left ruler
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  start = Math.ceil(y1/step)*step;
  for (let gy = start; gy <= y2 + 1e-9; gy += step){
    const [, sy] = toScreen(x1, gy);
    ctx.beginPath();
    ctx.moveTo(offsetX - 6, sy);
    ctx.lineTo(offsetX, sy);
    ctx.stroke();
    ctx.fillText(fmt(gy), offsetX - 10, sy);
  }
  ctx.restore();
}

function shapePath(s, toScreen, scale){
  ctx.beginPath();
  if (s.type === 'rect'){
    const [sx1, sy1] = toScreen(s.x1, s.y1);
    const [sx2, sy2] = toScreen(s.x2, s.y2);
    const x = Math.min(sx1, sx2), y = Math.min(sy1, sy2);
    const w = Math.abs(sx2 - sx1), h = Math.abs(sy2 - sy1);
    ctx.rect(x, y, w, h);
  } else if (s.type === 'oval'){
    const cx = (s.x1 + s.x2) / 2, cy = (s.y1 + s.y2) / 2;
    const [scx, scy] = toScreen(cx, cy);
    const rx = Math.abs(s.x2 - s.x1) / 2 * scale;
    const ry = Math.abs(s.y2 - s.y1) / 2 * scale;
    ctx.ellipse(scx, scy, Math.max(rx,0.01), Math.max(ry,0.01), 0, 0, Math.PI * 2);
  } else if (s.type === 'semicircle'){
    // bounding box corners in screen space
    const [sx1, sy1] = toScreen(s.x1, s.y1);
    const [sx2, sy2] = toScreen(s.x2, s.y2);
    const left = Math.min(sx1, sx2), right = Math.max(sx1, sx2);
    const top  = Math.min(sy1, sy2), bottom = Math.max(sy1, sy2);
    const cx = (left + right) / 2, cy = (top + bottom) / 2;
    const hw = (right - left) / 2, hh = (bottom - top) / 2;
    // dir = which side the flat edge is on
    const dir = s.dir || 'right';
    if (dir === 'right'){
      // flat edge on right, dome opens left
      ctx.moveTo(cx, top);
      ctx.ellipse(cx, cy, hw, hh, 0, -Math.PI/2, Math.PI/2, true);
      ctx.lineTo(cx, bottom);
      ctx.closePath();
    } else if (dir === 'left'){
      // flat edge on left, dome opens right
      ctx.moveTo(cx, top);
      ctx.ellipse(cx, cy, hw, hh, 0, -Math.PI/2, Math.PI/2, false);
      ctx.lineTo(cx, bottom);
      ctx.closePath();
    } else if (dir === 'bottom'){
      // flat edge on bottom, dome opens up
      ctx.moveTo(left, cy);
      ctx.ellipse(cx, cy, hw, hh, 0, Math.PI, 0, true);
      ctx.lineTo(right, cy);
      ctx.closePath();
    } else { // top
      // flat edge on top, dome opens down
      ctx.moveTo(left, cy);
      ctx.ellipse(cx, cy, hw, hh, 0, Math.PI, 0, false);
      ctx.lineTo(right, cy);
      ctx.closePath();
    }
  }
}

function drawStructure(s, toScreen, scale, gridSize, wallWidth, docWallColor){
  const color = s.color || docWallColor || WALL_COLOR;
  ctx.save();
  shapePath(s, toScreen, scale);
  ctx.fillStyle = PAPER_COLOR;
  ctx.fill();

  // Background colour or image, clipped to shape
  if (s.bgColor || s.bgImage){
    ctx.save();
    shapePath(s, toScreen, scale);
    ctx.clip();
    if (s.bgColor){
      ctx.fillStyle = s.bgColor;
      ctx.fill();
    }
    if (s.bgImage){
      const cached = loadImage(s.bgImage);
      if (cached instanceof HTMLImageElement){
        const [sx1, sy1] = toScreen(s.x1, s.y1);
        const [sx2, sy2] = toScreen(s.x2, s.y2);
        const left = Math.min(sx1,sx2), top = Math.min(sy1,sy2);
        const w = Math.abs(sx2-sx1), h = Math.abs(sy2-sy1);
        ctx.drawImage(cached, left, top, w, h);
      }
    }
    ctx.restore();
  }

  ctx.save();
  shapePath(s, toScreen, scale);
  ctx.clip();
  drawGrid(s, toScreen, gridSize);
  ctx.restore();

  if (s.type === 'semicircle' && !s.nowall){
    const [sx1, sy1] = toScreen(s.x1, s.y1);
    const [sx2, sy2] = toScreen(s.x2, s.y2);
    const left = Math.min(sx1,sx2), right = Math.max(sx1,sx2);
    const top  = Math.min(sy1,sy2), bottom = Math.max(sy1,sy2);
    const cx = (left+right)/2, cy = (top+bottom)/2;
    const hw = (right-left)/2, hh = (bottom-top)/2;
    const dir = s.dir || 'right';
    const lw = Math.max(2, wallWidth * scale);
    ctx.lineWidth = lw;
    ctx.strokeStyle = color;

    const suppressDomeArc = (dir==='right'  && s.noleft)   ||
                             (dir==='left'   && s.noright)  ||
                             (dir==='bottom' && s.notop)    ||
                             (dir==='top'    && s.nobottom);
    const suppressFlatEdge = s.noflatwall ||
                             (dir==='right'  && s.noright)  ||
                             (dir==='left'   && s.noleft)   ||
                             (dir==='bottom' && s.nobottom) ||
                             (dir==='top'    && s.notop);

    if (!suppressDomeArc){
      ctx.beginPath();
      if (dir==='right')       ctx.ellipse(cx, cy, hw, hh, 0, -Math.PI/2, Math.PI/2, true);
      else if (dir==='left')   ctx.ellipse(cx, cy, hw, hh, 0, -Math.PI/2, Math.PI/2, false);
      else if (dir==='bottom') ctx.ellipse(cx, cy, hw, hh, 0, Math.PI, 0, true);
      else                     ctx.ellipse(cx, cy, hw, hh, 0, Math.PI, 0, false);
      ctx.stroke();
    }
    if (!suppressFlatEdge){
      ctx.beginPath();
      if (dir==='right' || dir==='left'){ ctx.moveTo(cx, top); ctx.lineTo(cx, bottom); }
      else                              { ctx.moveTo(left, cy); ctx.lineTo(right, cy); }
      ctx.stroke();
    }
  } else if (!s.nowall){
    shapePath(s, toScreen, scale);
    ctx.lineWidth = Math.max(2, wallWidth * scale);
    ctx.strokeStyle = color;
    ctx.stroke();
  }
  ctx.restore();
}

function drawGrid(s, toScreen, gridSize){
  const minX = Math.min(s.x1, s.x2), maxX = Math.max(s.x1, s.x2);
  const minY = Math.min(s.y1, s.y2), maxY = Math.max(s.y1, s.y2);
  ctx.strokeStyle = GRID_COLOR;
  ctx.lineWidth = 1;

  let startX = Math.floor(minX / gridSize) * gridSize;
  for (let gx = startX; gx <= maxX + 1e-9; gx += gridSize){
    const [sx1, sy1] = toScreen(gx, minY);
    const [sx2, sy2] = toScreen(gx, maxY);
    ctx.beginPath(); ctx.moveTo(sx1, sy1); ctx.lineTo(sx2, sy2); ctx.stroke();
  }
  let startY = Math.floor(minY / gridSize) * gridSize;
  for (let gy = startY; gy <= maxY + 1e-9; gy += gridSize){
    const [sx1, sy1] = toScreen(minX, gy);
    const [sx2, sy2] = toScreen(maxX, gy);
    ctx.beginPath(); ctx.moveTo(sx1, sy1); ctx.lineTo(sx2, sy2); ctx.stroke();
  }
}

function drawWall(s, toScreen, scale, defaultWidth, docWallColor){
  const [sx1, sy1] = toScreen(s.x1, s.y1);
  const [sx2, sy2] = toScreen(s.x2, s.y2);
  const width = s.width || defaultWidth;
  const color = s.color || docWallColor || WALL_COLOR;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2.5, width * scale);
  ctx.lineCap = 'square';
  ctx.beginPath();
  ctx.moveTo(sx1, sy1);
  ctx.lineTo(sx2, sy2);
  ctx.stroke();
  ctx.restore();
}

function drawDoor(s, toScreen, scale, wallWidth, docWallColor, featureThickness){
  const WALL_T  = wallWidth || 0.177;
  const DOOR_T  = WALL_T * 1.51;        // panel half-thickness in world units
  const INSET   = 0.3;
  const FEAT_T  = featureThickness || DEFAULT_FEATURE_THICKNESS;
  const color   = s.color || docWallColor || WALL_COLOR;

  // Direction vector along the door
  const dx = s.x2 - s.x1, dy = s.y2 - s.y1;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return;
  const ux = dx / len, uy = dy / len;   // unit along door
  const nx = -uy,  ny = ux;             // unit normal (perpendicular)

  // ── 1. Wall line (full length, wall thickness) ──────────────────
  const [sx1, sy1] = toScreen(s.x1, s.y1);
  const [sx2, sy2] = toScreen(s.x2, s.y2);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineCap = 'square';
  ctx.lineWidth = Math.max(2, WALL_T * scale);
  ctx.beginPath();
  ctx.moveTo(sx1, sy1); ctx.lineTo(sx2, sy2);
  ctx.stroke();

  // ── 2. Door panel hollow rect ────────────────────────────────────
  // Panel runs from (inset along axis) to (len - inset along axis)
  // and extends DOOR_T/2 on each side of the wall centre line
  const half = DOOR_T / 2;

  // Four corners in world space
  const p = (t, side) => {
    const wx = s.x1 + ux * t + nx * side;
    const wy = s.y1 + uy * t + ny * side;
    return toScreen(wx, wy);
  };
  const corners = [
    p(INSET,       -half),
    p(len - INSET, -half),
    p(len - INSET,  half),
    p(INSET,        half),
  ];

  ctx.fillStyle = PAPER_COLOR;
  ctx.beginPath();
  ctx.moveTo(...corners[0]);
  corners.slice(1).forEach(c => ctx.lineTo(...c));
  ctx.closePath();
  ctx.fill();

  // Outline the panel using featureThickness
  ctx.lineWidth = Math.max(0.5, FEAT_T * scale);
  ctx.lineCap = 'square';
  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.moveTo(...corners[0]);
  corners.slice(1).forEach(c => ctx.lineTo(...c));
  ctx.closePath();
  ctx.stroke();

  ctx.restore();
}

function drawLabel(s, toScreen, scale, hoverWx, hoverWy, docWallColor){
  const baseColor = s.color || docWallColor || WALL_COLOR;
  const [sx1, sy1] = toScreen(s.x1, s.y1);
  const [sx2, sy2] = toScreen(s.x2, s.y2);
  const left = Math.min(sx1, sx2), right = Math.max(sx1, sx2);
  const top = Math.min(sy1, sy2), bottom = Math.max(sy1, sy2);
  const boxW = right - left, boxH = bottom - top;
  if (boxW < 3 || boxH < 3) return;

  // check if mouse is inside the label box (in world coords)
  const minX = Math.min(s.x1, s.x2), maxX = Math.max(s.x1, s.x2);
  const minY = Math.min(s.y1, s.y2), maxY = Math.max(s.y1, s.y2);
  const hot = hoverWx !== null &&
    hoverWx >= minX && hoverWx <= maxX &&
    hoverWy >= minY && hoverWy <= maxY;

  const text = s.text.toUpperCase();
  const cx = (left + right) / 2, cy = (top + bottom) / 2;
  const worldBoxH = Math.abs(s.y2 - s.y1);
  const fontSize = worldBoxH * scale * 0.35;
  if (fontSize < 4) return;

  ctx.save();

  // highlight box outline on hover
  if (hot){
    ctx.strokeStyle = '#ff8080';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(left, top, boxW, boxH);
    ctx.setLineDash([]);
  }

  ctx.fillStyle = hot ? '#ff8080' : baseColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${LABEL_WEIGHT} ${fontSize}px ${LABEL_FONT}`;
  ctx.fillText(text, cx, cy + fontSize * 0.03);
  ctx.restore();
}

function drawAnchors(s, toScreen, hoverWx, hoverWy){
  const CROSS = 5;
  const CROSS_HOT = 8;
  const HOT_DIST = 18; // screen pixels
  const points = [];

  if (s.type === 'rect' || s.type === 'oval' || s.type === 'label'){
    points.push([s.x1, s.y1], [s.x2, s.y1], [s.x1, s.y2], [s.x2, s.y2]);
    points.push([(s.x1+s.x2)/2, (s.y1+s.y2)/2]);
  } else if (s.type === 'semicircle'){
    // corners of bounding box + center + midpoints of each edge
    const cx = (s.x1+s.x2)/2, cy = (s.y1+s.y2)/2;
    points.push([s.x1, s.y1], [s.x2, s.y1], [s.x1, s.y2], [s.x2, s.y2]);
    points.push([cx, cy]);
    points.push([cx, s.y1], [cx, s.y2], [s.x1, cy], [s.x2, cy]);
  } else if (s.type === 'wall' || s.type === 'door'){
    points.push([s.x1, s.y1], [s.x2, s.y2]);
    points.push([(s.x1+s.x2)/2, (s.y1+s.y2)/2]);
  }

  ctx.save();
  ctx.lineWidth = 1.5;
  const hasHover = hoverWx !== null && viewport;
  const [hsx, hsy] = hasHover ? toScreen(hoverWx, hoverWy) : [0, 0];
  for (const [wx, wy] of points){
    const [sx, sy] = toScreen(wx, wy);
    const hot = hasHover && Math.hypot(sx - hsx, sy - hsy) < HOT_DIST;
    const size = hot ? CROSS_HOT : CROSS;
    ctx.strokeStyle = hot ? '#ff8080' : '#e05050';
    ctx.lineWidth = hot ? 2.5 : 1.5;
    ctx.beginPath();
    ctx.moveTo(sx - size, sy); ctx.lineTo(sx + size, sy);
    ctx.moveTo(sx, sy - size); ctx.lineTo(sx, sy + size);
    ctx.stroke();
  }
  ctx.restore();
}

function fmt(n){
  const r = Math.round(n * 100) / 100;
  return (Object.is(r,-0)?0:r).toString();
}
