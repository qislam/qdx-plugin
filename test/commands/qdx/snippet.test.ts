import { expect } from 'chai';
import { getAbsolutePath } from '../../../src/utils/util.js';

describe('qdx snippet', () => {
  describe('getAbsolutePath', () => {
    it('should resolve a relative path to absolute', () => {
      const result = getAbsolutePath('.vscode');
      expect(result).to.include('.vscode');
    });
  });
});
