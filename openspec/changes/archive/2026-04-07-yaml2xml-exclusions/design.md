## Context

`yaml2xml` iterates `featureYAML` keys and emits a `<types>` block per metadata type, skipping `ManualSteps` and `Version`. There is no subtraction mechanism. Users who want to include a metadata type but drop specific members, or exclude a whole type, have no way to express that declaratively.

## Goals / Non-Goals

**Goals:**
- Recognize a top-level `Exclusions` key whose value is a `Record<string, string[] | string>` (same shape as the rest of `YamlBody`).
- Remove excluded members from emitted `<types>` blocks, or drop the entire block when exclusion is wildcard.
- Keep behavior backward-compatible when `Exclusions` is absent.

**Non-Goals:**
- No new CLI flags.
- No changes to `ManualSteps` / `Version` handling.
- No support for glob/regex exclusion patterns — exact member name match only.

## Decisions

**Pre-process exclusions before the main loop.** Build an `exclusions` map keyed by metadata type: `Map<string, Set<string> | "all">`. An empty members list or the string `"*"` means `"all"`. This keeps the main loop simple: one lookup per type.

- Alternative considered: inline filtering inside the loop. Rejected — splits the exclusion logic across two places and re-computes the set per member.

**Skip whole type when exclusion is `"all"`.** If a metadata type is in `exclusions` with `"all"`, the loop `continue`s without emitting a `<types>` block at all. This matches the user's stated semantics ("all members will be excluded").

**Filter members when exclusion is a set.** For array-member types, filter out excluded names before emitting `<members>` children. If filtering leaves zero members, skip emitting the whole `<types>` block (otherwise we'd produce an invalid manifest with a `<name>` but no `<members>`).

**`Exclusions` is skipped as a top-level type** — added to the existing skip list alongside `ManualSteps` / `Version`.

## Risks / Trade-offs

- [Wildcard type (`members: []` meaning "all") combined with an exclusion set] → If the top-level entry is wildcard (`*`) and the exclusion lists specific members, we cannot subtract named members from a wildcard. **Mitigation**: document that specific-member exclusions only apply when the top-level entry also lists explicit members; a wildcard exclusion on a wildcard type drops the whole type.
- [Case sensitivity] → Salesforce metadata names are case-sensitive; exact-match is correct. No mitigation needed.
