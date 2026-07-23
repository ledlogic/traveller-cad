# Starship CAD

**A browser-based, text-command CAD tool for designing starship and submarine deck plans in the style of Traveller Starship Geomorphs 2.0.**

- **Started:** 2026-07-23
- **Current version:** v0.46
- **License:** Anthropic / CC BY-NC 4.0 (geomorph symbols derived from Pearce Design Studio, LLC)

---

## Overview

Starship CAD is a single-file HTML application. You type commands in a console panel on the left; the drawing updates live on the right. All coordinates are real-world units (default: metres). The tool is designed to produce deck plans that match the visual language of the Traveller Starship Geomorphs 2.0 series.

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
| Click drag (component centre) | Move component; coordinates written back to script |
| `⊕ Anchors` button | Toggle anchor display — crosses at corners/centres, orientation arrow on components |

---

## Toolbar

| Button | Action |
|---|---|
| New | New blank drawing (prompts confirmation) |
| Load | Load a saved `.json` file |
| Save JSON | Save script + metadata as `.json` |
| Export PNG | Render full world extent at 1800px long edge to PNG |
| ⊕ Anchors | Toggle anchor/debug overlay |
| ＋ / － / 1:1 | Zoom in / out / reset |

---

## Files

| File | Description |
|---|---|
| `starship-cad.html` | Main application — fully self-contained single HTML file |
| `geomorphs_extracted.zip` | 427 individual geomorph tile PNGs split from source sheets |
| `geomorph_symbol_library.html` | Browsable HTML catalogue of 63 extracted symbols |
| `geomorph_symbols.zip` | Raw PNG symbol files + manifest JSON |
| `README.md` | This file |

---

## Version History

| Version | Date | Changes |
|---|---|---|
| v0.01 | 2026-07-23 | Initial build — world coordinates, units, grid, rect, oval, wall commands; live text console with gutter; HUD cursor coords; dark UI with teal accent |
| v0.02 | 2026-07-23 | Ruler ticks now snap to grid multiples so numbers align with actual grid lines |
| v0.03 | 2026-07-23 | Removed decorative dot texture from canvas background |
| v0.04 | 2026-07-23 | Wall endpoints use square linecap — stop at exact coordinates, miter at shared corners |
| v0.05 | 2026-07-23 | `label:` / `text:` command — uppercase, centred in box, box height controls font size; `Univers Normal` font |
| v0.06 | 2026-07-23 | Label font set to `"Univers Normal"` only |
| v0.07 | 2026-07-23 | Label font size driven purely by box height in world units for consistent sizing |
| v0.08 | 2026-07-23 | Removed `labelsize:` command — box height is the only size control |
| v0.09 | 2026-07-23 | `⊕ Anchors` toggle button — red plus marks at corners, centres, and midpoints of all shapes |
| v0.10 | 2026-07-23 | Anchor hover highlight — nearest anchor brightens and grows when mouse is within 18px |
| v0.11 | 2026-07-23 | `semicircle:` command with `left/right/top/bottom` direction; fill, grid clip, and per-edge wall suppression flags |
| v0.12 | 2026-07-23 | `noflatwall`, `noleftwall`, `norightwall`, `notopwall`, `nobottomwall` flags on semicircle |
| v0.13 | 2026-07-23 | Zoom: `+`/`-`/`1` keys, ＋/－/1:1 toolbar buttons, scroll wheel zoom centred on viewport centre |
| v0.14 | 2026-07-23 | Click-drag pan; zoom/pan reset on New and Load |
| v0.15 | 2026-07-23 | Scroll wheel zoom fixed — keeps viewport centre stable, scales panX/panY proportionally |
| v0.16 | 2026-07-23 | Canvas frame decorations — corner brackets, midpoint edge ticks, centre crosshair |
| v0.17 | 2026-07-23 | Canvas cursor set to crosshair; switches to grabbing hand while panning |
| v0.18 | 2026-07-23 | `wallcolor:` command — sets global wall/outline/label colour; per-shape `#hex` override on rect/oval/semicircle/wall |
| v0.19 | 2026-07-23 | Label hover highlight — dashed red box + text colour change when mouse enters label bounding box |
| v0.20 | 2026-07-23 | `door:` command — sliding door symbol: wall line + hollow panel rect inset 0.3 m from ends, works at any angle |
| v0.21 | 2026-07-23 | `featurethickness:` command controls door panel outline stroke (default 0.1 m) |
| v0.22 | 2026-07-23 | Export PNG fixed — renders to offscreen canvas at full world extent (1800px long edge), white background, independent of browser window size or zoom/pan |
| v0.23 | 2026-07-23 | `@component … @end` block syntax and `place:` command — local coordinate components with position, scale, rotation |
| v0.24 | 2026-07-23 | `chair_rect` built-in component (seat, backrest, two armrests) defined in script as `@component` block |
| v0.25 | 2026-07-23 | `componentthickness:` command — separate line width for component shapes (default 0.03 m) |
| v0.26 | 2026-07-23 | Component anchor overlay — crosshair + circle at placement origin when anchors mode on; highlights on hover |
| v0.27 | 2026-07-23 | Component orientation arrow — dashed arrow from centre showing local 0° direction in anchors mode |
| v0.28 | 2026-07-23 | Component drag — click near component centre to grab and drag; Shift+drag pans; coordinates written back to script on release |
| v0.29 | 2026-07-23 | Geomorph extraction — 427 individual tile PNGs split from 214 source sheets; symbol library with 63 named symbols |
| v0.30 | 2026-07-23 | Default drawing set to submarine deck plan demonstrating semicircle, nowall, noflatwall, door, labels, and chair components |

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