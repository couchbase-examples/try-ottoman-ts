import { describe, it, expect } from '@jest/globals';
import { ValidationError } from 'ottoman';
import LinkType from '../../src/shared/link.type';

describe('LinkType', () => {
  const link = new LinkType('url');

  it.each(['http://example.com', 'https://www.example.com/path?q=1'])('accepts %s', (value) => {
    expect(link.cast(value)).toBe(value);
  });

  it.each(['not a link', 'example', 'ftp://example.com'])('rejects %s', (value) => {
    expect(() => link.validate(value)).toThrow(ValidationError);
  });

  it('allows empty values', () => {
    expect(() => link.validate(undefined)).not.toThrow();
  });
});
