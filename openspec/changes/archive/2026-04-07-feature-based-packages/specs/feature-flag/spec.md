## ADDED Requirements

### Requirement: Feature flag on package command
The `sf qdx package` command SHALL accept a `--feature` boolean flag. When `--feature` is true, the command SHALL write output files to `manifest/feature/{packageName}.yml` and `manifest/feature/{packageName}.xml` instead of `manifest/{packageName}.yml` and `manifest/{packageName}.xml`.

#### Scenario: Package with feature flag
- **WHEN** user runs `sf qdx package myFeature --feature --diff abc123 def456`
- **THEN** the command SHALL create `manifest/feature/myFeature.yml` and `manifest/feature/myFeature.xml`

#### Scenario: Package without feature flag
- **WHEN** user runs `sf qdx package myPackage --diff abc123 def456` (no `--feature` flag)
- **THEN** the command SHALL create `manifest/myPackage.yml` and `manifest/myPackage.xml` (existing behavior unchanged)

### Requirement: Feature directory auto-creation
The command SHALL create the `manifest/feature/` directory if it does not already exist when `--feature` is true.

#### Scenario: Feature directory does not exist
- **WHEN** user runs `sf qdx package myFeature --feature` and `manifest/feature/` does not exist
- **THEN** the command SHALL create `manifest/feature/` and write the output files there

### Requirement: Feature flag works with all input modes
The `--feature` flag SHALL work with all existing input modes: `--diff`, `--diffwithbase`, `--dir`, `--csv`, `--yaml`, `--start`, `--fill`, and `--full`. Only the output path changes; input behavior is unaffected.

#### Scenario: Feature flag with directory input
- **WHEN** user runs `sf qdx package myFeature --feature --dir --path src/objects`
- **THEN** the command SHALL scan the directory as normal and write output to `manifest/feature/myFeature.yml` and `manifest/feature/myFeature.xml`

### Requirement: Deploy from feature path
When `--feature` is true and `--deploy` or `--retrieve` is used, the command SHALL use the feature path (`manifest/feature/{name}.xml`) for the sfdx operation.

#### Scenario: Deploy a feature package
- **WHEN** user runs `sf qdx package myFeature --feature --deploy -u myOrg`
- **THEN** the command SHALL deploy using `manifest/feature/myFeature.xml` as the manifest
