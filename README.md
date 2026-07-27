# Starship CAD

**A browser-based, text-command CAD tool for designing starship and submarine deck plans in the style of Traveller Starship Geomorphs 2.0.**

- **Started:** 2026-07-23
- **Current version:** v0.90
- **License:** Anthropic / CC BY-NC 4.0 (geomorph symbols derived from Pearce Design Studio, LLC)

---

## Overview

Starship CAD is a multi-file browser application. You type commands in a console panel on the left; the drawing updates live on the right. All coordinates are real-world units (default: metres). The tool is designed to produce deck plans that match the visual language of the Traveller Starship Geomorphs 2.0 series.

---

## Quick Start

```
title: My Ship — Deck 1
units: m
world: -20, -15, 20, 15
grid: 1.5
wallwidth: 0.25
wallcolor: #1e4a3d

rect: -18, -10, 18, 10
wall: -18, 10, 18, 10
label: -10, -2, 10, 2, Cargo Bay
```

---

## Command Reference

| Command | Syntax | Notes |
|---|---|---|
| `title` | `title: My Drawing` | Sets document title (Optima font in header) |
| `units` | `units: m` | Cosmetic unit label only |
| `world` | `world: x1, y1, x2, y2` | Defines the real-world bounding box |
| `grid` | `grid: 1.5` | Structure interior grid spacing (default 1.5) |
| `wallwidth` | `wallwidth: 0.2` | Default wall/outline stroke thickness in world units |
| `wallcolor` | `wallcolor: #1e4a3d` | Wall/outline/label colour; 3- or 6-digit hex |
| `featurethickness` | `featurethickness: 0.1` | Stroke width for door panel outlines |
| `componentthickness` | `componentthickness: 0.03` | Stroke width for component shape outlines |
| `rect` | `rect: x1, y1, x2, y2 [nowall] [#hex]` | Rectangle structure — white fill, grid, outline |
| `oval` | `oval: x1, y1, x2, y2 [nowall] [#hex]` | Ellipse structure inside bounding box |
| `semicircle` | `semicircle: x1, y1, x2, y2, dir [flags] [#hex]` | Half-ellipse; `dir` = flat edge side: `left right top bottom` |
| `wall` | `wall: x1, y1, x2, y2 [, width] [#hex]` | Thick structural line |
| `door` | `door: x1, y1, x2, y2 [#hex]` | Sliding door — wall line + hollow panel rect inset 0.3 m |
| `label` | `label: x1, y1, x2, y2, text` | Uppercase centred text; box height controls font size |
| `@component … @end` | See below | Define a reusable component in local coordinates |
| `place` | `place: name, x, y [, scale [, angle]]` | Place a component at world position with optional scale and rotation |
| `#` or `//` | `# comment` | Ignored |

### `rect` / `oval` / `semicircle` flags

Append after coordinates in any order:

- `nowall` — suppress all outlines (fill + grid still draw)
- `noflatwall` — semicircle only: suppress the closing straight edge
- `noleftwall`, `norightwall`, `notopwall`, `nobottomwall` — suppress individual sides
- `#rrggbb` — per-shape colour override

### `place` — angle convention

Angle is **degrees CCW from +X axis**, matching standard mathematical convention:

| Angle | Direction |
|---|---|
| 0° | Component faces right (+X) |
| 90° | Component faces up (+Y) |
| 180° | Component faces left (−X) |
| 270° | Component faces down (−Y) |

### `@component` blocks

```
@component chair_rect
  rect: -0.22, -0.22,  0.22,  0.22
  rect: -0.22,  0.22,  0.22,  0.32
  rect: -0.30, -0.10, -0.22,  0.22
  rect:  0.22, -0.10,  0.30,  0.22
@end

place: chair_rect, 5, 3, 1, 90
```

Supports `rect`, `oval`, `wall`, `label` inside. Origin at component centre.

**Built-in components:** `chair_rect`

---

## Viewport Controls

| Action | Effect |
|---|---|
| Scroll wheel | Zoom centred on viewport centre |
| `+` / `-` keys | Zoom in / out |
| `1` key | Reset zoom to fit |
| **Shift** + click drag | Pan the viewport |
| Click drag (empty space) | Pan the viewport |
| Click (component) | Select component — teal dashed ring |
| **Shift** + click (component) | Add/remove from selection |
| Click drag (selected component) | Move all selected; coordinates written to script on release |
| `Escape` | Deselect all |
| `R` | Rotate selected — prompt for new θ in degrees (CCW, mathematical convention) |
| `C` | Copy selected — duplicates `place:` lines; copies become new selection |
| `Q` | Quantize selected to nearest 0.75 m grid point |
| `⊕ Anchors` button | Toggle anchor display — crosses at shape corners/centres, orientation arrow on components |

---

## Toolbar

| Button | Action |
|---|---|
| Drawing dropdown | Load any drawing from `json/drawings.json` |
| New | New blank drawing (prompts confirmation) |
| Load | Load a saved `.json` file |
| Save JSON | Save script + metadata as `.json` (same format as `json/` files) |
| Export PNG | Render full world extent at 1800px long edge to PNG |
| ⊕ Anchors | Toggle anchor/debug overlay |
| ＋ / － / 1:1 | Zoom in / out / reset |

---

## Files

| File | Description |
|---|---|
| `index.html` | Main application HTML |
| `css/cad.css` | All styles — variables, layout, editor, canvas, buttons |
| `js/cad-constants.js` | Constants, `parseHex`, `SAMPLE_SCRIPT`, `BUILTIN_COMPONENTS` |
| `js/cad-state.js` | Application state variables and DOM refs |
| `js/cad-parser.js` | `parseNumbers`, `parseScript` — all command cases |
| `js/cad-components.js` | Built-in components and `drawPlacements` |
| `js/cad-render.js` | All draw/render functions |
| `js/cad-ui.js` | `syncGutter`, `runScript`, `escapeHtml`, `fmtDate` |
| `js/cad-actions.js` | Events, zoom, selection/drag/keyboard, toolbar, PNG export, init |
| `json/drawings.json` | Index of all available drawings shown in the dropdown |
| `json/submarine.json` | Instellarms 'Shield' Submarine deck plan |
| `json/tower.json` | Station Tower Level 3 |
| `component-editor.html` | Standalone component editor — visual canvas, shape list, coord fields, @component output |

---

## JSON Drawing Format

Saved files and `json/` drawing files share the same format:

```json
{
  "id": "my-drawing",
  "title": "My Drawing",
  "description": "Optional description.",
  "created": "2026-07-23T00:00:00.000Z",
  "modified": "2026-07-23T00:00:00.000Z",
  "script": "title: My Drawing\nunits: m\n..."
}
```

---

## Version History

| Version | Date | Changes |
|---|---|---|
| v0.90 | 2026-07-27 | Stair tread lines made much thinner — fixed scale-relative width capped at 1.2px so inner lines are clearly distinct from the outer frame |
| v0.89 | 2026-07-27 | venue.json updated from uploaded file |
| v0.88 | 2026-07-27 | Stair tread count now uses standard 0.19m riser height per building code — z=1m→6 treads, z=3m→16 treads, z=5m→27 treads |
| v0.87 | 2026-07-27 | `^bg: #hex` replaces `^#hex`; `^textcolor: #hex` is a new separate command replacing trailing `#hex` on `^text:`; venue.json converted |
| v0.86 | 2026-07-27 | `^text: text` replaces bare `^ text` — all `^` commands now use `^command:` syntax; reference panel updated; venue.json converted |
| v0.85 | 2026-07-27 | venue.json updated from uploaded file |
| v0.84 | 2026-07-27 | `^opacity: 0..1` sets fill transparency on previous shape; outline stays fully opaque; 0=transparent fill, 1=solid |
| v0.83 | 2026-07-27 | Stairs gradient fill — linear gradient from soft blue-tint at low end to near-white at high end, conveying elevation change visually |
| v0.82 | 2026-07-27 | `stairs` renderer rewritten — finds low/high edges by actual Z values on all 4 edges, correctly handles east-west/any-orientation stairs, smarter endpoint pairing avoids crossed tread lines |
| v0.81 | 2026-07-27 | Cursor highlight tightened — only fires on shape lines or `^` modifier lines directly attached to a shape; no longer grabs nearby shapes through loose line-number tolerance |
| v0.80 | 2026-07-27 | venue.json merged — Cocktail Alcove, West Arch, West Corridor, repositioned lounges/chats from v2 layout merged with colour treatments (red Morph/Security, grey kitchen/corridors) from v1 |
| v0.79 | 2026-07-27 | Editor cursor highlight — amber dashed outline drawn around the shape on the cursor line; updates on click/keyup; ±3 line tolerance catches `^` modifier lines |
| v0.78 | 2026-07-27 | `stairs: x1,y1,z1, x2,y2,z2, x3,y3,z3, x4,y4,z4 [, treadDepth]` — stair block with tread lines auto-derived from Z difference, direction arrow at low end; works at any angle |
| v0.77 | 2026-07-27 | Auto-format extended — blank line inserted between consecutive shape commands (rect, oval, wall, etc.) so each object gets visual separation in the editor |
| v0.76 | 2026-07-27 | `^elev: meters` — elevation tinting; higher = lighter blue-white fill, lower = darker; relative across all elevated shapes; elevation shown in hover info bar |
| v0.75 | 2026-07-27 | Auto-format on render — exactly one blank line inserted before `# ──` section comments; consecutive blank lines collapsed to one; cursor position preserved |
| v0.74 | 2026-07-27 | `^wallwidth: value` overrides global wall thickness for the previous shape only |
| v0.73 | 2026-07-27 | `^rotate-text: angleDeg` — rotates the most recent label's text around its own centre without moving the box; useful for vertical corridor labels |
| v0.72 | 2026-07-27 | venue.json updated — VR Pod Alcove resized, lounge colours added (`^#d9daea`), runway colour updated |
| v0.71 | 2026-07-27 | `^translate: dx, dy` and `^rotate: angleDeg [, cx, cy]` replace standalone commands; `^` handler skips labels when finding previous shape |
| v0.70 | 2026-07-27 | Removed venue title labels from venue.json |
| v0.69 | 2026-07-27 | `⬡ Components` link in toolbar opens `component-editor.html` |
| v0.68 | 2026-07-27 | `rotate: angleDeg [, cx, cy]` rotates previous shape bbox around its centre or given point; `translate: dx, dy` shifts previous shape; venue.json updated with `^#hex` background colours |
| v0.67 | 2026-07-27 | `^text #hex` — optional trailing hex on `^` label lines sets text colour (e.g. `^ Main Ballroom #ffffff` for white on dark background) |
| v0.66 | 2026-07-27 | `^#hex` sets background fill colour on previous shape; `^img: url` sets background image — both drawn under the grid, clipped to shape outline |
| v0.65 | 2026-07-27 | Info bar moved to fixed upper-right corner of canvas frame so coordinate HUD never grows or shifts; separate `#infoBar` element with its own CSS |
| v0.64 | 2026-07-27 | HUD info bar — selected component shows name and scaled width × height; hovering over a rect/oval/semicircle shows its dimensions; multi-select shows count |
| v0.63 | 2026-07-27 | Untitled document numbering via localStorage — each New increments to next unclaimed name: `Untitled Drawing`, `Untitled Drawing (1)`, `Untitled Drawing (2)`, etc. |
| v0.62 | 2026-07-27 | App starts with blank untitled document; dropdown shows "— Open drawing… —" placeholder with nothing selected; New button clears hash and resets dropdown; `SAMPLE_SCRIPT` is now a true blank |
| v0.61 | 2026-07-27 | URL hash routing — switching drawings updates `#id` in URL; reload/F5 restores the last viewed drawing; `index.html#venue` etc. are bookmarkable |
| v0.60 | 2026-07-27 | `^text` auto-label command — centres a 2m-tall label on the previous shape, no coordinates needed; venue.json rebuilt using `^` labels with no dimension text |
| v0.59 | 2026-07-23 | HUD coordinate display hidden entirely when mouse leaves canvas; shown on entry; hidden on load |
| v0.58 | 2026-07-23 | `image: x1, y1, x2, y2, url` command — loads image from URL or relative path, draws scaled to rect; loading/error placeholders; drawn below structures so walls/labels overlay it; `img:` alias |
| v0.57 | 2026-07-23 | World border — thin teal hairline rect drawn at exact world extents, on top of all shapes; also included in PNG export |
| v0.56 | 2026-07-23 | `component-editor.html` — separate visual component editor with canvas preview, shape list, coordinate fields, nowall toggle, add/delete shapes, copy `@component` output to clipboard |
| v0.55 | 2026-07-23 | Bed placement set to 0° (head faces right) |
| v0.54 | 2026-07-23 | `line:` command inside `@component` blocks — detail line using `componentthickness` with round caps; distinct from `wall:` (structural, square caps, `wallwidth`); bed mid-rail updated to use `line:` |
| v0.53 | 2026-07-23 | `bed` built-in component — outer frame, sleeping field, mid rail, foot section, pillow oval; 0.9 m × 2.0 m, head faces +Y at angle=0 |
| v0.52 | 2026-07-23 | Univers font loaded from cdnfonts.com CDN (`font-weight: 300`); `LABEL_FONT` updated to `'Univers', sans-serif` |
| v0.51 | 2026-07-23 | Chair positions updated to `(-14.25, ±2.25)` |
| v0.50 | 2026-07-23 | `submarine.json` set to definitive Instellarms 'Shield' script with centred geometry and Stern label at `18, -1, 22, 1` |
| v0.49 | 2026-07-23 | Submarine geometry re-centred to (0,0) by shifting all X coords +5.25 m |
| v0.48 | 2026-07-23 | Save JSON now writes unified drawing format (`id`, `title`, `description`, `script`) matching `json/` files; Load accepts both formats |
| v0.47 | 2026-07-23 | `json/drawings.json` index + `json/submarine.json` + `json/tower.json`; toolbar dropdown loads drawings; async init fetches index on startup |
| v0.46 | 2026-07-23 | `SAMPLE_SCRIPT` replaced with blank drawing default; full submarine script moved to `json/submarine.json` |
| v0.45 | 2026-07-23 | Ruler `niceStep` rewritten to prefer human-readable steps (5, 10, 15, 20…) with penalty against non-multiples of 5 |
| v0.44 | 2026-07-23 | JS split into 7 files under `js/`: `cad-constants`, `cad-state`, `cad-parser`, `cad-components`, `cad-render`, `cad-ui`, `cad-actions`; outer IIFE removed |
| v0.43 | 2026-07-23 | CSS moved to `css/cad.css`; `index.html` (renamed from `starship-cad.html`) references it via `<link>` |
| v0.42 | 2026-07-23 | `Ctrl+R` / `Cmd+R` no longer intercepted — browser reload works normally |
| v0.41 | 2026-07-23 | `Q` key — quantize selected components to nearest 0.75 m grid point (half a 1.5 m grid square) on both axes |
| v0.40 | 2026-07-23 | CSS extracted to `css/cad.css`; HTML references it via `<link rel="stylesheet" href="css/cad.css">` |
| v0.39 | 2026-07-23 | Fixed `R` key not working — replaced fragile optional-group regex in `syncPlacementAngle` with simple canonical rewrite |
| v0.38 | 2026-07-23 | Fixed `draggingPlacement is not defined` error — stale reference in mousemove replaced with `dragState` |
| v0.37 | 2026-07-23 | `Escape` key — deselects all components |
| v0.36 | 2026-07-23 | `C` key — copy selected components; new `place:` lines inserted after originals; copies become new selection |
| v0.35 | 2026-07-23 | `R` key — prompt to set new angle θ (degrees, CCW from +X); updates all selected; prompt clarifies mathematical delta theta convention |
| v0.34 | 2026-07-23 | Multi-drag — dragging a selected component moves all selected together; offsets preserved per component |
| v0.33 | 2026-07-23 | Selection system — `selectedIndices` Set; click selects, Shift+click multi-selects, click empty deselects; teal dashed ring on selected components |
| v0.32 | 2026-07-23 | `featurethickness:` wired into `drawDoor` as panel outline stroke; `DEFAULT_FEATURE_THICKNESS = 0.1` |
| v0.31 | 2026-07-23 | `wallcolor:` added to default submarine script; `door:` repositioned to bulkhead wall |
| v0.30 | 2026-07-23 | Default drawing set to submarine deck plan demonstrating semicircle, nowall, noflatwall, door, labels, and chair components |
| v0.29 | 2026-07-23 | Geomorph extraction — 427 individual tile PNGs split from 214 source sheets; symbol library with 63 named symbols |
| v0.28 | 2026-07-23 | Component drag — click near component centre to grab and drag; Shift+drag pans; coordinates written back to script on release |
| v0.27 | 2026-07-23 | Component orientation arrow — dashed arrow from centre showing local 0° direction in anchors mode |
| v0.26 | 2026-07-23 | Component anchor overlay — crosshair + circle at placement origin when anchors mode on; highlights on hover |
| v0.25 | 2026-07-23 | `componentthickness:` command — separate line width for component shapes (default 0.03 m) |
| v0.24 | 2026-07-23 | `chair_rect` built-in component (seat, backrest, two armrests) defined in script as `@component` block |
| v0.23 | 2026-07-23 | `@component … @end` block syntax and `place:` command — local coordinate components with position, scale, rotation |
| v0.22 | 2026-07-23 | Export PNG fixed — renders to offscreen canvas at full world extent (1800px long edge), white background, independent of browser window size or zoom/pan |
| v0.21 | 2026-07-23 | `featurethickness:` command controls door panel outline stroke (default 0.1 m) |
| v0.20 | 2026-07-23 | `door:` command — sliding door symbol: wall line + hollow panel rect inset 0.3 m from ends, works at any angle |
| v0.19 | 2026-07-23 | Label hover highlight — dashed red box + text colour change when mouse enters label bounding box |
| v0.18 | 2026-07-23 | `wallcolor:` command — sets global wall/outline/label colour; per-shape `#hex` override on rect/oval/semicircle/wall |
| v0.17 | 2026-07-23 | Canvas cursor set to crosshair; switches to grabbing hand while panning |
| v0.16 | 2026-07-23 | Canvas frame decorations — corner brackets, midpoint edge ticks, centre crosshair |
| v0.15 | 2026-07-23 | Scroll wheel zoom fixed — keeps viewport centre stable, scales panX/panY proportionally |
| v0.14 | 2026-07-23 | Click-drag pan; zoom/pan reset on New and Load |
| v0.13 | 2026-07-23 | Zoom: `+`/`-`/`1` keys, ＋/－/1:1 toolbar buttons, scroll wheel zoom centred on viewport centre |
| v0.12 | 2026-07-23 | `noflatwall`, `noleftwall`, `norightwall`, `notopwall`, `nobottomwall` flags on semicircle |
| v0.11 | 2026-07-23 | `semicircle:` command with `left/right/top/bottom` direction; fill, grid clip, and per-edge wall suppression flags |
| v0.10 | 2026-07-23 | Anchor hover highlight — nearest anchor brightens and grows when mouse is within 18px |
| v0.09 | 2026-07-23 | `⊕ Anchors` toggle button — red plus marks at corners, centres, and midpoints of all shapes |
| v0.08 | 2026-07-23 | Removed `labelsize:` command — box height is the only size control |
| v0.07 | 2026-07-23 | Label font size driven purely by box height in world units for consistent sizing |
| v0.06 | 2026-07-23 | Label font set to `"Univers Normal"` only |
| v0.05 | 2026-07-23 | `label:` / `text:` command — uppercase, centred in box, box height controls font size |
| v0.04 | 2026-07-23 | Wall endpoints use square linecap — stop at exact coordinates, miter at shared corners |
| v0.03 | 2026-07-23 | Removed decorative dot texture from canvas background |
| v0.02 | 2026-07-23 | Ruler ticks now snap to grid multiples so numbers align with actual grid lines |
| v0.01 | 2026-07-23 | Initial build — world coordinates, units, grid, rect, oval, wall commands; live text console with gutter; HUD cursor coords; dark UI with teal accent |

---

## Geomorph Symbol Library

63 symbols extracted from *Starship Geomorphs 2.0* (Pearce Design Studio, LLC, CC BY-NC 4.0):

**Furniture & Staterooms** — bed, bed w/storage, bunk beds, steerage triple bunk, desks, couch, chairs, mini-stateroom B/D
**Bathroom / Fresher** — combo toilet/sink/shower, toilet, sinks, showers
**Shipboard Equipment** — lockers, weapons locker, holotable, control panels, workstation, window/security glass, repair bench
**Medical** — medical bed, autodoc, privacy screen, restraint bed, low berth
**Lounge / Commons** — round/rect tables+chairs, mess hall table, gaming table, small galley
**Plants & Landscape** — bushes/trees, stone path, bench, boulders, fountain, landscape area
**Engineering** — machinery/drives, batteries, computers, engineering section
**Circulation** — elevator, stairs down, stairwell
**Airlocks & Doors** — A/L airlock, iris valve (wall/up/down/both), hatch (wall/up/down/both), sliding door
**Weapons & Sensors** — missile launch tube, probe launch tube, manned turret
**Cargo** — 10×20, 10×10, 5×5, small cargo, special climate cargo

---

*Starship Geomorphs 2.0 © 2020 Pearce Design Studio, LLC — CC BY-NC 4.0*
