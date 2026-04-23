# Target Structure (Long-Term Direction)

## 1. Purpose

This document describes a **long-term target structure** for the project. It is **not** the structure that must be implemented in the current round.

The current project should evolve toward this structure gradually through small, behavior-preserving refactors.

---

## 2. Recommended Target Layout

```text
src/
  systems/
    scene-storage/
      scene-storage.js
    asset-management/
      asset-management.js
    logging/
      logging.js
    lighting/
      lighting.js
    player/
      player.js
    placement/
      placement.js
  core/
    state.js
    app.js
    render.js
    logic.js
  editor/
    editor-unified-v18.js
```

---

## 3. Interpretation

### 3.1 `systems/`

Contains stable business subsystems that are expected to exist long-term and own clear responsibilities.

- `scene-storage/`: scene serialization, loading, file persistence, default-scene handling
- `asset-management/`: prefab library, external asset ingestion, Habbo and future import sources
- `logging/`: structured logging and debugging support
- `lighting/`: light definitions, shadow behavior, lighting-related helpers
- `player/`: player movement, collision-facing behavior, player-specific spatial logic
- `placement/`: object placement, scene instances, sort-facing spatial placement rules

### 3.2 `core/`

Contains project-wide runtime infrastructure:

- `state.js`: global state and foundational shared objects
- `app.js`: bootstrapping, initialization, event wiring, update loop orchestration
- `render.js`: rendering pipeline
- `logic.js`: math, collision, occlusion, shared geometry / projection logic

### 3.3 `editor/`

Contains editor-only code paths, separated from the main runtime.

---

## 4. Migration Policy

This target structure should be approached incrementally:

1. extract one subsystem at a time
2. preserve behavior during each round
3. validate after each extraction
4. avoid simultaneous global renaming or file movement
5. only migrate to deeper folder structure after several subsystem boundaries are stable

---

## 5. Important Note

The existence of this document does **not** mean the project should be reorganized into this full structure immediately.

The current round only extracts:

```text
src/infrastructure/storage/scene-storage.js
```

Everything else should remain stable until later rounds.

