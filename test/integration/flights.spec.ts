import { describe, it, expect } from '@jest/globals';
import FlightModel from '../../src/flights/flights.model';
import { describeCrud, setupApi } from '../helpers';

const api = setupApi();

// San Francisco Intl (SFO) → Los Angeles Intl (LAX) in travel-sample.
const SFO = 'airport_3469';
const LAX = 'airport_3484';

const newRoute = () => ({
  airline: 'TT',
  airlineid: 'airline_137',
  sourceairport: 'SFO',
  destinationairport: 'LAX',
  distance: 543.2,
  equipment: '737',
  stops: 0,
  schedule: [
    { day: 1, flight: 'TT100', utc: '08:00:00' },
    { day: 3, flight: 'TT101', utc: '17:30:00' },
  ],
});

describe('/flightPaths', () => {
  describe('GET /flightPaths', () => {
    it('finds flights between two airports on a given weekday, ordered by airline', async () => {
      const res = await api.get('/flightPaths').query({ from: SFO, to: LAX, weekDay: 1 }).expect(200);
      const { items } = res.body;
      expect(items.length).toBeGreaterThan(0);
      items.forEach((item: any) => {
        expect(item).toMatchObject({ sourceairport: 'SFO', destinationairport: 'LAX', day: 1 });
        expect(item).toEqual(expect.objectContaining({ name: expect.any(String), flight: expect.any(String) }));
      });
      const names = items.map((item: any) => item.name);
      expect(names).toEqual([...names].sort());
    });

    it('honors limit', async () => {
      const res = await api.get('/flightPaths').query({ from: SFO, to: LAX, weekDay: 1, limit: 2 }).expect(200);
      expect(res.body.items).toHaveLength(2);
    });

    it('responds 400 when from or to is missing', async () => {
      await api.get('/flightPaths').query({ from: SFO }).expect(400);
    });

    it('responds 404 for an unknown airport', async () => {
      await api.get('/flightPaths').query({ from: SFO, to: 'airport_does_not_exist' }).expect(404);
    });
  });

  describe('GET /flightPaths/:id', () => {
    it('reads a travel-sample route', async () => {
      const res = await api.get('/flightPaths/route_11981').expect(200);
      expect(res.body).toMatchObject({ id: 11981, sourceairport: 'SFO', destinationairport: 'LAX' });
    });
  });

  describeCrud(api, '/flightPaths', FlightModel, {
    create: newRoute,
    patch: { equipment: '320' },
    replace: () => ({
      airline: 'TT',
      airlineid: 'airline_137',
      sourceairport: 'LAX',
      destinationairport: 'SFO',
      schedule: [{ day: 5, flight: 'TT200', utc: '12:00:00' }],
    }),
  });
});
