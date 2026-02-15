import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import Debug from 'debug';
import _ from 'lodash';
import type { YamlBody } from './convert.js';

const debug = Debug('qdx-plugin');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const describeResult = JSON.parse(fs.readFileSync(path.join(__dirname, 'metadata.json'), 'utf-8')) as {
  metadataObjects: Array<{
    directoryName: string;
    suffix?: string;
    xmlName: string;
    inFolder: boolean;
    metaFile: boolean;
    childXmlNames?: string[];
  }>;
};

export function getType(folder: string): string | undefined {
  const result = _.find(describeResult.metadataObjects, { directoryName: folder });
  if (result) return result.xmlName;
}

export function getTypeByExtension(extension: string): string | undefined {
  const result = _.find(describeResult.metadataObjects, { suffix: extension });
  if (result) return result.xmlName;
}

export function getDirByExtension(extension: string): string | undefined {
  const result = _.find(describeResult.metadataObjects, { suffix: extension });
  if (result) return result.directoryName;
}

export function updateYaml(filePathList: string[], yamlBody: YamlBody, projectpath: string): void {
  const customObjectEntry = _.find(describeResult.metadataObjects, { xmlName: 'CustomObject' });
  const objectSubTypes: string[] = customObjectEntry?.childXmlNames ?? [];

  const metaDataRequireFolder = ['EmailTemplate', 'Document', 'Report', 'Dashboard'];

  for (const filePath of filePathList) {
    debug('filePath: ' + filePath);
    debug('projectpath: ' + projectpath);

    if (projectpath && !filePath.includes(projectpath)) continue;

    let metadataName = '';
    let metadataType: string | undefined = '';
    let folder = '';
    let parentFolder = '';

    let pathParts = filePath.split(path.sep);
    if (pathParts.length < 2) pathParts = filePath.split('/');
    const fileNameParts = pathParts
      .pop()!
      .replace(/-meta\.xml$/, '')
      .split(/\.(?=[^.]+$)/);
    debug('fileNameParts:\n' + JSON.stringify(fileNameParts, null, 4));

    metadataName = fileNameParts[0];
    debug('metadataName: ' + metadataName);
    const fileExtension = fileNameParts[1];
    debug('fileExtension: ' + fileExtension);

    metadataType = getTypeByExtension(fileExtension);
    debug('metadataType: ' + metadataType);

    debug('pathParts:\n' + JSON.stringify(pathParts, null, 4));

    if (pathParts.length > 0) folder = pathParts.pop()!;
    debug('folder: ' + folder);

    if (folder !== 'staticresources' && ['js', 'css', 'design'].includes(fileExtension)) {
      metadataName = folder;
    }

    if (!metadataType) {
      switch (folder) {
        case 'fields':
          metadataType = 'CustomField';
          break;
        case 'recordTypes':
          metadataType = 'RecordType';
          break;
        case 'compactLayouts':
          metadataType = 'CompactLayout';
          break;
        case 'webLinks':
          metadataType = 'WebLink';
          break;
        case 'listViews':
          metadataType = 'ListView';
          break;
        case 'validationRules':
          metadataType = 'ValidationRule';
          break;
      }
    }

    if (!metadataType) metadataType = getType(folder);
    if (pathParts.length > 0) parentFolder = pathParts.pop()!;
    if (!metadataType) metadataType = getType(parentFolder);

    if (folder && metadataType && metaDataRequireFolder.includes(metadataType)) {
      metadataName = folder + '/' + metadataName;
    }
    debug('metadataName: ' + metadataName);

    if (metadataType && parentFolder && objectSubTypes.includes(metadataType)) {
      metadataName = parentFolder + '.' + metadataName;
    }

    if (!metadataType) continue;
    if (!yamlBody[metadataType]) yamlBody[metadataType] = [];
    (yamlBody[metadataType] as string[]).push(metadataName);
  }
}
