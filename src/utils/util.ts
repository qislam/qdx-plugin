import * as path from 'node:path';
import * as fs from 'node:fs';
import { dxOptions, looseObject, migrationStep } from './interfaces.js';

const sfdx = await import('sfdx-node');

export function getAbsolutePath(rawPath: string): string {
  return path.join(process.cwd(), ...rawPath.trim().split('/'));
}

export async function getFiles(dir: string): Promise<string[]> {
  const dirents = fs.readdirSync(dir, { withFileTypes: true });
  const files = await Promise.all(
    dirents.map((dirent) => {
      const res = path.resolve(dir, dirent.name);
      return dirent.isDirectory() ? getFiles(res) : res;
    })
  );
  return ([] as string[]).concat(...files);
}

export function getTimeStamp(): string {
  const myStamp = new Date();
  const hours = myStamp.getHours().toLocaleString('en-US', { minimumIntegerDigits: 2 });
  const minutes = myStamp.getMinutes().toLocaleString('en-US', { minimumIntegerDigits: 2 });
  const seconds = myStamp.getSeconds().toLocaleString('en-US', { minimumIntegerDigits: 2 });
  const millis = myStamp.getMilliseconds().toLocaleString('en-US', { minimumIntegerDigits: 3 });
  return `${hours}:${minutes}:${seconds}.${millis}`;
}

export function deleteFolderRecursive(pathString: string): void {
  const dataPath = pathString.split('/');
  const basePath = path.join(process.cwd(), ...dataPath);
  if (fs.existsSync(basePath)) {
    fs.readdirSync(basePath).forEach((file: string) => {
      const curPath = path.join(process.cwd(), ...dataPath, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        deleteFolderRecursive(dataPath.join('/') + '/' + file);
      } else {
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(basePath);
  }
}

export function getProp(object: any, prop: string): any {
  if (object[prop]) return object[prop];
  for (const key in object) {
    if (key.toLowerCase() === prop.toLowerCase()) {
      return object[key];
    }
  }
}

export function getQueryAll(query: string, targetusername: string, filter: boolean): Promise<any> {
  function buildQuery(objectDefinition: looseObject) {
    let fieldNames = '';
    const tooManyFields = objectDefinition.fields.length > 100;
    for (const field of objectDefinition.fields) {
      if (filter || tooManyFields) {
        if (
          !field.createable ||
          field.type === 'reference' ||
          (field.defaultedOnCreate && !field.updateable)
        )
          continue;
      }
      if (fieldNames) fieldNames = fieldNames + ', ' + field.name;
      else fieldNames = field.name;
    }
    if (fieldNames) query = query.replace(/\*/g, fieldNames);
  }
  return new Promise((resolve, reject) => {
    const sobjecttype = query
      .substring(query.toLowerCase().lastIndexOf('from'))
      .split(/\s+/)[1]
      .trim();
    const defPath = getAbsolutePath('.qdx/definitions/' + sobjecttype + '.json');
    if (fs.existsSync(defPath)) {
      buildQuery(JSON.parse(fs.readFileSync(defPath, 'utf-8')));
      resolve(query);
    } else {
      sfdx.force.schema
        .sobjectDescribe({
          targetusername: targetusername,
          sobjecttype: sobjecttype,
        })
        .then((objectDefinition: looseObject) => {
          if (objectDefinition && objectDefinition.fields) {
            buildQuery(objectDefinition);
            resolve(query);
          } else {
            console.log(objectDefinition);
            reject('Could not get fields for object definition. Got ' + objectDefinition);
          }
        })
        .catch((error: looseObject) => {
          reject('Could not get object definition.\n' + error);
        });
    }
  });
}

export function handleNullValues(line: looseObject): looseObject {
  for (const key of Object.keys(line)) {
    if (line[key] === '\u001b[1mnull\u001b[22m') line[key] = '';
    if (line[key] === 'null') line[key] = '';
    if (line[key] == null) line[key] = '';
  }
  return line;
}

export function pollBulkStatus(
  options: dxOptions,
  retries = 3,
  interval = 5000
): Promise<any> {
  const endTime = Number(new Date()) + retries * interval;
  let statusResults: any;
  async function checkResults(resolve: any, reject: any) {
    statusResults = await sfdx.force.data.bulkStatus(options);
    if (statusResults && statusResults[0].state === 'Completed') {
      resolve(statusResults[0]);
    } else if (Number(new Date()) < endTime) {
      console.log(JSON.stringify(statusResults[0], null, 4));
      setTimeout(checkResults, interval, resolve, reject);
    } else {
      reject(new Error('Timed out:\n' + JSON.stringify(statusResults, null, 4)));
    }
  }

  return new Promise(checkResults);
}

export function prepJsonForCsv(line: looseObject): looseObject {
  if (line.attributes) delete line.attributes;
  if (line.height) delete line.height;
  for (const key of Object.keys(line)) {
    if (line[key] === '\u001b[1mnull\u001b[22m') delete line[key];
    if (line[key] === null) delete line[key];
    if (line[key] === 'null') delete line[key];
    if (line[key] === '') delete line[key];
    if (typeof line[key] === 'string') {
      line[key] = line[key].replace(/"/g, '""');
    } else if (line[key] && Object.keys(line[key])) {
      prepJsonForCsv(line[key]);
    }
  }
  return line;
}

export function setStepReferences(step: migrationStep, basePath: string): migrationStep {
  for (const reference of step.references) {
    const referencePath = getAbsolutePath(basePath + '/reference/' + reference + '.json');
    step[reference] = JSON.parse(fs.readFileSync(referencePath, { encoding: 'utf8' }));
  }
  return step;
}
