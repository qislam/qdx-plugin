import { expect } from 'chai';
import * as fs from 'node:fs';
import * as path from 'node:path';
import YAML from 'yaml';
import { deduplicateAndSort } from '../../../src/utils/util.js';
import { yaml2xml, type YamlBody } from '../../../src/utils/convert.js';

describe('qdx release utilities', () => {
  const testDir = path.join(process.cwd(), 'test-manifest-release');
  const featureDir = path.join(testDir, 'feature');
  const releaseDir = path.join(testDir, 'release');

  beforeEach(() => {
    fs.mkdirSync(featureDir, { recursive: true });
    fs.mkdirSync(releaseDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('release manifest persistence', () => {
    it('should create and read release JSON', () => {
      const manifest = { features: ['login-flow', 'dashboard'] };
      const jsonPath = path.join(releaseDir, 'sprint-42.json');
      fs.writeFileSync(jsonPath, JSON.stringify(manifest, null, 2));

      const read = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
      expect(read.features).to.deep.equal(['login-flow', 'dashboard']);
    });

    it('should add feature without duplicates', () => {
      const manifest = { features: ['login-flow'] };
      const featureToAdd = 'login-flow';
      if (!manifest.features.includes(featureToAdd)) {
        manifest.features.push(featureToAdd);
      }
      expect(manifest.features).to.deep.equal(['login-flow']);
    });

    it('should remove feature from list', () => {
      const manifest = { features: ['login-flow', 'dashboard'] };
      const idx = manifest.features.indexOf('login-flow');
      if (idx !== -1) manifest.features.splice(idx, 1);
      expect(manifest.features).to.deep.equal(['dashboard']);
    });
  });

  describe('feature YAML merging', () => {
    it('should merge metadata from multiple features', () => {
      const feature1: YamlBody = {
        Version: '65.0',
        ApexClass: ['ClassA', 'ClassB'],
        CustomField: ['Account.Rating'],
      };
      const feature2: YamlBody = {
        Version: '65.0',
        ApexClass: ['ClassC'],
        CustomField: ['Account.Rating', 'Contact.Email'],
        ApexTrigger: ['MyTrigger'],
      };

      fs.writeFileSync(path.join(featureDir, 'feat1.yml'), YAML.stringify(feature1));
      fs.writeFileSync(path.join(featureDir, 'feat2.yml'), YAML.stringify(feature2));

      // Simulate merge
      const mergedYaml: YamlBody = {};
      for (const featureName of ['feat1', 'feat2']) {
        const featureYaml = YAML.parse(
          fs.readFileSync(path.join(featureDir, `${featureName}.yml`), 'utf-8')
        ) as YamlBody;
        for (const key in featureYaml) {
          if (key === 'Version') {
            mergedYaml[key] = featureYaml[key];
            continue;
          }
          if (!mergedYaml[key]) mergedYaml[key] = [];
          mergedYaml[key] = [...(mergedYaml[key] as string[]), ...(featureYaml[key] as string[])];
        }
      }
      deduplicateAndSort(mergedYaml);

      expect(mergedYaml.Version).to.equal('65.0');
      expect(mergedYaml.ApexClass).to.deep.equal(['ClassA', 'ClassB', 'ClassC']);
      expect(mergedYaml.CustomField).to.deep.equal(['Account.Rating', 'Contact.Email']);
      expect(mergedYaml.ApexTrigger).to.deep.equal(['MyTrigger']);
    });

    it('should preserve shared metadata when a feature is removed', () => {
      const feature1: YamlBody = {
        Version: '65.0',
        CustomField: ['Account.Rating', 'Account.Type'],
      };
      const feature2: YamlBody = {
        Version: '65.0',
        CustomField: ['Account.Rating', 'Contact.Email'],
      };

      fs.writeFileSync(path.join(featureDir, 'feat1.yml'), YAML.stringify(feature1));
      fs.writeFileSync(path.join(featureDir, 'feat2.yml'), YAML.stringify(feature2));

      // Simulate removing feat1, only feat2 remains
      const mergedYaml: YamlBody = {};
      const featureYaml = YAML.parse(
        fs.readFileSync(path.join(featureDir, 'feat2.yml'), 'utf-8')
      ) as YamlBody;
      for (const key in featureYaml) {
        if (key === 'Version') {
          mergedYaml[key] = featureYaml[key];
          continue;
        }
        if (!mergedYaml[key]) mergedYaml[key] = [];
        mergedYaml[key] = [...(mergedYaml[key] as string[]), ...(featureYaml[key] as string[])];
      }
      deduplicateAndSort(mergedYaml);

      expect(mergedYaml.CustomField).to.deep.equal(['Account.Rating', 'Contact.Email']);
    });

    it('should produce valid XML from merged YAML', () => {
      const merged: YamlBody = {
        Version: '65.0',
        ApexClass: ['ClassA', 'ClassB'],
      };

      const xmlDoc = yaml2xml(merged, '65.0');
      expect(xmlDoc.elements[0].name).to.equal('Package');
      const typesEl = xmlDoc.elements[0].elements![0];
      expect(typesEl.name).to.equal('types');
      expect(typesEl.elements).to.have.length(3); // 2 members + 1 name
    });
  });
});
