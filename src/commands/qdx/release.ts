import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { Args } from '@oclif/core';
import * as fs from 'node:fs';
import YAML from 'yaml';
import xmljs from 'xml-js';

import { yaml2xml, type YamlBody } from '../../utils/convert.js';
import { getTimeStamp, deduplicateAndSort } from '../../utils/util.js';

export type ReleaseResult = {
  message: string;
};

interface ReleaseManifest {
  features: string[];
}

export class QdxReleaseCommand extends SfCommand<ReleaseResult> {
  public static readonly summary = 'Compose a release package from feature packages.';
  public static readonly description = `Compose a release package by adding or removing feature packages.

Features are created with \`sf qdx package <name> --feature\` and stored in manifest/feature/.
Releases merge feature packages into a single manifest for deployment.`;

  public static readonly examples = [
    '<%= config.bin %> qdx release sprint-42 --add login-flow',
    '<%= config.bin %> qdx release sprint-42 --add login-flow --add dashboard-revamp',
    '<%= config.bin %> qdx release sprint-42 --remove login-flow',
  ];

  public static readonly args = {
    releaseName: Args.string({
      description: 'Name of the release',
      required: true,
    }),
  };

  public static readonly flags = {
    add: Flags.string({
      summary: 'Feature name to add to the release.',
      multiple: true,
    }),
    remove: Flags.string({
      summary: 'Feature name to remove from the release.',
      multiple: true,
    }),
  };

  public async run(): Promise<ReleaseResult> {
    const { flags, args } = await this.parse(QdxReleaseCommand);

    const releaseName = args.releaseName as string;
    const addFeatures = flags.add ?? [];
    const removeFeatures = flags.remove ?? [];

    this.log(getTimeStamp() + '\tSTART');
    this.spinner.start('Working on release ' + releaseName);

    if (addFeatures.length === 0 && removeFeatures.length === 0) {
      this.spinner.stop('No --add or --remove flags provided.');
      return { message: 'No --add or --remove flags provided' };
    }

    // Ensure manifest/release/ directory exists
    if (!fs.existsSync('manifest/release')) {
      fs.mkdirSync('manifest/release', { recursive: true });
    }

    // Read or create release manifest
    const releaseJsonPath = `manifest/release/${releaseName}.json`;
    let releaseManifest: ReleaseManifest = { features: [] };
    if (fs.existsSync(releaseJsonPath)) {
      releaseManifest = JSON.parse(fs.readFileSync(releaseJsonPath, 'utf-8')) as ReleaseManifest;
    }

    // Process --add flags
    for (const feature of addFeatures) {
      const featureYamlPath = `manifest/feature/${feature}.yml`;
      if (!fs.existsSync(featureYamlPath)) {
        this.warn(`Feature YAML not found: ${featureYamlPath}. Skipping "${feature}".`);
        continue;
      }
      if (!releaseManifest.features.includes(feature)) {
        releaseManifest.features.push(feature);
        this.log(getTimeStamp() + `\tAdded feature: ${feature}`);
      } else {
        this.log(getTimeStamp() + `\tFeature already in release: ${feature} (will refresh)`);
      }
    }

    // Process --remove flags
    for (const feature of removeFeatures) {
      const idx = releaseManifest.features.indexOf(feature);
      if (idx === -1) {
        this.warn(`Feature "${feature}" is not in release "${releaseName}". Skipping.`);
        continue;
      }
      releaseManifest.features.splice(idx, 1);
      this.log(getTimeStamp() + `\tRemoved feature: ${feature}`);
    }

    // Persist release manifest JSON
    fs.writeFileSync(releaseJsonPath, JSON.stringify(releaseManifest, null, 2), { encoding: 'utf-8' });
    this.log(getTimeStamp() + '\tRelease manifest saved: ' + releaseJsonPath);

    // Merge all feature YAMLs into release package
    const mergedYaml: YamlBody = {};
    let apiVersion = '65.0';

    for (const feature of releaseManifest.features) {
      const featureYamlPath = `manifest/feature/${feature}.yml`;
      if (!fs.existsSync(featureYamlPath)) {
        this.warn(`Feature YAML not found: ${featureYamlPath}. Skipping "${feature}" during merge.`);
        continue;
      }
      const featureYaml = YAML.parse(fs.readFileSync(featureYamlPath, 'utf-8')) as YamlBody;
      for (const key in featureYaml) {
        if (!{}.hasOwnProperty.call(featureYaml, key)) continue;
        if (key === 'Version') {
          apiVersion = featureYaml[key] as string;
          mergedYaml[key] = apiVersion;
          continue;
        }
        if (!mergedYaml[key]) mergedYaml[key] = [];
        mergedYaml[key] = [...(mergedYaml[key] as string[]), ...(featureYaml[key] as string[])];
      }
    }

    // Deduplicate and sort
    deduplicateAndSort(mergedYaml);

    // Write release YAML
    if (!fs.existsSync('manifest')) {
      fs.mkdirSync('manifest', { recursive: true });
    }
    const releaseYamlPath = `manifest/${releaseName}.yml`;
    fs.writeFileSync(releaseYamlPath, YAML.stringify(mergedYaml), { encoding: 'utf-8' });
    this.log(getTimeStamp() + '\tRelease YAML written: ' + releaseYamlPath);

    // Write release XML
    const xmlBody = yaml2xml(mergedYaml, apiVersion);
    const xmlOptions = {
      spaces: 4,
      compact: false,
      declerationKey: 'decleration',
      attributesKey: 'attributes',
    };
    const releaseXmlPath = `manifest/${releaseName}.xml`;
    fs.writeFileSync(
      releaseXmlPath,
      xmljs.js2xml(xmlBody as unknown as xmljs.Element, xmlOptions),
      { encoding: 'utf-8' }
    );
    this.log(getTimeStamp() + '\tRelease XML written: ' + releaseXmlPath);

    this.log(getTimeStamp() + '\tEND');
    this.spinner.stop('done');

    return { message: `Release "${releaseName}" updated with ${releaseManifest.features.length} feature(s).` };
  }
}

export default QdxReleaseCommand;
