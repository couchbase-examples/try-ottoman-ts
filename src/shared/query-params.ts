import { ValidationError } from 'ottoman';

/**
 * Parses an optional integer query param, returning `undefined` when it's absent.
 * Anything that isn't an integer in [min, max] is rejected with a 400.
 */
export const intParam = (
  value: unknown,
  name: string,
  { min = 0, max = Number.MAX_SAFE_INTEGER }: { min?: number; max?: number } = {},
): number | undefined => {
  if (value === undefined || value === '') {
    return undefined;
  }
  const parsed = Number(value);
  if (typeof value !== 'string' || !Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new ValidationError(`Query param "${name}" must be an integer between ${min} and ${max}`);
  }
  return parsed;
};

/** Reads a required string query param, rejecting missing or repeated (array) values with a 400. */
export const stringParam = (value: unknown, name: string): string => {
  if (typeof value !== 'string' || value === '') {
    throw new ValidationError(`Query param "${name}" is required`);
  }
  return value;
};

/**
 * Builds a `$like` pattern that matches `value` anywhere in a field.
 * Ottoman's filter builder inlines values into a double-quoted SQL++ string and strips any backslashes,
 * so a `"` can't be escaped and would end the literal. Swap each one for the LIKE wildcard `_`, which
 * still matches a quote but keeps the value inside its string.
 */
export const containsPattern = (value: unknown) => `%${String(value).replace(/"/g, '_')}%`;
