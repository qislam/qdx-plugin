<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g qdx-plugin
$ sf COMMAND
running command...
$ sf (--version)
qdx-plugin/1.1.0 darwin-arm64 node-v20.12.2
$ sf --help [COMMAND]
USAGE
  $ sf COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`sf qdx migrate`](#sf-qdx-migrate)
* [`sf qdx package PACKAGENAME [COMMIT1] [COMMIT2]`](#sf-qdx-package-packagename-commit1-commit2)
* [`sf qdx snippet`](#sf-qdx-snippet)

## `sf qdx migrate`

Migrate data from one org to another based on a migration plan.

```
USAGE
  $ sf qdx migrate [--json] [--flags-dir <value>] [-d <value>] [-f <value>] [--sample] [-s <value>] [-n <value>]
    [--clear-data-folder] [--clear-ref-folder]

FLAGS
  -d, --destination=<value>  Destination org username or alias.
  -f, --file=<value>         Path of migration plan file. Must be relative to cwd and in unix format.
  -n, --name=<value>         Name of the step to execute.
  -s, --source=<value>       Source org username or alias.
      --clear-data-folder    Clear the data folder before processing.
      --clear-ref-folder     Clear the reference folder before processing.
      --sample               Copy sample migration plan files to current directory.

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Migrate data from one org to another based on a migration plan.

  Migrate data from one org to another based on a migration plan.

ALIASES
  $ sf qdx migrate

EXAMPLES
  $ sf qdx migrate --source prod --destination dev --file migrationPlan.js

  $ sf qdx migrate --sample

  $ sf qdx migrate --name Demo_Step_1 --source prod --destination dev
```

_See code: [src/commands/qdx/migrate.ts](https://github.com/qislam/qdx-plugin/blob/v1.1.0/src/commands/qdx/migrate.ts)_

## `sf qdx package PACKAGENAME [COMMIT1] [COMMIT2]`

Build a package to use with sfdx retrieve/deploy commands.

```
USAGE
  $ sf qdx package PACKAGENAME [COMMIT1] [COMMIT2] [--json] [--flags-dir <value>] [-s] [--diff] [--diffwithbase
    <value>] [--dir] [--csv] [--yaml] [-p <value>] [--version <value>] [-r] [-d] [--delete] [--checkonly] [--projectpath
    <value>] [-u <value>] [--fill] [--full]

ARGUMENTS
  PACKAGENAME  Name of the package
  [COMMIT1]    First git commit hash (for --diff)
  [COMMIT2]    Second git commit hash (for --diff)

FLAGS
  -d, --deploy                Deploys source already retrieved.
  -p, --path=<value>          Path to app directory or csv file.
  -r, --retrieve              Retrieve source based on YAML configuration.
  -s, --start                 Start a new package. Will create YAML file if not already exist.
  -u, --username=<value>      Salesforce org username.
      --checkonly             Set to true for deployment validation.
      --csv                   Build metadata components based on a csv file.
      --delete                Delete the specific components listed in the yaml file.
      --diff                  Build metadata components by running a diff.
      --diffwithbase=<value>  Components added in current branch based on diff with base.
      --dir                   Build metadata components based on directory contents.
      --fill                  Set to true to include all metadata for types listed in yaml.
      --full                  Set to true to get a complete list of all metadata available.
      --projectpath=<value>   Base path for the project code.
      --version=<value>       API version to use for SFDX.
      --yaml                  Build metadata components based on a yml file.

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Build a package to use with sfdx retrieve/deploy commands.

  Build a package to use with sfdx retrieve/deploy commands.

  # To Start a new package
  sf qdx package [packageName] --start

EXAMPLES
  $ sf qdx package myPackage --start

  $ sf qdx package myPackage --diff commit1 commit2

  $ sf qdx package myPackage --yaml -p path/to/file.yml

  $ sf qdx package myPackage --retrieve -u myorg@example.com

  $ sf qdx package myPackage --deploy -u myorg@example.com
```

_See code: [src/commands/qdx/package.ts](https://github.com/qislam/qdx-plugin/blob/v1.1.0/src/commands/qdx/package.ts)_

## `sf qdx snippet`

Convert code file to VSCode snippet.

```
USAGE
  $ sf qdx snippet -a <value> -p <value> [--json] [--flags-dir <value>]

FLAGS
  -a, --alias=<value>  (required) Alias for the snippet.
  -p, --path=<value>   (required) Path to file that needs to be converted to snippet.

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Convert code file to VSCode snippet.

  Convert a code file into a VSCode code snippet and save it to the project's .vscode directory.

EXAMPLES
  $ sf qdx snippet -a mySnippet -p src/myFile.cls
```

_See code: [src/commands/qdx/snippet.ts](https://github.com/qislam/qdx-plugin/blob/v1.1.0/src/commands/qdx/snippet.ts)_
<!-- commandsstop -->
