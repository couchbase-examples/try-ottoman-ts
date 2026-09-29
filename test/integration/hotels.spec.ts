import { afterAll, describe, it, expect } from '@jest/globals';
import HotelModel from '../../src/hotels/hotels.model';
import { ottoman } from '../../src/db';
import { describeCrud, setupApi, uniqueSuffix } from '../helpers';

const api = setupApi();

// Every hotel created here is named `Test Hotel ...` so its refdoc index entries can be cleaned up.
const TEST_NAME_PREFIX = 'Test Hotel';

const newHotel = () => ({
  name: `${TEST_NAME_PREFIX} ${uniqueSuffix()}`,
  address: '1 Test Street',
  city: 'Testville',
  country: 'United States',
  phone: '(555) 555-1234',
  url: 'https://example.com',
  free_breakfast: true,
});

describe('/hotels', () => {
  afterAll(async () => {
    // Ottoman's refdoc index (findRefName) leaves its lookup documents behind after a replace + delete.
    await ottoman.query(
      `DELETE FROM \`${ottoman.bucketName}\`.inventory.hotel WHERE META().id LIKE "$inventoryhotel$name.${TEST_NAME_PREFIX} %"`,
    );
  });

  describe('GET /hotels', () => {
    it('finds travel-sample hotels by name', async () => {
      const res = await api.get('/hotels').query({ search: 'Medway' }).expect(200);
      expect(res.body.items).toEqual([expect.objectContaining({ name: 'Medway Youth Hostel' })]);
    });

    it('honors limit', async () => {
      const res = await api.get('/hotels').query({ limit: 5 }).expect(200);
      expect(res.body.items).toHaveLength(5);
    });

    it('pages through results in name order with skip', async () => {
      const all = await api.get('/hotels').query({ search: 'Inn', limit: 4 }).expect(200);
      const skipped = await api.get('/hotels').query({ search: 'Inn', limit: 3, skip: 1 }).expect(200);
      const names = all.body.items.map((h: any) => h.name);
      expect(names).toHaveLength(4);
      expect(names).toEqual([...names].sort());
      expect(skipped.body.items.map((h: any) => h.id)).toEqual(all.body.items.slice(1).map((h: any) => h.id));
    });

    it('treats quotes in search as text, not SQL++', async () => {
      const res = await api.get('/hotels').query({ search: 'x" OR "1"="1' }).expect(200);
      expect(res.body.items).toEqual([]);
    });

    it('responds 400 for a non-numeric limit', async () => {
      await api.get('/hotels').query({ limit: 'abc' }).expect(400);
    });
  });

  describe('GET /hotels/:id', () => {
    it('reads a travel-sample hotel', async () => {
      const res = await api.get('/hotels/hotel_10025').expect(200);
      expect(res.body).toMatchObject({ id: 10025, name: 'Medway Youth Hostel' });
    });
  });

  describe('POST /hotels validation', () => {
    it('responds 400 when a required field is missing', async () => {
      const { name, ...hotel } = newHotel();
      const res = await api.post('/hotels').send(hotel).expect(400);
      expect(res.body.message).toMatch(/name/);
    });

    it('responds 400 for an invalid phone number', async () => {
      const res = await api.post('/hotels').send({ ...newHotel(), phone: 'call me maybe' }).expect(400);
      expect(res.body.message).toBe('Phone number is invalid.');
    });

    it('responds 400 for an invalid url', async () => {
      await api.post('/hotels').send({ ...newHotel(), url: 'not a link' }).expect(400);
    });
  });

  describeCrud(api, '/hotels', HotelModel, {
    create: newHotel,
    patch: { vacancy: true, price: 99 },
    replace: () => ({
      name: `${TEST_NAME_PREFIX} replaced ${uniqueSuffix()}`,
      address: '2 Replacement Road',
      city: 'Newtown',
      country: 'France',
    }),
  });
});
