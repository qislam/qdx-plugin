## Context

The `qdx package` command currently writes all manifests to `manifest/{name}.yml|xml`. Teams working on multiple features in parallel have no way to isolate metadata per feature or compose features into release deployments. The deduplication and sorting logic is embedded in the package command's `run()` method and not reusable.

## Goals / Non-Goals

**Goals:**
- Allow feature-scoped package output via `--feature` flag on `qdx package`
- Provide a `qdx release` command to compose releases from features
- Persist release composition state so features can be added/removed incrementally
- Reuse existing YAML→XML conversion and dedup/sort logic

**Non-Goals:**
- Feature dependency tracking (feature A requires feature B)
- Conflict detection between overlapping features
- Version control or history of release compositions
- Changes to the migrate or snippet commands

## Decisions

### 1. Output path strategy for `--feature`

**Decision:** When `--feature` is true, output to `manifest/feature/{name}.yml|xml`.

**Alternatives considered:**
- Configurable output directory via a `--output-dir` flag — more flexible but adds complexity for a simple use case
- Nested feature folders (`manifest/feature/{name}/package.yml`) — unnecessary nesting

**Rationale:** Simple boolean flag with a conventional path keeps the interface minimal. The feature name is already the package name argument.

### 2. Release state persistence via JSON

**Decision:** Store release composition in `manifest/release/{name}.json` with format `{ "features": ["feat1", "feat2"] }`. Regenerate release YAML+XML on every add/remove.

**Alternatives considered:**
- Embed feature list as YAML comments in the release YAML — fragile, parsing complexity
- No persistence (one-shot merge) — loses the ability to incrementally add/remove features

**Rationale:** JSON is simple to read/write, separates concerns (composition state vs. manifest content), and enables full regeneration which keeps the release always in sync with latest feature YAMLs.

### 3. Extract dedup/sort into shared utility

**Decision:** Extract the metadata deduplication and alphabetical sorting logic from `package.ts` into a reusable function in `utils/util.ts`. Both `package.ts` and the new `release.ts` will use it.

**Rationale:** The package command already has this logic inline. The release command needs identical behavior. Extracting avoids duplication.

### 4. Release output location

**Decision:** Release packages are written to `manifest/{name}.yml|xml` (same level as regular packages).

**Rationale:** Releases are the packages you actually deploy. Keeping them at the top level makes them interchangeable with manually-created packages for deploy/retrieve workflows.

## Risks / Trade-offs

- **[Stale releases]** If a feature YAML is updated after being added to a release, the release won't reflect changes until re-run. → Mitigation: Document that `sf qdx release {name} --add {existingFeature}` can be re-run to refresh. Adding an already-present feature is a no-op on the list but still triggers regeneration.
- **[No conflict warnings]** Two features with contradictory metadata (e.g., different versions) merge silently. → Acceptable for now; union/dedup is the expected behavior per user requirements.
- **[Directory creation]** `manifest/feature/` and `manifest/release/` may not exist. → Commands will create directories as needed using `mkdirSync({ recursive: true })`.
