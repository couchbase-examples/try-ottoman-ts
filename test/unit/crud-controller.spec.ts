import { beforeAll, beforeEach, describe, it, expect, jest } from '@jest/globals';
import express from 'express';
import supertest from 'supertest';
import { ModelTypes, ValidationError } from 'ottoman';
import { CrudController } from '../../src/shared/crud.controller';

/** An in-memory stand-in for an Ottoman model, so the routes can be checked without Couchbase. */
const createFakeModel = () => {
  const store = new Map<string, Record<string, unknown>>();
  let nextId = 1;
  const notFound = (id: string) => new Error(`document ${id} not found`);

  class FakeModel {
    constructor(private readonly data: Record<string, unknown>) {}

    async save() {
      if (!this.data.name) {
        throw new ValidationError("Property 'name' is required");
      }
      const doc = { ...this.data, id: String(nextId++) };
      store.set(doc.id, doc);
      return doc;
    }

    static async findById(id: string) {
      if (!store.has(id)) throw notFound(id);
      return store.get(id);
    }

    static async updateById(id: string, data: Record<string, unknown>) {
      if (!store.has(id)) throw notFound(id);
      store.set(id, { ...store.get(id), ...data });
    }

    static async replaceById(id: string, data: Record<string, unknown>) {
      if (!store.has(id)) throw notFound(id);
      store.set(id, { ...data, id });
    }

    static async removeById(id: string) {
      if (!store.delete(id)) throw notFound(id);
    }
  }

  return FakeModel as unknown as ModelTypes;
};

class WidgetsController extends CrudController {
  protected getAll() {
    this.router.get('/', (req, res) => {
      res.json({ items: [] });
    });
  }
}

describe('CrudController', () => {
  let api: ReturnType<typeof supertest>;

  beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  beforeEach(() => {
    const controller = new WidgetsController('/widgets', createFakeModel());
    const app = express();
    app.use(express.json());
    app.use(controller.path, controller.router);
    api = supertest(app);
  });

  it('mounts the list route defined by the subclass', async () => {
    const res = await api.get('/widgets').expect(200);
    expect(res.body).toEqual({ items: [] });
  });

  it('creates, reads, patches, replaces and deletes a document', async () => {
    const created = await api.post('/widgets').send({ name: 'w', color: 'red' }).expect(201);
    expect(created.body).toEqual({ name: 'w', color: 'red', id: '1' });

    await api.get('/widgets/1').expect(200, { name: 'w', color: 'red', id: '1' });

    await api.patch('/widgets/1').send({ color: 'blue' }).expect(204);
    await api.get('/widgets/1').expect(200, { name: 'w', color: 'blue', id: '1' });

    await api.put('/widgets/1').send({ name: 'v' }).expect(204);
    await api.get('/widgets/1').expect(200, { name: 'v', id: '1' });

    await api.delete('/widgets/1').expect(204);
    await api.get('/widgets/1').expect(404);
  });

  it('responds 400 when the model rejects a new document', async () => {
    const res = await api.post('/widgets').send({ color: 'red' }).expect(400);
    expect(res.body.message).toMatch(/name/);
  });

  it.each([
    ['GET', () => api.get('/widgets/missing')],
    ['PATCH', () => api.patch('/widgets/missing').send({ color: 'blue' })],
    ['PUT', () => api.put('/widgets/missing').send({ name: 'v' })],
    ['DELETE', () => api.delete('/widgets/missing')],
  ])('responds 404 to %s on an unknown id', async (_method, request) => {
    const res = await request().expect(404);
    expect(res.body.message).toMatch(/not found/);
  });
});
