import express, { Request, Response } from 'express';
import FlightModel from './flights.model';
import AirportModel from './../airports/airports.model';
import makeResponse from '../shared/make.response';
import { getDefaultInstance } from 'ottoman';
import { CustomRoute } from '../shared/custom.route';
import { intParam, stringParam } from '../shared/query-params';

class FlightController extends CustomRoute {

  public router = express.Router();
  public path: string;

  constructor(route: string) {
    super();
    this.path = route;
    this.initRoutes();
  }

  public getAll() {
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

  public getById() {
    this.router.get('/:id', async (req: Request, res: Response) => {
      await makeResponse(res, () => FlightModel.findById(req.params.id));
    });
  }

  public post() {
    this.router.post('/', async (req: Request, res: Response) => {
      await makeResponse(res, () => {
        res.status(201);
        const flight = new FlightModel(req.body);
        return flight.save();
      });
    });
  }

  public patch() {
    this.router.patch('/:id', async (req: Request, res: Response) => {
      await makeResponse(res, async () => {
        res.status(204);
        await FlightModel.updateById(req.params.id, req.body);
      });
    });
  }

  public put() {
    this.router.put('/:id', async (req: Request, res: Response) => {
      await makeResponse(res, async () => {
        await FlightModel.replaceById(req.params.id, req.body);
        res.status(204);
      });
    });
  }

  public delete() {
    this.router.delete('/:id', async (req: Request, res: Response) => {
      await makeResponse(res, async () => {
        await FlightModel.removeById(req.params.id);
        res.status(204);
      });
    });
  }

}

export default FlightController;
