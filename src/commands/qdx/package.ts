import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { Args } from '@oclif/core';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import Debug from 'debug';
import YAML from 'yaml';
import * as csvjson from 'csvjson';
import xmljs from 'xml-js';
import _ from 'lodash';

import { updateYaml } from '../../utils/metadata-coverage.js';
import { yaml2xml, type YamlBody } from '../../utils/convert.js';
import { getAbsolutePath, getFiles, getTimeStamp } from '../../utils/util.js';

const debug = Debug('qdx-plugin');

export type PackageResult = {
  message: string;
};

export class QdxPackageCommand extends SfCommand<PackageResult> {
  public static readonly summary = 'Build a package to use with sfdx retrieve/deploy commands.';
  public static readonly description = `Build a package to use with sfdx retrieve/deploy commands.

# To Start a new package
sf qdx package [packageName] --start`;

  public static readonly examples = [
    '<%= config.bin %> qdx package myPackage --start',
    '<%= config.bin %> qdx package myPackage --diff commit1 commit2',
    '<%= config.bin %> qdx package myPackage --yaml -p path/to/file.yml',
    '<%= config.bin %> qdx package myPackage --retrieve -u myorg@example.com',
    '<%= config.bin %> qdx package myPackage --deploy -u myorg@example.com',
  ];

  public static readonly args = {
    packageName: Args.string({
      description: 'Name of the package',
      required: true,
    }),
    commit1: Args.string({
      description: 'First git commit hash (for --diff)',
      required: false,
    }),
    commit2: Args.string({
      description: 'Second git commit hash (for --diff)',
      required: false,
    }),
  };

  public static readonly flags = {
    start: Flags.boolean({
      char: 's',
      summary: 'Start a new package. Will create YAML file if not already exist.',
    }),
    diff: Flags.boolean({
      summary: 'Build metadata components by running a diff.',
    }),
    diffwithbase: Flags.string({
      summary: 'Components added in current branch based on diff with base.',
    }),
    dir: Flags.boolean({
      summary: 'Build metadata components based on directory contents.',
    }),
    csv: Flags.boolean({
      summary: 'Build metadata components based on a csv file.',
    }),
    yaml: Flags.boolean({
      summary: 'Build metadata components based on a yml file.',
    }),
    path: Flags.string({
      char: 'p',
      summary: 'Path to app directory or csv file.',
    }),
    version: Flags.string({
      summary: 'API version to use for SFDX.',
    }),
    retrieve: Flags.boolean({
      char: 'r',
      summary: 'Retrieve source based on YAML configuration.',
    }),
    deploy: Flags.boolean({
      char: 'd',
      summary: 'Deploys source already retrieved.',
    }),
    delete: Flags.boolean({
      summary: 'Delete the specific components listed in the yaml file.',
    }),
    checkonly: Flags.boolean({
      summary: 'Set to true for deployment validation.',
    }),
    projectpath: Flags.string({
      summary: 'Base path for the project code.',
    }),
    username: Flags.string({
      char: 'u',
      summary: 'Salesforce org username.',
    }),
    fill: Flags.boolean({
      summary: 'Set to true to include all metadata for types listed in yaml.',
    }),
    full: Flags.boolean({
      summary: 'Set to true to get a complete list of all metadata available.',
    }),
    installedpackage: Flags.boolean({
      hidden: true,
    }),
  };

  public async run(): Promise<PackageResult> {
    const { flags, args } = await this.parse(QdxPackageCommand);

    const packageName = args.packageName as string;
    const commit1 = args.commit1 as string | undefined;
    const commit2 = args.commit2 as string | undefined;
    const flagPath = flags.path as string | undefined;
    const flagUsername = flags.username as string | undefined;
    const flagProjectpath = flags.projectpath as string | undefined;
    const flagDiffwithbase = flags.diffwithbase as string | undefined;
    const flagVersion = flags.version as string | undefined;

    this.log(getTimeStamp() + '\tSTART');
    debug('args: ' + JSON.stringify(args, null, 4));
    debug('flags: ' + JSON.stringify(flags, null, 4));
    this.spinner.start('Started on package ' + packageName);

    const yamlPath = `manifest/${packageName.replace('/', '-')}.yml`;
    const projectpath: string = flagProjectpath ?? '.';
    debug('projectpath: ' + projectpath);
    let apiVersion: string = flagVersion ?? '53.0';

    const objectSubtypes = [
      'CustomField',
      'Index',
      'BusinessProcess',
      'RecordType',
      'CompactLayout',
      'WebLink',
      'ValidationRule',
      'SharingReason',
      'ListView',
      'FieldSet',
    ];

    if (flags.start || !fs.existsSync(yamlPath)) {
      this.log(getTimeStamp() + '\tSetting up new package. STARTED');
      if (!fs.existsSync('manifest')) {
        debug('Creating manifest dir');
        fs.mkdirSync('manifest');
      }
      debug('Starting blank package YAML file.');
      fs.writeFileSync(yamlPath, YAML.stringify({ Version: apiVersion }), { encoding: 'utf-8' });
      this.log(getTimeStamp() + '\tSetting up new package. COMPLETED');
    }

    const yamlBody: YamlBody = YAML.parse(fs.readFileSync(yamlPath, 'utf-8')) ?? {};
    if (yamlBody.Version) apiVersion = yamlBody.Version as string;
    debug('yamlBody: \n' + JSON.stringify(yamlBody, null, 4));

    if (flags.yaml) {
      this.log('Preparing metadata list from yaml. STARTED');
      if (!flagPath) {
        this.spinner.stop('File not provided. Must be relative to current directory');
        return { message: 'File not provided' };
      }
      if (!fs.existsSync(getAbsolutePath(flagPath))) {
        this.spinner.stop('File not found. Check file path. Must be relative to current directory');
        return { message: 'File not found' };
      }

      const sourceYaml = YAML.parse(fs.readFileSync(flagPath, 'utf-8')) as YamlBody;
      for (const key in sourceYaml) {
        if (!{}.hasOwnProperty.call(sourceYaml, key)) continue;
        if (!yamlBody[key]) yamlBody[key] = [];
        if (key === 'Version') {
          yamlBody[key] = sourceYaml[key];
        } else {
          yamlBody[key] = [...(yamlBody[key] as string[]), ...(sourceYaml[key] as string[])];
        }
      }
      this.log(getTimeStamp() + '\tPreparing metadata list from yaml. COMPLETED');
    }

    if (flags.diff) {
      this.log(getTimeStamp() + '\tPreparing metadata list from diff. STARTED');
      if (!commit1 || !commit2) {
        this.spinner.stop('Commit hashes are required with diff flag.');
        return { message: 'Commit hashes are required' };
      }
      const diffResult = execSync(`git diff --name-only ${commit1} ${commit2}`, {
        encoding: 'utf-8',
      });
      const diffPaths = diffResult.trim().split('\n');
      debug('diffPaths: \n' + JSON.stringify(diffPaths, null, 4));
      try {
        updateYaml(diffPaths, yamlBody, projectpath);
      } catch (error) {
        this.spinner.stop('Error: ' + String(error));
        return { message: 'Error processing diff' };
      }
      this.log(getTimeStamp() + '\tPreparing metadata list from diff. COMPLETED');
    }

    if (flagDiffwithbase) {
      this.log(getTimeStamp() + '\tPreparing metadata list from diff with base. STARTED');
      const baseCommit = execSync(`git merge-base HEAD ${flagDiffwithbase}`, {
        encoding: 'utf-8',
      }).trim();
      debug('baseCommit: ' + baseCommit);
      const diffResult = execSync(`git diff --name-only HEAD ${baseCommit}`, { encoding: 'utf-8' });
      const diffPaths = diffResult.trim().split('\n');
      debug('diffPaths: \n' + JSON.stringify(diffPaths, null, 4));
      try {
        updateYaml(diffPaths, yamlBody, projectpath);
      } catch (error) {
        this.spinner.stop('Error: ' + String(error));
        return { message: 'Error processing diff with base' };
      }
      this.log(getTimeStamp() + '\tPreparing metadata list from diff with base. COMPLETED');
    }

    if (flags.dir) {
      this.log(getTimeStamp() + '\tPreparing metadata list from dir. STARTED');
      if (!flagProjectpath) {
        this.spinner.stop('Project path is required.');
        return { message: 'Project path is required' };
      }
      const fullProjectPath = path.join(process.cwd(), ...projectpath.split('/'));
      debug('fullProjectPath: ' + fullProjectPath);
      const filePaths = await getFiles(fullProjectPath);
      debug('filePaths: ' + filePaths.length);
      let osProjPath = projectpath;
      if (path.sep !== '/') {
        osProjPath = projectpath.replace(/\//g, path.sep);
      }
      try {
        updateYaml(filePaths, yamlBody, osProjPath);
      } catch (error) {
        this.spinner.stop('Error: ' + String(error));
        return { message: 'Error processing directory' };
      }
      this.log(getTimeStamp() + '\tPreparing metadata list from dir. COMPLETED');
    }

    if (flags.csv) {
      this.log(getTimeStamp() + '\tPreparing metadata list from csv. STARTED');
      if (!flagPath) {
        this.spinner.stop('File not provided. Must be relative to current directory');
        return { message: 'File not provided' };
      }
      if (!fs.existsSync(getAbsolutePath(flagPath))) {
        this.spinner.stop('File not found. Check file path. Must be relative to current directory');
        return { message: 'File not found' };
      }
      const featureCSV = csvjson.toObject(fs.readFileSync(flagPath, 'utf-8'));
      debug('featureCSV first record: ' + JSON.stringify(featureCSV[0], null, 4));

      for (const metadataRecord of featureCSV) {
        debug('metadataRecord: ' + JSON.stringify(metadataRecord, null, 4));
        const metadataType = metadataRecord.MetadataType;
        const metadataName = metadataRecord.MetadataName;
        if (!yamlBody[metadataType]) yamlBody[metadataType] = [];
        (yamlBody[metadataType] as string[]).push(metadataName);
        debug('featureYAML: ' + JSON.stringify(yamlBody, null, 4));
      }
      this.log(getTimeStamp() + '\tPreparing metadata list from csv. COMPLETED');
    }

    if (flags.full) {
      this.log(getTimeStamp() + '\tPreparing FULL metadata list from org. STARTED');
      if (!flagUsername) {
        this.spinner.stop('Username must be provided');
        return { message: 'Username must be provided' };
      }

      const fullDescribeCmd = `sfdx force:mdapi:describemetadata -u ${flagUsername} --json`;
      const stdout = execSync(fullDescribeCmd, { encoding: 'utf-8' });
      const parsed = JSON.parse(stdout) as { result: { metadataObjects: Array<{ xmlName: string }> } };
      for (const metadataObject of parsed.result.metadataObjects) {
        const metadataType = metadataObject.xmlName;
        if (!yamlBody[metadataType]) yamlBody[metadataType] = [];
      }
      this.log(getTimeStamp() + '\tPreparing FULL metadata list from org. COMPLETED');
    }

    if (flags.full || flags.fill) {
      this.log(getTimeStamp() + '\tPreparing full metadata list for components listed in yaml. STARTED');
      if (!flagUsername) {
        this.spinner.stop('Username must be provided');
        return { message: 'Username must be provided' };
      }

      for (const metadataType in yamlBody) {
        if (!{}.hasOwnProperty.call(yamlBody, metadataType)) continue;
        if (metadataType === 'Version') continue;
        yamlBody[metadataType] = [];

        const listmetadatCommand = `sfdx force:mdapi:listmetadata -m ${metadataType} -u ${flagUsername} --json`;

        let folderType = '';
        if (metadataType === 'EmailTemplate') folderType = 'EmailFolder';
        if (metadataType === 'Report') folderType = 'ReportFolder';
        if (metadataType === 'Document') folderType = 'DocumentFolder';
        if (metadataType === 'Dashboard') folderType = 'DashboardFolder';
        debug('folderType: ' + folderType);

        if (folderType) {
          const folderListCmd = `sfdx force:mdapi:listmetadata -m ${folderType} -u ${flagUsername} --json`;
          const folderStdout = execSync(folderListCmd, { encoding: 'utf-8' });
          debug('FolderListResult:\n' + folderStdout);

          const folderParsed = JSON.parse(folderStdout) as { result?: Array<{ fullName: string }> };
          const metadataFolders = folderParsed.result;
          if (Array.isArray(metadataFolders)) {
            for (const metadataFolderName of metadataFolders) {
              if (metadataFolderName.fullName.startsWith('unfiled')) continue;
              const cmdWithFolderName = `${listmetadatCommand} --folder ${metadataFolderName.fullName}`;
              const folderItemsStdout = execSync(cmdWithFolderName, { encoding: 'utf-8' });
              debug('MetadataNames:\n' + folderItemsStdout);
              const itemsParsed = JSON.parse(folderItemsStdout) as { result?: Array<{ fullName: string }> };
              const metadataNames = itemsParsed.result;
              if (Array.isArray(metadataNames)) {
                for (const metadataName of metadataNames) {
                  if (!yamlBody[metadataType]) yamlBody[metadataType] = [];
                  (yamlBody[metadataType] as string[]).push(metadataName.fullName);
                }
              }
            }
          }
        } else {
          const listStdout = execSync(listmetadatCommand, { encoding: 'utf-8' });
          debug('MetadataNames:\n' + listStdout);
          const listParsed = JSON.parse(listStdout) as {
            result?: Array<{ fullName: string; namespacePrefix?: string }>;
          };
          const metadataNames = listParsed.result;
          if (Array.isArray(metadataNames)) {
            for (const metadataName of metadataNames) {
              if (metadataName.namespacePrefix) continue;
              if (!yamlBody[metadataType]) yamlBody[metadataType] = [];
              (yamlBody[metadataType] as string[]).push(metadataName.fullName);
            }
          }
        }
      }
      this.log(getTimeStamp() + '\tPreparing full metadata list for components listed in yaml. COMPLETED');
    }

    this.log(getTimeStamp() + '\tSorting yaml. STARTED');

    for (const key in yamlBody) {
      if (key === 'ManualSteps' || key === 'Version') continue;
      const arr = yamlBody[key];
      if (Array.isArray(arr)) {
        yamlBody[key] = _.uniqWith(arr, _.isEqual);
        (yamlBody[key] as string[]).sort();
      }
    }

    this.log(getTimeStamp() + '\tSorting yaml. COMPLETED');

    debug('yamlBody: ' + JSON.stringify(yamlBody, null, 4));

    this.log(getTimeStamp() + '\tWriting yaml file. STARTED');
    fs.writeFileSync(yamlPath, YAML.stringify(yamlBody), { encoding: 'utf-8' });
    this.log(getTimeStamp() + '\tWriting yaml file. COMPLETED');

    this.log(getTimeStamp() + '\tPreparing/writing xml file. STARTED');
    const xmlBody = yaml2xml(yamlBody, apiVersion);
    const xmlOptions = {
      spaces: 4,
      compact: false,
      declerationKey: 'decleration',
      attributesKey: 'attributes',
    };
    fs.writeFileSync(
      yamlPath.replace(/yml$/i, 'xml'),
      xmljs.js2xml(xmlBody as unknown as xmljs.Element, xmlOptions),
      { encoding: 'utf-8' }
    );
    this.log(getTimeStamp() + '\tPreparing/writing xml file. COMPLETED');

    if (flags.retrieve || flags.delete) {
      this.log(getTimeStamp() + '\tRetrieving source from org. STARTED');
      if (!flagUsername) {
        this.spinner.stop('Username must be provided');
        return { message: 'Username must be provided' };
      }
      let retrieveCmd = 'sfdx force:source:retrieve -x ' + yamlPath.replace(/yml$/i, 'xml');
      retrieveCmd += ' -u ' + flagUsername;
      execSync(retrieveCmd, { encoding: 'utf-8' });
      this.log(getTimeStamp() + '\tRetrieving source from org. COMPLETED');
    }

    if (flags.deploy) {
      this.log(getTimeStamp() + '\tDeploying source to org. STARTED');
      if (!flagUsername) {
        this.spinner.stop('Username must be provided');
        return { message: 'Username must be provided' };
      }
      let deployCmd = 'sfdx force:source:deploy -x ' + yamlPath.replace(/yml$/i, 'xml');
      deployCmd += ' -u ' + flagUsername;
      if (flags.checkonly) deployCmd += ' --checkonly';
      const deployStdout = execSync(deployCmd, { encoding: 'utf-8' });
      this.log(deployStdout);
      this.log(getTimeStamp() + '\tDeploying source to org. COMPLETED');
    }

    if (flags.delete) {
      this.log(getTimeStamp() + '\tDeleting components from org. STARTED');
      if (!flagUsername) {
        this.spinner.stop('Username must be provided');
        return { message: 'Username must be provided' };
      }
      let deleteCmd = '';

      for (const metadataType in yamlBody) {
        if (metadataType === 'ManualSteps' || metadataType === 'Version') continue;

        const members = yamlBody[metadataType];
        if (Array.isArray(members) && members.length > 0) {
          for (const metadataName of members) {
            if (objectSubtypes.includes(metadataType)) {
              const objectName = metadataName.split('.')[0];
              const subTypeName = metadataName.split('.')[1];
              let subTypeFolder: string | undefined;
              let subtypeExtension: string | undefined;

              if (metadataType === 'CustomField') {
                subTypeFolder = 'fields';
                subtypeExtension = 'field';
              } else if (metadataType === 'RecordType') {
                subTypeFolder = 'recordTypes';
                subtypeExtension = 'recordType';
              } else if (metadataType === 'CompactLayout') {
                subTypeFolder = 'compactLayouts';
                subtypeExtension = 'compactLayout';
              } else if (metadataType === 'WebLink') {
                subTypeFolder = 'webLinks';
                subtypeExtension = 'webLink';
              } else if (metadataType === 'ValidationRule') {
                subTypeFolder = 'validationRules';
                subtypeExtension = 'validationRule';
              } else if (metadataType === 'SharingReason') {
                subTypeFolder = 'sharingReasons';
                subtypeExtension = 'sharingReason';
              } else if (metadataType === 'ListView') {
                subTypeFolder = 'listViews';
                subtypeExtension = 'listView';
              } else if (metadataType === 'FieldSet') {
                subTypeFolder = 'fieldSets';
                subtypeExtension = 'fieldSet';
              } else if (metadataType === 'Index') {
                subTypeFolder = 'indexes';
                subtypeExtension = 'index';
              } else if (metadataType === 'BusinessProcess') {
                subTypeFolder = 'businessProcesses';
                subtypeExtension = 'businessProcess';
              }

              deleteCmd = `sfdx force:source:delete -u ${flagUsername} -p ${flagProjectpath}/objects/${objectName}/${subTypeFolder}/${subTypeName}.${subtypeExtension}-meta.xml --noprompt`;
            } else {
              deleteCmd = `sfdx force:source:delete -m ${metadataType}:${metadataName} -u ${flagUsername} --noprompt`;
            }
            debug('deleteCmd: ' + deleteCmd);
            const deleteStdout = execSync(deleteCmd, { encoding: 'utf-8' });
            this.log(deleteStdout);
          }
        }
      }
      this.log(getTimeStamp() + '\tDeleting components from org. COMPLETED');
    }

    this.log(getTimeStamp() + '\tEND');
    this.spinner.stop('done');

    return { message: 'Package operation completed successfully' };
  }
}

export default QdxPackageCommand;
