import express, { Request, Response } from 'express';
import FlightModel from './flights.model';
import AirportModel from './../airports/airports.model';
import makeResponse from '../shared/make.response';
import { Query, getDefaultInstance, ValidationError } from 'ottoman';
import { CustomRoute } from '../shared/custom.route';

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
        const { limit, skip, from, to, weekDay } = req.query;
        if (!from || !to) {
          throw new ValidationError('Query params "from" and "to" are required');
        }
        const fromDocument = await AirportModel.findById(String(from), { select: 'faa' });
        const toDocument = await AirportModel.findById(String(to), { select: 'faa' });
        const conn = getDefaultInstance();
        const keyspace = `\`${conn.bucketName}\`.inventory`;
        const where: Record<string, unknown> = {
          'r.sourceairport': fromDocument.faa,
          'r.destinationairport': toDocument.faa,
        };
        if (weekDay !== undefined) {
          where['s.day'] = Number(weekDay);
        }
        const query = new Query({}, `${keyspace}.route as r UNNEST r.schedule as s`)
          .select('a.name, s.flight, s.utc, s.day, r.sourceairport, r.destinationairport, r.equipment')
          .plainJoin(`JOIN ${keyspace}.airline as a ON KEYS r.airlineid`)
          .where(where)
          .limit(Number(limit || 50))
          .offset(Number(skip || 0))
          .orderBy({ 'a.name': 'ASC' });
        const result = await conn.query(query.build());
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
