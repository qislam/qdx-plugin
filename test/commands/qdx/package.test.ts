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

    it('should not emit a types block for the Exclusions key itself', () => {
      const yamlBody = {
        ApexClass: ['Foo'],
        Exclusions: { CustomObject: [] },
      };
      const result = yaml2xml(yamlBody, '53.0');
      const typesBlocks = result.elements[0].elements!.filter((e) => e.name === 'types');
      expect(
        typesBlocks.some((t) =>
          t.elements!.some((c) => c.name === 'name' && c.elements![0].text === 'Exclusions'),
        ),
      ).to.be.false;
    });

    it('should drop an entire types block when wildcard-excluded via empty array', () => {
      const yamlBody = {
        ApexClass: ['Foo', 'Bar'],
        CustomObject: ['Account__c'],
        Exclusions: { ApexClass: [] },
      };
      const result = yaml2xml(yamlBody, '53.0');
      const typesBlocks = result.elements[0].elements!.filter((e) => e.name === 'types');
      const names = typesBlocks.map(
        (t) => t.elements!.find((c) => c.name === 'name')!.elements![0].text,
      );
      expect(names).to.deep.equal(['CustomObject']);
    });

    it('should drop an entire types block when excluded via "*" string', () => {
      const yamlBody = {
        CustomObject: ['Account__c'],
        ApexClass: ['Foo'],
        Exclusions: { CustomObject: '*' },
      };
      const result = yaml2xml(yamlBody, '53.0');
      const typesBlocks = result.elements[0].elements!.filter((e) => e.name === 'types');
      const names = typesBlocks.map(
        (t) => t.elements!.find((c) => c.name === 'name')!.elements![0].text,
      );
      expect(names).to.deep.equal(['ApexClass']);
    });

    it('should remove only specific named members when listed under Exclusions', () => {
      const yamlBody = {
        ApexClass: ['Foo', 'Bar', 'Baz'],
        Exclusions: { ApexClass: ['Bar'] },
      };
      const result = yaml2xml(yamlBody, '53.0');
      const apexTypes = result.elements[0].elements!.find(
        (e) =>
          e.name === 'types' &&
          e.elements!.some((c) => c.name === 'name' && c.elements![0].text === 'ApexClass'),
      )!;
      const memberTexts = apexTypes
        .elements!.filter((c) => c.name === 'members')
        .map((c) => c.elements![0].text);
      expect(memberTexts).to.deep.equal(['Foo', 'Baz']);
    });

    it('should collapse a types block when all listed members are excluded', () => {
      const yamlBody = {
        ApexClass: ['Foo'],
        CustomObject: ['Account__c'],
        Exclusions: { ApexClass: ['Foo'] },
      };
      const result = yaml2xml(yamlBody, '53.0');
      const typesBlocks = result.elements[0].elements!.filter((e) => e.name === 'types');
      const names = typesBlocks.map(
        (t) => t.elements!.find((c) => c.name === 'name')!.elements![0].text,
      );
      expect(names).to.deep.equal(['CustomObject']);
    });

    it('should ignore exclusion members not present in the source list', () => {
      const yamlBody = {
        ApexClass: ['Foo'],
        Exclusions: { ApexClass: ['Nonexistent'] },
      };
      const result = yaml2xml(yamlBody, '53.0');
      const apexTypes = result.elements[0].elements!.find(
        (e) =>
          e.name === 'types' &&
          e.elements!.some((c) => c.name === 'name' && c.elements![0].text === 'ApexClass'),
      )!;
      const memberTexts = apexTypes
        .elements!.filter((c) => c.name === 'members')
        .map((c) => c.elements![0].text);
      expect(memberTexts).to.deep.equal(['Foo']);
    });

    it('should produce output identical to prior behavior when Exclusions is absent', () => {
      const yamlBody = { ApexClass: ['Foo', 'Bar'] };
      const result = yaml2xml(yamlBody, '53.0');
      const apexTypes = result.elements[0].elements!.find((e) => e.name === 'types')!;
      const memberTexts = apexTypes
        .elements!.filter((c) => c.name === 'members')
        .map((c) => c.elements![0].text);
      expect(memberTexts).to.deep.equal(['Foo', 'Bar']);
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
