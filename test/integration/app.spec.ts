import { describe, it, expect } from '@jest/globals';
import supertest from 'supertest';
import { createApp } from '../../src/app';

describe('App', () => {
  const api = supertest(createApp(0).app);

  it('GET / responds that the API is ready', async () => {
    const res = await api.get('/').expect(200);
    expect(res.text).toBe('I am ready!!');
  });

  it('GET /api-docs/ serves the Swagger UI', async () => {
    const res = await api.get('/api-docs/').expect(200);
    expect(res.headers['content-type']).toMatch(/html/);
    expect(res.text).toContain('swagger-ui');
  });
});
