/* =====================
   Constants & Configuration
   Starship CAD
   ===================== */

/* ============================= constants ============================= */
const WALL_COLOR = '#1e4a3d';
const DEFAULT_WALL_COLOR = WALL_COLOR;

function parseHex(s){
  const h = s.trim().replace(/^#/,'');
  if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(h))
    throw new Error(`"#${h}" is not a valid hex colour (e.g. #22574A or #900)`);
  return '#' + h;
}
const GRID_COLOR = '#cfd6d2';
const PAPER_COLOR = '#ffffff';
const DEFAULT_GRID = 1.5;
const DEFAULT_WALL_WIDTH = 0.2;
const DEFAULT_FEATURE_THICKNESS = 0.1;
const DEFAULT_COMPONENT_THICKNESS = 0.03;  // line width for component shapes in world units
const LABEL_FONT = '"Univers Normal"';
const LABEL_WEIGHT = '300';

const SAMPLE_SCRIPT =
`title: New Drawing
units: m
world: -20, -15, 20, 15
grid: 1.5
wallwidth: 0.25
wallcolor: #1e4a3d

rect: -18, -13, 18, 13
`;
