import { beforeAll, describe, it, expect, jest } from '@jest/globals';
import { ValidationError } from 'ottoman';
import makeResponse from '../../src/shared/make.response';

const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

describe('makeResponse', () => {
  beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  it('sends the action result as JSON', async () => {
    const res = mockResponse();
    await makeResponse(res, async () => ({ id: '1' }));
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ id: '1' });
  });

  it('responds 400 for a ValidationError', async () => {
    const res = mockResponse();
    await makeResponse(res, async () => {
      throw new ValidationError('bad input');
    });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'bad input' });
  });

  it('responds 404 when the error message says "not found"', async () => {
    const res = mockResponse();
    await makeResponse(res, async () => {
      throw new Error('document not found');
    });
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('responds 500 for any other error', async () => {
    const res = mockResponse();
    await makeResponse(res, async () => {
      throw new Error('boom');
    });
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'boom' });
  });
});
