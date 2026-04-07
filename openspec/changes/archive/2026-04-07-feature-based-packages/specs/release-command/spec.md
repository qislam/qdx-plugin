## ADDED Requirements

### Requirement: Release command exists
The plugin SHALL provide a new command `sf qdx release` that composes release packages from feature packages.

#### Scenario: Command is available
- **WHEN** user runs `sf qdx release --help`
- **THEN** the CLI SHALL display help for the release command including available flags

### Requirement: Add features to a release
The `sf qdx release` command SHALL accept a release name as an argument and an `--add` flag that accepts one or more feature names. The command SHALL add the specified features to the release composition.

#### Scenario: Add a single feature
- **WHEN** user runs `sf qdx release sprint-42 --add login-flow`
- **THEN** the command SHALL add `login-flow` to the release and generate `manifest/sprint-42.yml` and `manifest/sprint-42.xml` containing metadata from `manifest/feature/login-flow.yml`

#### Scenario: Add multiple features
- **WHEN** user runs `sf qdx release sprint-42 --add login-flow --add dashboard-revamp`
- **THEN** the command SHALL add both features and generate a merged release package

#### Scenario: Add feature that is already in release
- **WHEN** user runs `sf qdx release sprint-42 --add login-flow` and `login-flow` is already in the release
- **THEN** the command SHALL keep the feature in the list (no duplicate) and regenerate the release package with latest feature YAML content

### Requirement: Remove features from a release
The `sf qdx release` command SHALL accept a `--remove` flag that accepts one or more feature names. The command SHALL remove the specified features from the release composition.

#### Scenario: Remove a feature
- **WHEN** user runs `sf qdx release sprint-42 --remove login-flow`
- **THEN** the command SHALL remove `login-flow` from the release and regenerate the release package from remaining features

#### Scenario: Remove a feature not in the release
- **WHEN** user runs `sf qdx release sprint-42 --remove nonexistent`
- **THEN** the command SHALL warn the user that the feature is not in the release and take no action

### Requirement: Release state persistence
The command SHALL persist the list of features in a release as a JSON file at `manifest/release/{releaseName}.json` with the format `{ "features": ["feature1", "feature2"] }`.

#### Scenario: New release creates JSON
- **WHEN** user runs `sf qdx release sprint-42 --add login-flow` for the first time
- **THEN** the command SHALL create `manifest/release/sprint-42.json` with `{ "features": ["login-flow"] }`

#### Scenario: Existing release updates JSON
- **WHEN** user runs `sf qdx release sprint-42 --add dashboard-revamp` and `sprint-42` already has `login-flow`
- **THEN** the command SHALL update `manifest/release/sprint-42.json` to `{ "features": ["login-flow", "dashboard-revamp"] }`

### Requirement: Release package generation
On every `--add` or `--remove` operation, the command SHALL regenerate the release package by reading all feature YAMLs, merging metadata (union), deduplicating, sorting alphabetically, and writing `manifest/{releaseName}.yml` and `manifest/{releaseName}.xml`.

#### Scenario: Merge with shared metadata
- **WHEN** two features both contain `CustomField: [Account.Rating]`
- **THEN** the generated release package SHALL contain `Account.Rating` exactly once under `CustomField`

#### Scenario: Remove feature with shared metadata
- **WHEN** `login-flow` and `account-fields` both have `Account.Rating`, and user removes `login-flow`
- **THEN** the release package SHALL still contain `Account.Rating` because `account-fields` still contributes it

### Requirement: Feature YAML must exist
When adding a feature, the command SHALL verify that `manifest/feature/{featureName}.yml` exists.

#### Scenario: Feature YAML not found
- **WHEN** user runs `sf qdx release sprint-42 --add nonexistent` and `manifest/feature/nonexistent.yml` does not exist
- **THEN** the command SHALL display an error message and not add the feature

### Requirement: Release directory auto-creation
The command SHALL create `manifest/release/` directory if it does not exist.

#### Scenario: Release directory does not exist
- **WHEN** user runs `sf qdx release sprint-42 --add login-flow` and `manifest/release/` does not exist
- **THEN** the command SHALL create `manifest/release/` before writing the JSON file
