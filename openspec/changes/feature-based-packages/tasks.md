## 1. Extract shared utilities

- [x] 1.1 Extract metadata deduplication and alphabetical sorting logic from `package.ts` into a reusable function in `utils/util.ts`
- [x] 1.2 Refactor `package.ts` to use the extracted dedup/sort utility

## 2. Feature flag on package command

- [x] 2.1 Add `--feature` boolean flag definition to `package.ts` flags
- [x] 2.2 Modify output path logic in `package.ts` to write to `manifest/feature/{name}.yml|xml` when `--feature` is true, including `mkdirSync({ recursive: true })`
- [x] 2.3 Update deploy/retrieve path logic to use `manifest/feature/{name}.xml` when `--feature` is true

## 3. Release command

- [x] 3.1 Create `src/commands/qdx/release.ts` extending `SfCommand` with release name argument and `--add`/`--remove` flags (multiple allowed)
- [x] 3.2 Implement release state persistence: read/write `manifest/release/{name}.json` with `{ "features": [...] }`
- [x] 3.3 Implement `--add` logic: validate feature YAML exists, add to feature list (no duplicates), persist JSON
- [x] 3.4 Implement `--remove` logic: warn if feature not in list, remove from list, persist JSON
- [x] 3.5 Implement release package generation: read all feature YAMLs, merge metadata, dedup/sort, write `manifest/{name}.yml` and `manifest/{name}.xml`

## 4. Wiring and tests

- [x] 4.1 Update oclif topic in `package.json` if needed for `qdx release`
- [x] 4.2 Export release command from `src/index.ts`
- [x] 4.3 Add tests for `--feature` flag on package command
- [x] 4.4 Add tests for release command (add, remove, merge, edge cases)
- [x] 4.5 Build and verify with `npm run build`
