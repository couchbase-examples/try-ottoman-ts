import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';
import supertest from 'supertest';
import { ottoman, connectOttoman } from '../src/db';
import { createApp } from '../src/app';

type Api = ReturnType<typeof supertest>;
type Doc = Record<string, unknown>;

/**
 * Connects to Couchbase for the current test file, making sure the model indexes exist
 * (the same thing `yarn start` does), and returns a supertest agent for the app.
 */
export const setupApi = (): Api => {
  beforeAll(async () => {
    // makeResponse logs every error, including the 400s and 404s these tests trigger on purpose.
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    try {
      await connectOttoman();
    } catch (e) {
      throw new Error(
        `Could not connect to Couchbase at ${process.env.DB_CONN_STR || 'couchbase://localhost'}. ` +
          `Start one with \`yarn couchbase:start\` or set the DB_* environment variables.\n${e}`,
      );
    }
    await ottoman.start();
  }, 120000);

  afterAll(async () => {
    await ottoman.close();
    jest.restoreAllMocks();
  });

  return supertest(createApp(0).app);
};

/** A suffix that keeps documents from separate test runs from colliding. */
export const uniqueSuffix = () => `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

/**
 * Exercises the create → read → patch → replace → delete lifecycle shared by every resource,
 * cleaning up anything left behind if a step fails.
 */
export const describeCrud = (
  api: Api,
  path: string,
  model: { removeById: (id: string) => Promise<unknown> },
  docs: { create: () => Doc; patch: Doc; replace: () => Doc },
) => {
  describe(`CRUD lifecycle on ${path}`, () => {
    const created: string[] = [];

    afterAll(async () => {
      await Promise.all(created.map((id) => model.removeById(id).catch(() => undefined)));
    });

    it('creates, reads, patches, replaces and deletes a document', async () => {
      const original = docs.create();

      const createRes = await api.post(path).send(original).expect(201);
      const { id } = createRes.body;
      expect(id).toEqual(expect.any(String));
      created.push(id);
      expect(createRes.body).toMatchObject(original);

      const readRes = await api.get(`${path}/${id}`).expect(200);
      expect(readRes.body).toMatchObject({ ...original, id });

      await api.patch(`${path}/${id}`).send(docs.patch).expect(204);
      const patchedRes = await api.get(`${path}/${id}`).expect(200);
      expect(patchedRes.body).toMatchObject({ ...original, ...docs.patch, id });

      const replacement = docs.replace();
      const putRes = await api.put(`${path}/${id}`).send(replacement);
      expect(putRes.body).toEqual({});
      expect(putRes.status).toBe(204);
      const replacedRes = await api.get(`${path}/${id}`).expect(200);
      expect(replacedRes.body).toMatchObject({ ...replacement, id });
      // A replace swaps the whole document, so fields only on the original are gone.
      Object.keys(original)
        .filter((key) => !(key in replacement))
        .forEach((key) => expect(replacedRes.body).not.toHaveProperty(key));

      await api.delete(`${path}/${id}`).expect(204);
      await api.get(`${path}/${id}`).expect(404);
    });

    it('responds 404 for an unknown id', async () => {
      await api.get(`${path}/does-not-exist-${uniqueSuffix()}`).expect(404);
    });
  });
};
