# Project Architecture

## 1. Purpose

This document describes the current architectural view of the project, its subsystem boundaries, core data flow, and development constraints.

It is intended for:

- future maintainers
- developers taking over the project
- AI assistants that must work within explicit technical boundaries

This document describes the **intended architecture direction**, not a claim that every part of the current codebase is already perfectly aligned with it.

---

## 2. Project Positioning

This project is a browser-based isometric room editing and presentation system backed by a lightweight local server.

It currently consists of two top-level subsystems:

1. **Main Program (Game / Scene Program)**
   - responsible for scene usage, item placement, character motion, layer ordering, lighting, scene persistence, and asset consumption

2. **Asset / Prefab Editor**
   - responsible for producing prefab assets consumable by the main program, including voxel editing, sprite import, anchor / offset / scale configuration, and prefab export

These two subsystems are connected through a shared **prefab data contract** rather than direct UI-level coupling.

---

## 3. Top-Level Structure

### 3.1 Main Program

The main program is responsible for:

- instantiating prefabs into a scene
- managing item position and draw-order relationships
- handling player movement, collision, and occlusion
- handling optional lighting and shadow rendering
- saving, loading, and restoring scenes
- managing logs and debug output
- importing and managing external asset sources

### 3.2 Asset Editor

The asset editor is responsible for:

- voxel editing
- sprite image import
- scale / offset / anchor configuration
- prefab preview
- exporting unified prefab data

### 3.3 Relationship Between the Two

The editor and the main program are not merely two UI areas within one page. They are separate runtime entry points with different responsibilities.

Their key integration point is:

## **The Prefab Data Contract**

The editor produces standard prefab definitions; the main program consumes those definitions.

---

## 4. Main Program Subsystems

### 4.1 Placement and Ordering System

Responsible for:

- placing prefab instances into the scene
- managing instance position, rotation, naming, and placement attributes
- resolving front/back draw ordering among objects
- supporting selection, dragging, deletion, and inspection behavior

This subsystem answers:

> What objects exist in the scene, where are they, and how do they participate in draw ordering?

The word “layer” here should not be interpreted as a simple z-index. It refers to unified isometric ordering based on footprint, anchor, occlusion, and spatial rules.

### 4.2 Player Movement, Collision, and Player-Related Layering

Responsible for:

- player position updates
- movement direction and animation-facing state
- collision checks against scene objects
- walkable-space determination
- front/back relationships between player and objects
- player proxy volume and player-related spatial calculations

This subsystem cooperates closely with placement but should remain conceptually distinct.

### 4.3 Lighting System

Responsible for:

- light definition and management
- light parameters such as intensity, color, radius, angle, and spread
- object shadows
- player shadows
- toggles for lighting / shadow rendering

Architecturally, this system should be treated as:

> An optional enhancement layer attached to the main rendering pipeline

It must not become a hard prerequisite for unrelated core logic.

### 4.4 Scene Storage and Restore System

Responsible for:

- scene serialization
- scene deserialization
- browser-side persistence such as localStorage
- default-scene loading
- scene file save / load
- scene JSON import / export

Its core responsibility is:

> Convert runtime scene state into persistent data, and correctly restore persistent data back into runtime scene state.

This system persists **scene instance state**, not prefab definitions.

### 4.5 Logging System

Responsible for:

- recording user operations
- recording state transitions
- recording IO / API outcomes
- providing debug information and error traces
- improving observability for maintenance and debugging

The logging system should not own business decisions; it only records and supports diagnosis.

### 4.6 Asset Management and Import System

Responsible for:

- managing the prefab library
- importing Habbo assets
- importing prefab data produced by the editor
- maintaining asset indexes and browsing entry points
- transforming external asset sources into unified internal structures

Long-term, this should evolve into a general asset intake layer rather than a set of one-off import paths.

### 4.7 Input and Interaction Control Layer

Responsible for:

- mouse / keyboard / wheel / drag event handling
- mode interpretation
- translating raw input into standard actions
- dispatching actions to state, logic, and rendering

### 4.8 Rendering and Update Orchestration Layer

Responsible for:

- update loop
- render loop
- subsystem invocation ordering
- optional feature ordering
- overall per-frame runtime flow

### 4.9 Core Data Model Layer

Responsible for unified definitions of:

- prefab
- scene
- instance
- light
- player
- asset library item

This layer answers:

> What do the system’s core objects look like?

---

## 5. Asset Editor Subsystems

### 5.1 Voxel Editing Module
Responsible for voxel editing.

### 5.2 Sprite Editing Module
Responsible for sprite import, scale, offset, and anchor configuration.

### 5.3 Prefab Export Module
Responsible for exporting unified prefab data.

### 5.4 Editor State Module
Responsible for current edit target, edit mode, and preview state.

### 5.5 Preview Rendering Module
Responsible for rendering the edited asset inside the editor.

---

## 6. Current File-to-Architecture Mapping

The current codebase is not fully modularized, but it can be mapped approximately as follows:

| File | Current Primary Responsibility |
|---|---|
| `index.html` | main program entry |
| `START_V18_ONLY.html` | asset editor entry |
| `src/infrastructure/legacy/state.js` | global state, prefab / scene-related base objects, shared runtime state |
| `src/infrastructure/storage/scene-storage.js` | scene storage and restore logic (extracted module) |
| `src/presentation/ui/ui.js` | main-program UI synchronization and controls |
| `src/presentation/render/logic.js` | coordinate math, collision, occlusion, shared spatial logic |
| `src/presentation/render/render.js` | scene rendering |
| `src/presentation/shell/app.js` | bootstrapping, event wiring, initialization, loop orchestration |
| `src/presentation/editor/editor-unified-v18.js` | asset editor core logic |
| `local_server.py` | local file service and scene / prefab / Habbo APIs |

---

## 7. Core Data Flow

### 7.1 Editor to Main Program

```text
Asset Editor
    ↓
Generate prefab JSON
    ↓
Save into prefab library
    ↓
Main program reads prefab index
    ↓
User selects prefab
    ↓
Prefab is instantiated into the scene
```

### 7.2 Main Program Internal Flow

```text
User input
    ↓
Interaction control
    ↓
State update / logic computation
    ↓
Render ordering / layer decision
    ↓
Optional lighting enhancement
    ↓
Final frame output
```

### 7.3 Scene Persistence Flow

```text
Current runtime state
    ↓
Serialize into scene data
    ↓
Write to file / browser storage
    ↓
Load again
    ↓
Restore scene instances and configuration
```

---

## 8. Development Rules and Boundaries

### Rule 1
The main program must not depend on editor-internal UI logic. The connection must remain the prefab data contract.

### Rule 2
New external asset sources should first pass through the asset-management/import layer, then be transformed into unified prefab structures.

### Rule 3
Ordering, collision, and occlusion belong to a shared spatial logic domain and should not diverge into incompatible duplicate implementations.

### Rule 4
Scene and prefab must remain distinct:

- scene = instance state
- prefab = asset definition

### Rule 5
The lighting system must remain optional and must not become a hard dependency for unrelated core behavior.

### Rule 6
Refactor rounds should prioritize extraction and concentration before redesign.

### Rule 7
AI work must always be explicitly bounded:

- what files may change
- what modules may not change
- whether data structures may change
- what the acceptance criteria are

---

## 9. Current Refactor Strategy

The project should currently evolve using this strategy:

1. establish documentation and boundaries first
2. extract one subsystem at a time
3. preserve behavior during each round
4. validate after each round
5. only attempt deeper structural migration after several boundaries have stabilized

The first recommended subsystem extraction is the **scene storage and restore system**, rather than the more tightly coupled lighting system.

---

## 10. Recommended Additional Documents

The following documents are recommended as next steps:

- `docs/DATA_MODEL.md`
- `docs/API.md`
- `docs/REGRESSION_CHECKLIST.md`
- `docs/REFACTOR_PLAN.md`

