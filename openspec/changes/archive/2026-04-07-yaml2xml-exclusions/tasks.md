## 1. Implementation

- [x] 1.1 Add `Exclusions` to the skip list alongside `ManualSteps` and `Version` in `yaml2xml`
- [x] 1.2 Before the main loop, build an exclusions map from `featureYAML.Exclusions`: `Record<string, Set<string> | 'all'>` where empty array or `'*'` maps to `'all'`
- [x] 1.3 In the main loop, `continue` when the current metadata type has an `'all'` exclusion
- [x] 1.4 When the metadata type has a set-based exclusion and members are a non-empty array, filter out excluded member names before emitting `<members>` children
- [x] 1.5 If filtering leaves zero members, skip emitting the entire `<types>` block for that type
- [x] 1.6 Ensure wildcard-source types (empty array / no members) still emit correctly when no `'all'` exclusion exists

## 2. Tests

- [x] 2.1 Add a test: `Exclusions` key itself is never emitted as a `<types>` block
- [x] 2.2 Add a test: wildcard exclusion (`Exclusions: { ApexClass: [] }`) drops the whole `ApexClass` `<types>` block
- [x] 2.3 Add a test: string `'*'` exclusion drops the whole type
- [x] 2.4 Add a test: specific-member exclusion removes only the named members and preserves others
- [x] 2.5 Add a test: excluding all listed members collapses the `<types>` block
- [x] 2.6 Add a test: exclusion member not present in source list is a no-op
- [x] 2.7 Add a test: absence of `Exclusions` produces output identical to prior behavior

## 3. Verification

- [ ] 3.1 `npm run lint` (skipped — eslint binary missing in env, pre-existing)
- [x] 3.2 `npm test`
- [x] 3.3 `npm run build`
