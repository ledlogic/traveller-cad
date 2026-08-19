/* =====================
   Application State & DOM Refs
   Starship CAD
   ===================== */

/* ============================= state ============================= */
let docMeta = { created: null, modified: null };
let currentDoc = null;     // parsed {title, units, world, gridSize, wallWidth, shapes}
let viewport = null;       // {x1,y1,x2,y2,scale,offsetX,offsetY,canvasW,canvasH}
let debounceTimer = null;
let showAnchors = false;
let showStaff = true;
let showInches = false;  // when true, ruler labels show inches (1.5m = 1in)
let hoverWx = null, hoverWy = null;
let cursorLineNum = -1;   // 1-based line number of cursor in script editor
let zoomLevel = 1.0;   // multiplier on top of the fit-to-canvas scale
let panX = 0, panY = 0; // pan offset in screen pixels

/* ============================= dom refs ============================= */
const el = {
  script: document.getElementById('script'),
  gutter: document.getElementById('gutter'),
  lineCount: document.getElementById('lineCount'),
  log: document.getElementById('log'),
  statusDot: document.getElementById('statusDot'),
  titleDisplay: document.getElementById('titleDisplay'),
  createdDisplay: document.getElementById('createdDisplay'),
  modifiedDisplay: document.getElementById('modifiedDisplay'),
  worldStatus: document.getElementById('worldStatus'),
  scaleStatus: document.getElementById('scaleStatus'),
  hud: document.getElementById('hud'),
  infoBar: document.getElementById('infoBar'),
  canvasHost: document.getElementById('canvasHost'),
  canvas: document.getElementById('stage-canvas'),
  btnRender: document.getElementById('btnRender'),
  btnNew: document.getElementById('btnNew'),
  btnLoad: document.getElementById('btnLoad'),
  btnSave: document.getElementById('btnSave'),
  btnPng: document.getElementById('btnPng'),
  exportRes: document.getElementById('exportRes'),
  btnDebug: document.getElementById('btnDebug'),
  btnStaff: document.getElementById('btnStaff'),
  btnInches: document.getElementById('btnInches'),
  btnZoomIn: document.getElementById('btnZoomIn'),
  btnZoomOut: document.getElementById('btnZoomOut'),
  btnZoomReset: document.getElementById('btnZoomReset'),
  drawingSelect: document.getElementById('drawingSelect'),
  fileInput: document.getElementById('fileInput'),
};
let ctx = el.canvas.getContext('2d');
