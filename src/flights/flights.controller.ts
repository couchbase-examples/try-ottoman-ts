import { Request, Response } from 'express';
import FlightModel from './flights.model';
import AirportModel from './../airports/airports.model';
import makeResponse from '../shared/make.response';
import { getDefaultInstance } from 'ottoman';
import { CrudController } from '../shared/crud.controller';
import { intParam, stringParam } from '../shared/query-params';

class FlightController extends CrudController {
  constructor(route: string) {
    super(route, FlightModel);
  }

  protected getAll() {
    this.router.get('/', async (req: Request, res: Response) => {
      await makeResponse(res, async () => {
        const from = stringParam(req.query.from, 'from');
        const to = stringParam(req.query.to, 'to');
        const weekDay = intParam(req.query.weekDay, 'weekDay', { max: 6 });
        const limit = intParam(req.query.limit, 'limit') ?? 50;
        const skip = intParam(req.query.skip, 'skip') ?? 0;
        const fromDocument = await AirportModel.findById(from, { select: 'faa' });
        const toDocument = await AirportModel.findById(to, { select: 'faa' });
        const conn = getDefaultInstance();
        const keyspace = `\`${conn.bucketName}\`.inventory`;
        // Values are passed as query parameters: Ottoman's Query builder would inline them unescaped.
        const query = `
          SELECT a.name, s.flight, s.utc, s.day, r.sourceairport, r.destinationairport, r.equipment
          FROM ${keyspace}.route AS r
          UNNEST r.schedule AS s
          JOIN ${keyspace}.airline AS a ON KEYS r.airlineid
          WHERE r.sourceairport = $from AND r.destinationairport = $to
            ${weekDay === undefined ? '' : 'AND s.day = $weekDay'}
          ORDER BY a.name ASC
          LIMIT $limit OFFSET $skip`;
        const result = await conn.query(query, {
          parameters: { from: fromDocument.faa, to: toDocument.faa, weekDay, limit, skip },
        });
        const { rows: items } = result;
        return {
          items,
        };
      });
    });
  }
}

export default FlightController;
