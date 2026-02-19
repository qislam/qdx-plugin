import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import * as fs from 'node:fs';
import * as path from 'node:path';
import Debug from 'debug';
import * as csvjson from 'csvjson';
import _ from 'lodash';
import moment from 'moment';
import sha1 from 'js-sha1';

import {
  deleteFolderRecursive,
  getAbsolutePath,
  getQueryAll,
  getProp,
  handleNullValues,
  pollBulkStatus,
  prepJsonForCsv,
  setStepReferences,
} from '../../utils/util.js';
import { dxOptions, looseObject, migrationStep } from '../../utils/interfaces.js';
import { allSamples } from '../../utils/migPlanSamples.js';
import { random } from '../../utils/random.js';

const sfdx = await import('sfdx-node');
const debug = Debug('qdx-plugin');

export type MigrateResult = {
  message: string;
};

export class QdxMigrateCommand extends SfCommand<MigrateResult> {
  public static readonly summary = 'Migrate data from one org to another based on a migration plan.';
  public static readonly description = 'Migrate data from one org to another based on a migration plan.';

  public static readonly aliases = ['qdx:migrate'];

  public static readonly examples = [
    '<%= config.bin %> qdx migrate --source prod --destination dev --file migrationPlan.js',
    '<%= config.bin %> qdx migrate --sample',
    '<%= config.bin %> qdx migrate --name Demo_Step_1 --source prod --destination dev',
  ];

  public static readonly flags = {
    destination: Flags.string({
      char: 'd',
      summary: 'Destination org username or alias.',
    }),
    file: Flags.string({
      char: 'f',
      summary: 'Path of migration plan file. Must be relative to cwd and in unix format.',
    }),
    sample: Flags.boolean({
      summary: 'Copy sample migration plan files to current directory.',
    }),
    source: Flags.string({
      char: 's',
      summary: 'Source org username or alias.',
    }),
    name: Flags.string({
      char: 'n',
      summary: 'Name of the step to execute.',
    }),
    'clear-data-folder': Flags.boolean({
      summary: 'Clear the data folder before processing.',
    }),
    'clear-ref-folder': Flags.boolean({
      summary: 'Clear the reference folder before processing.',
    }),
  };

  public async run(): Promise<MigrateResult> {
    this.log('Started processing...');
    let settings: looseObject | undefined;
    if (fs.existsSync(getAbsolutePath('.qdx/settings.json'))) {
      settings = JSON.parse(fs.readFileSync(getAbsolutePath('.qdx/settings.json'), 'utf-8'));
    }
    debug('settings: \n' + JSON.stringify(settings, null, 4));

    const { flags } = await this.parse(QdxMigrateCommand);
    debug('flags: \n' + JSON.stringify(flags, null, 4));

    if (flags.sample) {
      for (const key in allSamples) {
        fs.writeFileSync(getAbsolutePath(key + '.js'), allSamples[key], { encoding: 'utf-8' });
      }
      return { message: 'Sample migration plan files created.' };
    }

    this.log('Loading migration plan...');
    let file = flags.file ?? 'migrationPlan.js';
    if (!fs.existsSync(getAbsolutePath(file)) && settings?.migrateBasePath) {
      file = settings.migrateBasePath + '/' + file;
    }
    debug('file: ' + file);

    if (!fs.existsSync(getAbsolutePath(file))) {
      this.log('No plan file provided. Run "sf qdx migrate --sample" to get a sample.');
      return { message: 'No plan file found.' };
    }

    const basePath = file.split('/');
    basePath.pop();
    debug('basePath: ' + basePath);

    const dataPath = basePath.slice();
    dataPath.push('data');
    debug('dataPath: ' + dataPath);

    const refPath = basePath.slice();
    refPath.push('reference');
    debug('refPath: ' + refPath);

    if (flags['clear-data-folder']) {
      if (fs.existsSync(path.join(process.cwd(), ...dataPath))) {
        deleteFolderRecursive(dataPath.join('/'));
      }
    }
    if (flags['clear-ref-folder']) {
      if (fs.existsSync(path.join(process.cwd(), ...refPath))) {
        deleteFolderRecursive(refPath.join('/'));
      }
    }

    const migrationPlan = await import(getAbsolutePath(file));
    this.log('Migration plan loaded.');

    const globalVars: looseObject = {
      moment: moment,
      random: random,
      lodash: _,
      sha1: sha1,
      getProp: getProp,
      plan: migrationPlan,
    };
    this.log('Executing migration plan...');
    if (migrationPlan.calculateFlags) {
      debug('calculateFlags started.');
      for (const key in globalVars) {
        if (key !== 'plan') migrationPlan[key] = globalVars[key];
      }
      migrationPlan.calculateFlags.call(migrationPlan);
      debug('calculateFlags ended.');
    }

    if (migrationPlan.clearDataFolder) {
      if (fs.existsSync(path.join(process.cwd(), ...dataPath))) {
        deleteFolderRecursive(dataPath.join('/'));
      }
    }
    if (migrationPlan.clearRefFolder) {
      if (fs.existsSync(path.join(process.cwd(), ...refPath))) {
        deleteFolderRecursive(refPath.join('/'));
      }
    }

    const startIndex = migrationPlan.startIndex ?? 0;
    const stopIndex = migrationPlan.stopIndex ?? migrationPlan.steps.length;

    for (let i = startIndex; i < stopIndex; i++) {
      let step: migrationStep = migrationPlan.steps[i];
      if (!step.name) continue;
      debug(step.name + ' started.');

      if (flags.name) {
        if (step.name !== flags.name) continue;
      }
      this.log(i + ' - Step ' + step.name + ' - Started');
      for (const key in globalVars) {
        step[key] = globalVars[key];
      }
      if (step.references) {
        step = setStepReferences(step, basePath.join('/'));
      }
      if (step.calculateFlags) {
        step.calculateFlags.call(step);
      }
      if (step.skip) {
        this.log(i + ' - Step ' + step.name + ' - Skipped');
        continue;
      }
      if (step.apexCodeFile && (flags.destination ?? migrationPlan.destination)) {
        let apexCodePath: string = getAbsolutePath(step.apexCodeFile);
        debug('apexCodePath: ' + apexCodePath);

        if (!fs.existsSync(apexCodePath)) {
          this.log(apexCodePath + ' does not exist');
          apexCodePath = getAbsolutePath(basePath.join('/') + '/' + step.apexCodeFile);
          this.log('Checking at ' + apexCodePath);
        }
        if (!fs.existsSync(apexCodePath)) {
          this.log(apexCodePath + ' does not exist');
          this.log('Path must be relative to project base or migration plan file.');
          continue;
        }
        const options: dxOptions = {};
        options.apexcodefile = apexCodePath;
        options.targetusername = flags.destination ?? migrationPlan.destination;
        const exeResults = await sfdx.force.apex.execute(options);
        debug('exeResults: \n' + JSON.stringify(exeResults, null, 4));

        if (exeResults && exeResults.logs) this.log(exeResults.logs);
        continue;
      }
      if (step.generateData && !step.query) {
        const generatedData = step.generateData.call(step);
        if (generatedData.length < 1) {
          const manualCheck = await this.confirm({ message: 'No data generated. Continue?' });
          if (!manualCheck) break;
        }
        generatedData.map(prepJsonForCsv);
        if (!fs.existsSync(path.join(process.cwd(), ...dataPath))) {
          fs.mkdirSync(path.join(process.cwd(), ...dataPath), { recursive: true });
        }
        fs.writeFileSync(
          path.join(process.cwd(), ...dataPath, `${step.name}.csv`),
          csvjson.toCSV(generatedData, { headers: 'relative', wrap: true }),
          { encoding: 'utf-8' }
        );
      }
      if (
        step.query &&
        (step.queryDestination || step.isDelete || flags.source || migrationPlan.source || step.source)
      ) {
        this.log(i + ' - Step ' + step.name + ' querying data');
        let targetusername;
        if (step.queryDestination || step.isDelete) {
          targetusername = flags.destination ?? migrationPlan.destination ?? step.destination;
        } else {
          targetusername = flags.source ?? migrationPlan.source ?? step.source;
        }
        debug('targetusername: ' + targetusername);

        let queryString: any = step.query;
        if (queryString.includes('*')) {
          queryString = await getQueryAll(queryString, targetusername, true);
        }
        debug('queryString: ' + queryString);

        const options: dxOptions = {};
        options.query = queryString;
        options.targetusername = targetusername;
        let queryResult: any;
        try {
          queryResult = await sfdx.force.data.soqlQuery(options);
        } catch (err) {
          this.log('Error in querying the data: ' + JSON.stringify(err, null, 2));
          if (settings?.ignoreError) continue;
          else break;
        }
        debug('Before Transform queryResult: \n' + JSON.stringify(queryResult, null, 4));

        queryResult.records.map(handleNullValues);
        if (step.transform) queryResult.records.map(step.transform.bind(step));
        if (step.transformAll) {
          queryResult.records = step.transformAll.call(step, queryResult.records);
        }
        debug('After Transform queryResult: \n' + JSON.stringify(queryResult, null, 4));

        if (step.referenceOnly || step.isReference) {
          if (!fs.existsSync(path.join(process.cwd(), ...refPath))) {
            fs.mkdirSync(path.join(process.cwd(), ...refPath), { recursive: true });
          }
          fs.writeFileSync(
            path.join(process.cwd(), ...refPath, `${step.name}.json`),
            JSON.stringify(queryResult.records),
            { encoding: 'utf-8' }
          );
        }
        queryResult.records.map(prepJsonForCsv);
        debug('Prep for CSV queryResult: \n' + JSON.stringify(queryResult, null, 4));

        if (!step.referenceOnly) {
          if (!fs.existsSync(path.join(process.cwd(), ...dataPath))) {
            fs.mkdirSync(path.join(process.cwd(), ...dataPath), { recursive: true });
          }
          fs.writeFileSync(
            path.join(process.cwd(), ...dataPath, `${step.name}.csv`),
            csvjson.toCSV(queryResult.records, { headers: 'relative', wrap: true }),
            { encoding: 'utf-8' }
          );
        }
        this.log('Querying data completed');
      }

      if (step.referenceOnly) continue;
      let loadResults: any;
      if (step.isDelete) {
        this.log(i + ' - Step ' + step.name + ' deleting data');
        const options: dxOptions = {
          json: true,
          _rejectOnError: true,
        };
        options.targetusername = flags.destination ?? migrationPlan.destination ?? step.destination;
        options.csvfile = path.join(process.cwd(), ...dataPath, `${step.name}.csv`);
        options.sobjecttype = step.sobjecttype ?? step.sObjectType;
        debug('bulkDelete options: \n' + JSON.stringify(options, null, 4));

        try {
          loadResults = await sfdx.force.data.bulkDelete(options);
          this.log(loadResults);
        } catch (err) {
          this.log();
          this.log('Error uploading data: ' + JSON.stringify(err, null, 2));
          if (migrationPlan.ignoreError) continue;
          const manualCheck = await this.confirm({ message: 'Check status in your org. Continue?' });
          if (manualCheck) continue;
          else break;
        }
      } else if (flags.destination ?? migrationPlan.destination ?? step.destination) {
        this.log(i + ' - Step ' + step.name + ' uploading data');
        const options: dxOptions = {
          json: true,
          _rejectOnError: true,
        };
        options.targetusername = flags.destination ?? migrationPlan.destination ?? step.destination;
        options.csvfile = path.join(process.cwd(), ...dataPath, `${step.name}.csv`);
        if (step.externalid ?? step.externalId) options.externalid = step.externalid ?? step.externalId;
        options.sobjecttype = step.sobjecttype ?? step.sObjectType;
        debug('bulkUpsert options: \n' + JSON.stringify(options, null, 4));

        try {
          loadResults = await sfdx.force.data.bulkUpsert(options);
          this.log('Load Results: ' + JSON.stringify(loadResults, null, 4));
        } catch (err) {
          this.log();
          this.log('Error uploading data: ' + JSON.stringify(err, null, 4));
          if (migrationPlan.ignoreError) continue;
          else break;
        }
        if (!loadResults) {
          const manualCheck = await this.confirm({ message: 'Check status in your org. Continue?' });
          if (manualCheck) continue;
        }
      }

      if (!loadResults) continue;
      const options: dxOptions = {
        json: true,
        _rejectOnError: true,
      };
      let pollResults: any;

      try {
        options.targetusername = flags.destination ?? migrationPlan.destination;
        options.jobid = loadResults[0].jobId;
        options.batchid = loadResults[0].id;
        debug('bulkUpsert Status check options: \n' + JSON.stringify(options, null, 4));

        pollResults = await pollBulkStatus(
          options,
          migrationPlan.bulkStatusRetries,
          migrationPlan.bulkStatusInterval
        );
        this.log('Poll Results: ' + JSON.stringify(pollResults, null, 4));
      } catch (err) {
        this.log();
        this.log('Error in getting bulk status: ' + JSON.stringify(err, null, 4));
        const manualCheck = await this.confirm({ message: 'Check status in your org. Continue?' });
        if (manualCheck) continue;
        else break;
      }

      if (pollResults && pollResults.numberRecordsFailed > 0) {
        this.log();
        this.log('Some records did not get uploaded:\n' + JSON.stringify(pollResults, null, 4));
        if (migrationPlan.ignoreError) continue;
        const manualCheck = await this.confirm({ message: 'Continue?' });
        if (manualCheck) continue;
        else break;
      }
      debug(step.name + ' finished.');

      this.log();
    }

    return { message: 'Migration completed.' };
  }
}

export default QdxMigrateCommand;
