## Why

Users building Salesforce package manifests via `qdx package` need a way to exclude specific metadata components from the generated XML. Currently `yaml2xml` only supports inclusion; there's no mechanism to subtract components that should not be deployed.

## What Changes

- `yaml2xml` in `src/utils/convert.ts` recognizes a top-level `Exclusions` property in the YAML body.
- For each metadata type under `Exclusions`:
  - If the members list is empty (or `*`), the entire metadata type is excluded from the output XML (no `<types>` block emitted for it, even if listed at the top level).
  - If members are specified, only those named members are removed from the corresponding `<types>` block.
- `Exclusions` itself is never emitted as a `<types>` block (same treatment as `ManualSteps` / `Version`).

## Capabilities

### New Capabilities
- `package-manifest-exclusions`: Excluding metadata types or specific members from generated Salesforce package manifests.

### Modified Capabilities

## Impact

- `src/utils/convert.ts` — `YamlBody` type and `yaml2xml` function.
- `test/commands/qdx/` — new tests covering exclusion behavior.
- No CLI flag changes; behavior is driven by YAML input.
