import { describe, it, expect } from 'vitest';
import { ValidationEngine, Deferred, createDeferred } from '../../src/datagrid/core/ValidationEngine';
import { ColumnDef } from '../../src/datagrid/types/grid';

describe('ValidationEngine', () => {
  describe('Deferred (DevExtreme-compatible async validator)', () => {
    it('should resolve as valid when calling d.resolve(true) or d.resolve()', async () => {
      const d = createDeferred();
      setTimeout(() => d.resolve(true), 10);
      const res = await d.promise();
      expect(res).toBe(true);
    });

    it('should resolve as invalid when calling d.resolve(false)', async () => {
      const d = new Deferred();
      setTimeout(() => d.resolve(false), 10);
      const res = await d.promise();
      expect(res).toBe(false);
    });

    it('should return error message when calling d.reject(errorMessage)', async () => {
      const d = createDeferred();
      setTimeout(() => d.reject('Username is already taken'), 10);
      const res = await d.promise();
      expect(res).toEqual({ valid: false, message: 'Username is already taken' });
    });
  });

  describe('validateCell', () => {
    it('should validate required rule', async () => {
      const column: ColumnDef = {
        id: 'name',
        title: 'Full Name',
        type: 'text',
        width: 150,
        validationRules: [{ type: 'required', message: 'Name cannot be blank' }],
      };

      const validRes = await ValidationEngine.validateCell('Ibrahim', {}, column);
      expect(validRes.valid).toBe(true);

      const invalidRes = await ValidationEngine.validateCell('', {}, column);
      expect(invalidRes.valid).toBe(false);
      expect(invalidRes.message).toBe('Name cannot be blank');

      const nullRes = await ValidationEngine.validateCell(null, {}, column);
      expect(nullRes.valid).toBe(false);
    });

    it('should validate email rule', async () => {
      const column: ColumnDef = {
        id: 'email',
        title: 'Email Address',
        type: 'email',
        width: 180,
        validationRules: [{ type: 'email' }],
      };

      const validRes = await ValidationEngine.validateCell('test@example.com', {}, column);
      expect(validRes.valid).toBe(true);

      const invalidRes = await ValidationEngine.validateCell('not-an-email', {}, column);
      expect(invalidRes.valid).toBe(false);
    });

    it('should validate numeric range rule', async () => {
      const column: ColumnDef = {
        id: 'score',
        title: 'Score',
        type: 'number',
        width: 80,
        validationRules: [{ type: 'range', min: 0, max: 100, message: 'Score must be 0-100' }],
      };

      expect((await ValidationEngine.validateCell(85, {}, column)).valid).toBe(true);
      expect((await ValidationEngine.validateCell(-5, {}, column)).valid).toBe(false);
      expect((await ValidationEngine.validateCell(150, {}, column)).valid).toBe(false);
    });

    it('should validate custom synchronous rule', async () => {
      const column: ColumnDef = {
        id: 'code',
        title: 'Code',
        type: 'text',
        width: 120,
        validationRules: [
          {
            type: 'custom',
            validationCallback: (params) => {
              return String(params.value).startsWith('PRJ-');
            },
            message: 'Code must start with PRJ-',
          },
        ],
      };

      expect((await ValidationEngine.validateCell('PRJ-001', {}, column)).valid).toBe(true);
      const invalid = await ValidationEngine.validateCell('XYZ-001', {}, column);
      expect(invalid.valid).toBe(false);
      expect(invalid.message).toBe('Code must start with PRJ-');
    });

    it('should validate custom asynchronous rule with Deferred', async () => {
      const column: ColumnDef = {
        id: 'sku',
        title: 'SKU',
        type: 'text',
        width: 120,
        validationRules: [
          {
            type: 'async',
            validationCallback: (params) => {
              const d = createDeferred();
              setTimeout(() => {
                if (params.value === 'DUPLICATE') {
                  d.reject('This SKU already exists in inventory');
                } else {
                  d.resolve(true);
                }
              }, 15);
              return d.promise();
            },
          },
        ],
      };

      const validRes = await ValidationEngine.validateCell('UNIQUE-123', {}, column);
      expect(validRes.valid).toBe(true);

      const dupRes = await ValidationEngine.validateCell('DUPLICATE', {}, column);
      expect(dupRes.valid).toBe(false);
      expect(dupRes.message).toBe('This SKU already exists in inventory');
    });
  });
});
