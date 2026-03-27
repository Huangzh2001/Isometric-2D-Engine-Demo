# Scene Storage Refactor Task

## 1. Goal

Extract the main program's scene storage and restore logic into an independent module in order to improve structural clarity while preserving existing runtime behavior.

This round focuses on the **scene storage / restore system only**.

---

## 2. Scope of Allowed Changes

### 2.1 New directory and file

Create:

```text
src/scene-storage/scene-storage.js
```

### 2.2 Logic to be centralized in the new module

The following logic should be concentrated in `scene-storage.js`:

- scene serialization
- scene deserialization
- default scene creation / loading
- scene save
- scene load
- local persistence (for example `localStorage`)
- calls to:
  - `/api/scenes/save`
  - `/api/scenes/load`
  - `/api/scenes/default`
- scene JSON import / export helpers
- scene reset / new-world scene creation helpers

### 2.3 Integration requirements

- Existing call sites must remain functional.
- Compatibility wrappers are allowed if needed.
- If necessary, `index.html` may add a `<script>` tag for the new file.
- Script loading order must only be adjusted minimally.

---

## 3. Out of Scope / Forbidden Changes

This round must **not** do the following:

- do not modify the lighting system
- do not modify player movement
- do not modify collision behavior
- do not modify item sorting behavior
- do not modify prefab data structure
- do not modify scene data structure
- do not modify API routes
- do not rename fields
- do not change main-program UI behavior
- do not modify editor logic
- do not rename unrelated modules
- do not perform large-scale directory migration
- do not convert the project to ES module / import-export architecture
- do not perform unrelated refactors opportunistically

---

## 4. Implementation Principles

1. This round is an **extraction and concentration** refactor, not a redesign.
2. Preserve behavior first.
3. Keep existing global function interfaces compatible where practical.
4. New function names inside the extracted file should clearly express their responsibilities.
5. Concentrate logic without introducing unnecessary architectural risk.

---

## 5. Acceptance Criteria

The following must remain true after this refactor:

1. The main program opens normally.
2. Items can still be placed.
3. A scene can still be saved.
4. A scene can still be loaded.
5. Loaded scene content matches the saved scene.
6. Default scene loading continues to work.
7. Local persistence behavior, if present, remains functional.
8. No new obvious UI errors or runtime errors are introduced.

---

## 6. Current Round Deliverables

This round should produce:

- `src/scene-storage/scene-storage.js`
- minimal script wiring in `index.html`
- no broad structural migration outside the scene storage scope

