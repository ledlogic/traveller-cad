/* =====================
   Components
   Starship CAD
   ===================== */

/* ============================= built-in components ============================= */
// All coordinates in LOCAL space: origin at component centre, units = meters.
// chair_rect: ~0.5m wide, ~0.5m deep. Seat + back + two armrests.
// Facing "up" (+Y) at angle=0.
const BUILTIN_COMPONENTS = {
  chair_rect: [
    // seat — full square
    { type:'rect', x1:-0.22, y1:-0.22, x2:0.22, y2:0.18, nowall:false },
    // back rest — thin rect at top
    { type:'rect', x1:-0.22, y1: 0.18, x2:0.22, y2:0.27, nowall:false },
    // left arm
    { type:'rect', x1:-0.27, y1:-0.15, x2:-0.22, y2:0.18, nowall:false },
    // right arm
    { type:'rect', x1: 0.22, y1:-0.15, x2:0.27, y2:0.18, nowall:false },
  ],
};

/* ============================= component rendering ============================= */
function drawPlacements(placements, parsedComponents, toScreen, scale, wallWidth, wallColor, featureThickness, componentThickness){
  const compLW = componentThickness || DEFAULT_COMPONENT_THICKNESS; // world units

  for (const p of placements){
    const shapes = parsedComponents[p.name];
    if (!shapes){
      const [sx, sy] = toScreen(p.x, p.y);
      ctx.save();
      ctx.strokeStyle = '#e05050'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(sx-8,sy-8); ctx.lineTo(sx+8,sy+8);
      ctx.moveTo(sx+8,sy-8); ctx.lineTo(sx-8,sy+8);
      ctx.stroke();
      ctx.restore();
      continue;
    }

    const sc = p.scale || 1;
    ctx.save();
    const [ox, oy] = toScreen(p.x, p.y);
    ctx.translate(ox, oy);
    ctx.rotate(-p.angle);
    ctx.scale(sc * scale, sc * scale);

    // Line width in LOCAL units — canvas transform handles the rest.
    // Divide by scale to counteract the ctx.scale above so it stays in world units.
    const lw = compLW;

    for (const s of shapes){
      const color = s.color || wallColor || WALL_COLOR;

      if (s.type === 'rect'){
        const x = Math.min(s.x1, s.x2), y = -Math.max(s.y1, s.y2);
        const w = Math.abs(s.x2 - s.x1), h = Math.abs(s.y2 - s.y1);
        ctx.fillStyle = PAPER_COLOR;
        ctx.fillRect(x, y, w, h);
        if (!s.nowall){
          ctx.strokeStyle = color;
          ctx.lineWidth = lw;
          ctx.lineCap = 'square';
          ctx.lineJoin = 'miter';
          ctx.strokeRect(x, y, w, h);
        }
      } else if (s.type === 'oval'){
        const cx = (s.x1+s.x2)/2, cy = -((s.y1+s.y2)/2);
        const rx = Math.abs(s.x2-s.x1)/2, ry = Math.abs(s.y2-s.y1)/2;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI*2);
        ctx.fillStyle = PAPER_COLOR; ctx.fill();
        if (!s.nowall){
          ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.stroke();
        }
      } else if (s.type === 'wall'){
        ctx.strokeStyle = s.color || wallColor || WALL_COLOR;
        ctx.lineWidth = lw; ctx.lineCap = 'square';
        ctx.beginPath();
        ctx.moveTo(s.x1, -s.y1); ctx.lineTo(s.x2, -s.y2);
        ctx.stroke();
      }
    }

    ctx.restore();
  }
}
