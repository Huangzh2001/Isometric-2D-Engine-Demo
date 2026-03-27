# Asset Pipeline

## Current asset sources
The current main program consumes assets from two active sources:

1. Built-in / local prefab JSON files under `assets/prefabs/`
2. Habbo external resources exposed by the local server

A third source already exists in the broader workflow:

3. Prefabs exported by the dedicated editor and then saved into the prefab library

## Current internal entry points
The current asset entry points are concentrated in `src/asset-management/asset-management.js`.

This module is responsible for:
- reading prefab indexes
- scanning and importing prefab JSON files
- refreshing prefab selection UI
- reading Habbo root configuration
- querying Habbo library summary/page endpoints
- loading Habbo SWF buffers for runtime import
- maintaining asset-library-facing state

## Runtime flow
### Prefab JSON flow
`assets/prefabs/*.json` -> prefab index API -> JSON fetch -> `importPrefabDefinition(...)` -> prefab registry -> placement UI

### Habbo flow
Habbo root config -> Habbo library summary/page APIs or Habbo index API -> SWF file buffer fetch -> `importHabboSwfToSceneFromBuffer(...)` -> prefab registry -> placement UI

### Editor-exported prefab flow
Editor export -> saved prefab JSON -> scanned by prefab index -> `importPrefabDefinition(...)` -> prefab registry -> placement UI

## Rules for future asset sources
When adding a new asset source:
- do not inject source-specific logic directly into rendering, player, or collision systems
- route the new source through the asset-management layer first
- normalize external data into the existing prefab-compatible internal representation
- preserve prefab / scene schema stability unless a separate schema migration round is planned
- keep the source-specific fetch / parse / import entry points together in the asset-management layer

## Non-goals for this round
- no plugin framework
- no source registry abstraction yet
- no ES module rewrite
- no prefab schema redesign
