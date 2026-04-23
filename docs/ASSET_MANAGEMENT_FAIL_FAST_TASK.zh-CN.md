# Asset-Management Fail-Fast 清理任务

## 目标
对旧 asset-management 通路做 fail-fast 约束，确保所有素材管理与导入相关逻辑只能通过 `src/infrastructure/assets/asset-management.js` 进入。

## 本轮实际实现
- 给关键 asset-management 导出函数加上 owner 标记。
- 新增 `assertAssetManagementOwnership(context)`，用于校验运行时关键导出是否确实属于 `src/infrastructure/assets/asset-management.js`。
- 统一 fail-fast 报错标记：`[LEGACY-ASSET-PATH-CALLED]`。
- 在 `src/presentation/shell/app.js` 启动阶段增加 owner 校验，若发现旧通路残留或后续覆盖，立即报错。

## 已覆盖的关键导出
- `scanAssetPrefabs`
- `getAssetPrefabScanSnapshot`
- `ensureAssetPrefabScanState`
- `loadCustomPrefabsFromLocalStorage`
- `saveCustomPrefabsToLocalStorage`
- `refreshPrefabSelectOptions`
- `fetchHabboAssetRootConfig`
- `fetchHabboLibrarySummary`
- `fetchHabboLibraryPage`
- `fetchHabboLibraryIndex`
- `fetchHabboAssetFileBuffer`

## 行为说明
只要上述关键导出缺失，或者不再由 `src/infrastructure/assets/asset-management.js` 持有，程序会立即抛出包含 `[LEGACY-ASSET-PATH-CALLED]` 的错误。

## 验证方式
- 主程序能正常打开。
- prefab 列表正常。
- Habbo library 正常。
- 日志中不应出现 `[LEGACY-ASSET-PATH-CALLED]`。
