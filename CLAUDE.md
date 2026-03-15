# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

QDX Plugin is a Salesforce SF CLI plugin built with TypeScript on the oclif framework. It provides three commands under `sf qdx`: package building/deploying, data migration, and VSCode snippet generation. Uses ES modules (`"type": "module"`), targets ES2022, requires Node.js >=18.

## Build & Development Commands

```bash
npm run build          # Compile TypeScript + copy metadata.json to lib/
npm run clean          # Remove lib/ directory
npm run lint           # ESLint on src/
npm test               # Mocha tests with nyc coverage (10s timeout)
```

The build step (`tsc -p . && shx cp src/utils/metadata.json lib/utils/metadata.json`) must copy `metadata.json` because tsc doesn't handle JSON assets. The `prepare` hook runs compile on `npm install`.

## Architecture

**CLI Framework**: Commands extend `SfCommand<T>` from `@salesforce/sf-plugins-core`. Each command defines static `flags`, `summary`, `description`, and `examples`. The oclif config in package.json routes `sf qdx *` to `lib/commands/qdx/`.

**Three Commands**:
- `qdx package` — Builds Salesforce metadata package manifests (YAML/XML). Supports multiple input modes: git diff, directory scan, CSV, YAML files. Can also retrieve/deploy via sfdx.
- `qdx migrate` — Orchestrates data migration between Salesforce orgs using JS-based migration plans. Plans define steps with SOQL queries, transforms, and bulk upsert/delete operations. Injects globals (moment, lodash, sha1, random) into transform contexts.
- `qdx snippet` — Converts source files to VSCode snippet format.

**Key Utilities**:
- `utils/convert.ts` — YAML-to-XML conversion for Salesforce package manifests
- `utils/metadata-coverage.ts` — Maps file paths to Salesforce metadata types using `metadata.json`
- `utils/util.ts` — Shared helpers (file scanning, YAML/XML manipulation)
- `utils/random.ts` + `utils/data/` — Random data generation for migration transforms

## Testing

Tests live in `test/commands/qdx/`. Framework is Mocha + Chai with ts-node (configured in `.mocharc.yml`). Run a single test file:

```bash
npx mocha "test/commands/qdx/package.test.ts" --timeout 10000
```
