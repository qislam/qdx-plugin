## ADDED Requirements

### Requirement: Exclusions key is not emitted as a types block

The `yaml2xml` function SHALL treat the top-level `Exclusions` key as metadata directives, not as a Salesforce metadata type. No `<types>` block SHALL be emitted for `Exclusions` itself.

#### Scenario: Exclusions key present in YAML body
- **WHEN** `yaml2xml` is called with a `YamlBody` containing an `Exclusions` key
- **THEN** the resulting `<Package>` element contains no `<types>` child whose `<name>` is `Exclusions`

### Requirement: Wildcard exclusion drops an entire metadata type

When a metadata type appears under `Exclusions` with an empty members array or the single wildcard member `*`, `yaml2xml` SHALL omit the `<types>` block for that metadata type entirely, even if the type is also listed at the top level of the YAML body.

#### Scenario: Metadata type listed at top level with wildcard exclusion
- **WHEN** `yaml2xml` is called with `ApexClass: ['Foo', 'Bar']` and `Exclusions: { ApexClass: [] }`
- **THEN** the resulting `<Package>` contains no `<types>` block whose `<name>` is `ApexClass`

#### Scenario: Wildcard string exclusion
- **WHEN** `yaml2xml` is called with `CustomObject: ['Account__c']` and `Exclusions: { CustomObject: '*' }`
- **THEN** the resulting `<Package>` contains no `<types>` block whose `<name>` is `CustomObject`

### Requirement: Specific-member exclusion removes only named members

When a metadata type appears under `Exclusions` with a non-empty list of member names, `yaml2xml` SHALL emit the `<types>` block for that metadata type with those specific members removed while preserving all other members.

#### Scenario: Subset of members excluded
- **WHEN** `yaml2xml` is called with `ApexClass: ['Foo', 'Bar', 'Baz']` and `Exclusions: { ApexClass: ['Bar'] }`
- **THEN** the resulting `<types>` block for `ApexClass` contains `<members>` children for `Foo` and `Baz` only, and no `<members>` child with text `Bar`

#### Scenario: Excluding all listed members collapses the types block
- **WHEN** `yaml2xml` is called with `ApexClass: ['Foo']` and `Exclusions: { ApexClass: ['Foo'] }`
- **THEN** the resulting `<Package>` contains no `<types>` block whose `<name>` is `ApexClass`

#### Scenario: Exclusion member not present in source list
- **WHEN** `yaml2xml` is called with `ApexClass: ['Foo']` and `Exclusions: { ApexClass: ['Nonexistent'] }`
- **THEN** the resulting `<types>` block for `ApexClass` still contains a `<members>` child with text `Foo`

### Requirement: Absence of Exclusions preserves existing behavior

When the `YamlBody` contains no `Exclusions` key, `yaml2xml` SHALL produce output identical to the behavior prior to this change.

#### Scenario: YAML without Exclusions
- **WHEN** `yaml2xml` is called with a `YamlBody` that does not contain an `Exclusions` key
- **THEN** the generated XML is equivalent to the output produced before exclusion support was added
