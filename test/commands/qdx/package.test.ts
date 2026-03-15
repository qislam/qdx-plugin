import { expect } from 'chai';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { yaml2xml } from '../../../src/utils/convert.js';
import { getAbsolutePath, getTimeStamp, deduplicateAndSort } from '../../../src/utils/util.js';

describe('qdx package utilities', () => {
  describe('yaml2xml', () => {
    it('should convert yaml body to xml structure', () => {
      const yamlBody = {
        Version: '53.0',
        ApexClass: ['MyClass', 'OtherClass'],
      };

      const result = yaml2xml(yamlBody, '53.0');

      expect(result).to.have.property('declaration');
      expect(result).to.have.property('elements');
      expect(result.elements[0].name).to.equal('Package');
      expect(result.elements[0].elements).to.have.length.greaterThan(0);
    });

    it('should use wildcard for empty arrays', () => {
      const yamlBody = {
        ApexClass: [] as string[],
      };

      const result = yaml2xml(yamlBody, '53.0');
      const typesElement = result.elements[0].elements![0];
      expect(typesElement.elements![0].elements![0].text).to.equal('*');
    });

    it('should skip ManualSteps and Version keys', () => {
      const yamlBody = {
        Version: '53.0',
        ManualSteps: ['step1'],
        ApexClass: ['MyClass'],
      };

      const result = yaml2xml(yamlBody, '53.0');
      const packageElements = result.elements[0].elements!;
      // Should have types for ApexClass + version element = 2
      expect(packageElements).to.have.length(2);
    });
  });

  describe('getAbsolutePath', () => {
    it('should return an absolute path', () => {
      const result = getAbsolutePath('test/file.txt');
      expect(path.isAbsolute(result)).to.be.true;
    });
  });

  describe('getTimeStamp', () => {
    it('should return a formatted timestamp', () => {
      const result = getTimeStamp();
      expect(result).to.match(/\d{1,2}:\d{2}:\d{2}\.\d{3}/);
    });
  });

  describe('deduplicateAndSort', () => {
    it('should remove duplicates and sort arrays', () => {
      const yamlBody = {
        ApexClass: ['Zebra', 'Alpha', 'Alpha', 'Beta'],
        CustomField: ['Account.Name', 'Account.Name', 'Contact.Email'],
      };
      deduplicateAndSort(yamlBody);
      expect(yamlBody.ApexClass).to.deep.equal(['Alpha', 'Beta', 'Zebra']);
      expect(yamlBody.CustomField).to.deep.equal(['Account.Name', 'Contact.Email']);
    });

    it('should skip ManualSteps and Version keys', () => {
      const yamlBody: Record<string, string[] | string> = {
        Version: '65.0',
        ManualSteps: ['step1', 'step1'],
        ApexClass: ['B', 'A'],
      };
      deduplicateAndSort(yamlBody);
      expect(yamlBody.Version).to.equal('65.0');
      expect(yamlBody.ManualSteps).to.deep.equal(['step1', 'step1']);
      expect(yamlBody.ApexClass).to.deep.equal(['A', 'B']);
    });
  });
});
