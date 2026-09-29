import { describe, it, expect } from '@jest/globals';
import { ValidationError } from 'ottoman';
import { containsPattern, intParam, stringParam } from '../../src/shared/query-params';

describe('intParam', () => {
  it.each([undefined, ''])('returns undefined for %p', (value) => {
    expect(intParam(value, 'limit')).toBeUndefined();
  });

  it('parses an integer', () => {
    expect(intParam('25', 'limit')).toBe(25);
  });

  it.each(['abc', '1.5', '-1', '7'])('rejects %p outside 0-6', (value) => {
    expect(() => intParam(value, 'weekDay', { max: 6 })).toThrow(ValidationError);
  });

  it('rejects a repeated param', () => {
    expect(() => intParam(['1', '2'], 'limit')).toThrow('"limit"');
  });
});

describe('stringParam', () => {
  it('returns the value', () => {
    expect(stringParam('airport_3469', 'from')).toBe('airport_3469');
  });

  it.each([undefined, '', ['a', 'b']])('rejects %p', (value) => {
    expect(() => stringParam(value, 'from')).toThrow(ValidationError);
  });
});

describe('containsPattern', () => {
  it('wraps the value in wildcards', () => {
    expect(containsPattern('Inn')).toBe('%Inn%');
  });

  it('replaces double quotes with a single-character wildcard', () => {
    expect(containsPattern('x" OR "1"="1')).toBe('%x_ OR _1_=_1%');
  });
});
