/* =====================
   Script Parser
   Starship CAD
   ===================== */

/* ============================= parser ============================= */
function parseNumbers(str, count){
  const parts = str.split(/[\s,]+/).filter(Boolean);
  if (parts.length < count) throw new Error(`expected ${count} numbers, got ${parts.length}`);
  return parts.slice(0, count).map(p => {
    const v = parseFloat(p);
    if (Number.isNaN(v)) throw new Error(`"${p}" is not a number`);
    return v;
  });
}

function parseScript(text){
  const doc = { title:'', units:'', world:null, gridSize:DEFAULT_GRID, wallWidth:DEFAULT_WALL_WIDTH, featureThickness:DEFAULT_FEATURE_THICKNESS, componentThickness:DEFAULT_COMPONENT_THICKNESS, wallColor:DEFAULT_WALL_COLOR, shapes:[], components:{}, placements:[] };
  const errors = [];
  const lines = text.split('\n');

  // ── first pass: extract component blocks ──────────────────────────
  // component blocks are:
  //   @component name
  //   ... shape commands in local coords ...
  //   @end
  const scriptLines = [];
  let inComponent = null, componentLines = [];
  for (const raw of lines){
    const trimmed = raw.trim();
    if (trimmed.toLowerCase().startsWith('@component')){
      const name = trimmed.split(/\s+/).slice(1).join('_').toLowerCase();
      inComponent = name;
      componentLines = [];
    } else if (trimmed.toLowerCase() === '@end' && inComponent){
      doc.components[inComponent] = componentLines.join('\n');
      inComponent = null;
      componentLines = [];
    } else if (inComponent){
      componentLines.push(raw);
    } else {
      scriptLines.push(raw);
    }
  }

  // ── parse component shape lists (using a lightweight sub-parser) ──
  function parseComponentShapes(text){
    const shapes = [];
    for (const raw of text.split('\n')){
      const line = raw.trim();
      if (!line || line.startsWith('#') || line.startsWith('//')) continue;
      const m = line.match(/^([A-Za-z_]+)\s*:?\s*(.*)$/);
      if (!m) continue;
      const key = m[1].toLowerCase(), rest = m[2].trim();
      try {
        if (key === 'rect'){
          const n = parseNumbers(rest, 4);
          const nowall = /\bnowall\b/i.test(rest);
          const cm = rest.match(/#([0-9a-fA-F]{3,6})\b/);
          shapes.push({ type:'rect', x1:n[0],y1:n[1],x2:n[2],y2:n[3], nowall, color: cm?parseHex(cm[1]):null });
        } else if (key === 'wall'){
          const n = parseNumbers(rest, 4);
          const cm = rest.match(/#([0-9a-fA-F]{3,6})\b/);
          shapes.push({ type:'wall', x1:n[0],y1:n[1],x2:n[2],y2:n[3], color: cm?parseHex(cm[1]):null });
        } else if (key === 'line'){
          const n = parseNumbers(rest, 4);
          const cm = rest.match(/#([0-9a-fA-F]{3,6})\b/);
          shapes.push({ type:'line', x1:n[0],y1:n[1],x2:n[2],y2:n[3], color: cm?parseHex(cm[1]):null });
        } else if (key === 'oval'){
          const n = parseNumbers(rest, 4);
          const nowall = /\bnowall\b/i.test(rest);
          const cm = rest.match(/#([0-9a-fA-F]{3,6})\b/);
          shapes.push({ type:'oval', x1:n[0],y1:n[1],x2:n[2],y2:n[3], nowall, color: cm?parseHex(cm[1]):null });
        } else if (key === 'label' || key === 'text'){
          const lm = rest.match(/^\s*(-?\d+(?:\.\d+)?)[\s,]+(-?\d+(?:\.\d+)?)[\s,]+(-?\d+(?:\.\d+)?)[\s,]+(-?\d+(?:\.\d+)?)\s*,?\s*(.*)$/);
          if (lm) shapes.push({ type:'label', x1:parseFloat(lm[1]),y1:parseFloat(lm[2]),x2:parseFloat(lm[3]),y2:parseFloat(lm[4]), text:lm[5].trim() });
        }
      } catch(e){ /* skip bad lines in components */ }
    }
    return shapes;
  }

  // Pre-parse all user-defined components
  const parsedComponents = {};
  for (const [name, src] of Object.entries(doc.components)){
    parsedComponents[name] = parseComponentShapes(src);
  }
  // Merge built-in components
  for (const [name, shapes] of Object.entries(BUILTIN_COMPONENTS)){
    if (!parsedComponents[name]) parsedComponents[name] = shapes;
  }
  doc.parsedComponents = parsedComponents;

  // ── second pass: parse main script ───────────────────────────────
  scriptLines.forEach((raw, idx) => {
    const lineNum = idx + 1;
    const line = raw.trim();
    if (!line) return;
    if (line.startsWith('#') || line.startsWith('//')) return;

    // ^ command — auto-label, background colour, or background image on the previous shape
    if (line.startsWith('^')){
      const rest = line.slice(1).trim();
      if (!rest){ errors.push({lineNum, msg:'^ needs text, #hex, img:, ^translate:, or ^rotate:'}); return; }

      // find last non-label shape so chained ^ commands all target the same rect/oval/etc
      const prev = [...doc.shapes].reverse().find(s =>
        ['rect','oval','semicircle','wall','door','image'].includes(s.type));
      if (!prev){ errors.push({lineNum, msg:'^ has no preceding shape'}); return; }

      // ^#hex — background colour
      if (/^#[0-9a-fA-F]{3,6}$/.test(rest)){
        try { prev.bgColor = parseHex(rest.slice(1)); } catch(e) { errors.push({lineNum, msg: e.message}); }
        return;
      }

      // ^img: url — background image
      if (rest.toLowerCase().startsWith('img:')){
        prev.bgImage = rest.slice(4).trim();
        return;
      }

      // ^translate: dx, dy — shift in world coordinates
      if (rest.toLowerCase().startsWith('translate:')){
        try {
          const n = parseNumbers(rest.slice(10).trim(), 2);
          prev.x1 += n[0]; prev.x2 += n[0];
          prev.y1 += n[1]; prev.y2 += n[1];
        } catch(e){ errors.push({lineNum, msg: e.message}); }
        return;
      }

      // ^elev: meters — set elevation on previous shape; affects fill lightness
      if (rest.toLowerCase().startsWith('elev:')){
        try {
          const v = parseFloat(rest.slice(5).trim());
          if (Number.isNaN(v)) throw new Error('elevation must be a number');
          prev.elev = v;
        } catch(e){ errors.push({lineNum, msg: e.message}); }
        return;
      }

      // ^wallwidth: value — override wall thickness for the previous shape
      if (rest.toLowerCase().startsWith('wallwidth:')){
        try {
          const v = parseFloat(rest.slice(10).trim());
          if (Number.isNaN(v) || v <= 0) throw new Error('wallwidth must be a positive number');
          prev.wallWidth = v;
        } catch(e){ errors.push({lineNum, msg: e.message}); }
        return;
      }

      // ^rotate-text: angleDeg — rotates just the label text, not the shape
      if (rest.toLowerCase().startsWith('rotate-text:')){
        try {
          const deg = parseFloat(rest.slice(12).trim());
          if (Number.isNaN(deg)) throw new Error('invalid angle');
          // find the most recent label shape
          const prevLabel = [...doc.shapes].reverse().find(s => s.type === 'label');
          if (!prevLabel) throw new Error('no preceding label to rotate');
          prevLabel.textRotation = deg * Math.PI / 180;
        } catch(e){ errors.push({lineNum, msg: e.message}); }
        return;
      }

      // ^rotate: angleDeg [, cx, cy]
      if (rest.toLowerCase().startsWith('rotate:')){
        try {
          const parts = rest.slice(7).trim().split(/[\s,]+/).filter(Boolean);
          if (!parts.length) throw new Error('expected: angleDeg [, cx, cy]');
          const angleDeg = parseFloat(parts[0]);
          if (Number.isNaN(angleDeg)) throw new Error('invalid angle');
          const angle = angleDeg * Math.PI / 180;
          const cos = Math.cos(angle), sin = Math.sin(angle);
          const pcx = parts.length >= 3 ? parseFloat(parts[1]) : (prev.x1 + prev.x2) / 2;
          const pcy = parts.length >= 3 ? parseFloat(parts[2]) : (prev.y1 + prev.y2) / 2;
          const rotPt = (x, y) => [pcx+(x-pcx)*cos-(y-pcy)*sin, pcy+(x-pcx)*sin+(y-pcy)*cos];
          const corners = [rotPt(prev.x1,prev.y1),rotPt(prev.x2,prev.y1),rotPt(prev.x1,prev.y2),rotPt(prev.x2,prev.y2)];
          prev.x1 = Math.min(...corners.map(p=>p[0])); prev.x2 = Math.max(...corners.map(p=>p[0]));
          prev.y1 = Math.min(...corners.map(p=>p[1])); prev.y2 = Math.max(...corners.map(p=>p[1]));
        } catch(e){ errors.push({lineNum, msg: e.message}); }
        return;
      }

      // ^text [#hex] — auto-label centred on previous shape, optional text colour
      const colorMatch = rest.match(/\s+(#[0-9a-fA-F]{3,6})$/);
      const text = colorMatch ? rest.slice(0, -colorMatch[0].length).trim() : rest;
      let textColor = null;
      if (colorMatch){ try { textColor = parseHex(colorMatch[1].slice(1)); } catch(e){} }
      const cx = (prev.x1 + prev.x2) / 2;
      const cy = (prev.y1 + prev.y2) / 2;
      const hw = Math.abs(prev.x2 - prev.x1) / 2;
      doc.shapes.push({
        type:'label',
        x1: cx - hw, y1: cy - 1, x2: cx + hw, y2: cy + 1,
        text, color: textColor, lineNum
      });
      return;
    }

    const m = line.match(/^([A-Za-z_]+)\s*:?\s*(.*)$/);
    if (!m){ errors.push({lineNum, msg:`could not parse "${raw.trim()}"`}); return; }
    const key = m[1].toLowerCase();
    const rest = m[2].trim();

    try{
      switch(key){
        case 'title':
          doc.title = rest;
          break;
        case 'units':
          doc.units = rest;
          break;
        case 'world': {
          const n = parseNumbers(rest, 4);
          doc.world = { x1:Math.min(n[0],n[2]), y1:Math.min(n[1],n[3]), x2:Math.max(n[0],n[2]), y2:Math.max(n[1],n[3]) };
          break;
        }
        case 'grid': {
          const v = parseFloat(rest);
          if (Number.isNaN(v) || v <= 0) throw new Error(`grid spacing must be a positive number`);
          doc.gridSize = v;
          break;
        }
        case 'wallwidth': {
          const v = parseFloat(rest);
          if (Number.isNaN(v) || v <= 0) throw new Error(`wallwidth must be a positive number`);
          doc.wallWidth = v;
          break;
        }
        case 'wallcolor':
        case 'wallcolour': {
          doc.wallColor = parseHex(rest);
          break;
        }
        case 'featurethickness': {
          const v = parseFloat(rest);
          if (Number.isNaN(v) || v <= 0) throw new Error(`featurethickness must be a positive number`);
          doc.featureThickness = v;
          break;
        }
        case 'componentthickness': {
          const v = parseFloat(rest);
          if (Number.isNaN(v) || v <= 0) throw new Error(`componentthickness must be a positive number`);
          doc.componentThickness = v;
          break;
        }
        case 'rect': {
          const n = parseNumbers(rest, 4);
          const nowall = /\bnowall\b/i.test(rest);
          const cm = rest.match(/#([0-9a-fA-F]{3,6})\b/);
          const color = cm ? parseHex(cm[1]) : null;
          doc.shapes.push({ type:'rect', x1:n[0], y1:n[1], x2:n[2], y2:n[3], nowall, color, lineNum });
          break;
        }
        case 'oval': {
          const n = parseNumbers(rest, 4);
          const nowall = /\bnowall\b/i.test(rest);
          const cm = rest.match(/#([0-9a-fA-F]{3,6})\b/);
          const color = cm ? parseHex(cm[1]) : null;
          doc.shapes.push({ type:'oval', x1:n[0], y1:n[1], x2:n[2], y2:n[3], nowall, color, lineNum });
          break;
        }
        case 'semicircle':
        case 'semi': {
          const n = parseNumbers(rest, 4);
          const parts = rest.split(/[\s,]+/).filter(Boolean);
          const dir = (parts[4] || 'right').toLowerCase();
          if (!['left','right','top','bottom'].includes(dir))
            throw new Error(`direction must be left, right, top, or bottom`);
          const nowall    = /\bnowall\b/i.test(rest);
          const noleft    = nowall || /\bnoleftwall\b/i.test(rest);
          const noright   = nowall || /\bnorightwall\b/i.test(rest);
          const notop     = nowall || /\bnotopwall\b/i.test(rest);
          const nobottom  = nowall || /\bnobottomwall\b/i.test(rest);
          const noflatwall = /\bnoflatwall\b/i.test(rest);
          const cm = rest.match(/#([0-9a-fA-F]{3,6})\b/);
          const color = cm ? parseHex(cm[1]) : null;
          doc.shapes.push({ type:'semicircle', x1:n[0], y1:n[1], x2:n[2], y2:n[3], dir,
            nowall, noleft, noright, notop, nobottom, noflatwall, color, lineNum });
          break;
        }
        case 'wall': {
          const n = parseNumbers(rest, 4);
          const parts = rest.split(/[\s,]+/).filter(Boolean);
          let width = null;
          if (parts.length >= 5){
            const w = parseFloat(parts[4]);
            if (!Number.isNaN(w) && w > 0) width = w;
          }
          const cm = rest.match(/#([0-9a-fA-F]{3,6})\b/);
          const color = cm ? parseHex(cm[1]) : null;
          doc.shapes.push({ type:'wall', x1:n[0], y1:n[1], x2:n[2], y2:n[3], width, color, lineNum });
          break;
        }
        case 'door': {
          const n = parseNumbers(rest, 4);
          const cm = rest.match(/#([0-9a-fA-F]{3,6})\b/);
          const color = cm ? parseHex(cm[1]) : null;
          doc.shapes.push({ type:'door', x1:n[0], y1:n[1], x2:n[2], y2:n[3], color, lineNum });
          break;
        }
        case 'stairs':
        case 'stair': {
          // stairs: x1,y1,z1, x2,y2,z2, x3,y3,z3, x4,y4,z4 [, treadDepth]
          // Corners given in order: bottom-left, bottom-right, top-right, top-left (world space).
          // Z values determine which edge is the bottom (low Z) and which is the top (high Z).
          // Treads are drawn perpendicular to the travel direction.
          const parts = rest.split(/[\s,]+/).filter(Boolean).map(parseFloat);
          if (parts.length < 12) throw new Error(`stairs: expected x1,y1,z1, x2,y2,z2, x3,y3,z3, x4,y4,z4`);
          const corners = [
            { x: parts[0],  y: parts[1],  z: parts[2]  },
            { x: parts[3],  y: parts[4],  z: parts[5]  },
            { x: parts[6],  y: parts[7],  z: parts[8]  },
            { x: parts[9],  y: parts[10], z: parts[11] },
          ];
          const treadDepth = parts[12] || 0.3;
          const cm = rest.match(/#([0-9a-fA-F]{3,6})\b/);
          const color = cm ? parseHex(cm[1]) : null;
          doc.shapes.push({ type:'stairs', corners, treadDepth, color, lineNum,
            // bbox for anchor/info purposes
            x1: Math.min(...corners.map(c=>c.x)), y1: Math.min(...corners.map(c=>c.y)),
            x2: Math.max(...corners.map(c=>c.x)), y2: Math.max(...corners.map(c=>c.y)) });
          break;
        }
        case 'place': {
          // place: componentName, x, y [, scale [, angleDeg]]
          // x,y = world position of component origin
          // scale = uniform scale factor (default 1)
          // angleDeg = rotation CCW from +X axis (default 0)
          const parts = rest.split(/[\s,]+/).filter(Boolean);
          if (parts.length < 3) throw new Error(`expected: componentName, x, y [, scale [, angle]]`);
          const name  = parts[0].toLowerCase();
          const px    = parseFloat(parts[1]);
          const py    = parseFloat(parts[2]);
          const sc    = parts.length >= 4 ? parseFloat(parts[3]) : 1.0;
          const angle = parts.length >= 5 ? parseFloat(parts[4]) * Math.PI / 180 : 0;
          if (Number.isNaN(px)||Number.isNaN(py)) throw new Error(`invalid position`);
          doc.placements.push({ name, x:px, y:py, scale:sc, angle, lineNum });
          break;
        }
        case 'label':
        case 'text': {
          const m2 = rest.match(/^\s*(-?\d+(?:\.\d+)?)[\s,]+(-?\d+(?:\.\d+)?)[\s,]+(-?\d+(?:\.\d+)?)[\s,]+(-?\d+(?:\.\d+)?)\s*,?\s*(.*)$/);
          if (!m2) throw new Error(`expected: x1, y1, x2, y2, text`);
          const text = m2[5].trim();
          if (!text) throw new Error(`label text is empty`);
          doc.shapes.push({
            type:'label',
            x1:parseFloat(m2[1]), y1:parseFloat(m2[2]), x2:parseFloat(m2[3]), y2:parseFloat(m2[4]),
            text, lineNum
          });
          break;
        }
        case 'image':
        case 'img': {
          // image: x1, y1, x2, y2, url-or-filename
          const m2 = rest.match(/^\s*(-?\d+(?:\.\d+)?)[\s,]+(-?\d+(?:\.\d+)?)[\s,]+(-?\d+(?:\.\d+)?)[\s,]+(-?\d+(?:\.\d+)?)\s*,?\s*(.*)$/);
          if (!m2) throw new Error(`expected: x1, y1, x2, y2, url`);
          const src = m2[5].trim();
          if (!src) throw new Error(`image url/filename is empty`);
          doc.shapes.push({
            type:'image',
            x1:parseFloat(m2[1]), y1:parseFloat(m2[2]), x2:parseFloat(m2[3]), y2:parseFloat(m2[4]),
            src, img:null, lineNum
          });
          break;
        }
        default:
          errors.push({lineNum, msg:`unknown command "${key}"`});
      }
    }catch(e){
      errors.push({lineNum, msg:e.message});
    }
  });

  return { doc, errors };
}
